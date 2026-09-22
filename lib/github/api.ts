import { CONTENT_TYPES } from "@/lib/content-schema"
import {
  FORK_FALLBACK_NAME,
  FORK_NAME,
  UPSTREAM_OWNER,
  UPSTREAM_REPO,
  UPSTREAM_SLUG,
} from "@/lib/github/config"
import type {
  EntryPr,
  ForkInfo,
  GhUser,
  PullRequestResult,
  WireChange,
} from "@/lib/github/types"

/* Thin GitHub REST client plus the four moves a contribution needs:
   identify the contributor, make sure they have a fork, put their bytes in
   it as one commit, and open the pull request upstream.

   The commit is built with the git data API (blobs/trees/commits) rather
   than the contents API, so a whole entry - new files, edits, deletions,
   renames, photos - lands as a single reviewable commit. Its parent is
   UPSTREAM's tip, not the fork's: forks share GitHub's object store, so a
   stale fork still produces a branch based on fresh upstream main and
   nobody has to think about syncing. */

const API = "https://api.github.com"

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** the API call that failed, e.g. "GET /repos/hackclub/jolts" - a bare
        "Not Found" from GitHub is undebuggable without it */
    readonly call?: string,
    /** true when the fix is another trip through GitHub's consent screen
        (missing scope, revoked grant) rather than anything the user typed */
    readonly reconnect = false
  ) {
    super(message)
  }
}

export type Init = Omit<RequestInit, "body"> & { body?: unknown }

export async function gh<T>(
  token: string,
  path: string,
  init: Init = {}
): Promise<T> {
  const { body, ...rest } = init
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "jolts-editor",
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...rest.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const parsed: unknown = text ? safeJson(text) : null
  if (!res.ok) {
    throw new GitHubError(
      githubMessage(parsed, res.status),
      res.status,
      `${rest.method ?? "GET"} ${path}`
    )
  }
  return parsed as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

function githubMessage(parsed: unknown, status: number): string {
  const obj = parsed as { message?: string; errors?: { message?: string }[] } | null
  const first = obj?.errors?.find((e) => e.message)?.message
  return obj?.message ? (first ? `${obj.message}: ${first}` : obj.message) : `GitHub returned ${status}`
}

/** Escape hatch for endpoints that answer with a file's bytes rather than
    JSON. Returns null for 404 - "this path doesn't exist at that ref" is a
    normal answer when a file was added or deleted. */
export async function ghRaw(
  token: string,
  path: string
): Promise<string | null> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      accept: "application/vnd.github.raw",
      "x-github-api-version": "2022-11-28",
      "user-agent": "jolts-editor",
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new GitHubError(`GitHub returned ${res.status}`, res.status, `GET ${path}`)
  }
  return res.text()
}

/* ---------- who ---------- */

export async function getViewer(token: string): Promise<GhUser> {
  const u = await gh<{ login: string; name: string | null; avatar_url: string }>(
    token,
    "/user"
  )
  return { login: u.login, name: u.name, avatarUrl: u.avatar_url }
}

/* ---------- fork ---------- */

type Repo = {
  name: string
  default_branch: string
  fork: boolean
  parent?: { full_name: string }
}

async function repoOrNull(token: string, owner: string, repo: string) {
  try {
    return await gh<Repo>(token, `/repos/${owner}/${repo}`)
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null
    throw err
  }
}

const isOurFork = (r: Repo) =>
  r.fork && r.parent?.full_name.toLowerCase() === `${UPSTREAM_OWNER}/${UPSTREAM_REPO}`

/** Find (or create) the contributor's fork, and resolve upstream's tip. */
export async function ensureFork(
  token: string,
  login: string
): Promise<ForkInfo> {
  /* First call, and the one that fails loudest when the deployment is
     misconfigured. GitHub answers 404 (never 403) for a repo the token can't
     see, so "Not Found" here means one of three things - all worth naming,
     because a bare 404 sends people hunting in the wrong place. */
  const upstream = await gh<Repo>(
    token,
    `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}`
  ).catch((err: unknown): never => {
    if (err instanceof GitHubError && err.status === 404) {
      throw new GitHubError(
        `GitHub can't see ${UPSTREAM_SLUG} with your sign-in. If the repo is ` +
          `private, this sign-in needs the "repo" scope - reconnect to grant ` +
          `it. If it's an organisation repo, an owner may also need to approve ` +
          `this OAuth app. Otherwise you may not have access to ${UPSTREAM_SLUG} yet.`,
        404,
        err.call,
        true
      )
    }
    throw err
  })
  const baseBranch = upstream.default_branch
  const ref = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/git/ref/heads/${baseBranch}`
  )
  const baseSha = ref.object.sha
  const commit = await gh<{ tree: { sha: string } }>(
    token,
    `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/git/commits/${baseSha}`
  )
  const base = { owner: login, baseBranch, baseSha, baseTreeSha: commit.tree.sha }

  // already forked? (the common case on every visit after the first)
  const preferred = await repoOrNull(token, login, FORK_NAME)
  if (preferred && isOurFork(preferred)) {
    return { ...base, repo: preferred.name, created: false }
  }
  const fallback = await repoOrNull(token, login, FORK_FALLBACK_NAME)
  if (fallback && isOurFork(fallback)) {
    return { ...base, repo: fallback.name, created: false }
  }

  /* Nothing usable under either name - ask GitHub to fork.

     Two things make this the reliable move rather than guessing: forking a
     repo you have ALREADY forked returns that existing fork instead of
     creating a second one, and the response names it. So a contributor who
     forked jolts years ago and renamed it to "my-macropad-notes" is found
     here, even though neither name we probed matched. We trust GitHub's
     answer over our guess. */
  const requestedName = preferred
    ? fallback
      ? undefined // both names taken; let GitHub pick or tell us why not
      : FORK_FALLBACK_NAME
    : FORK_NAME

  const forked = await gh<Repo>(
    token,
    `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/forks`,
    {
      method: "POST",
      body: requestedName && requestedName !== FORK_NAME ? { name: requestedName } : {},
    }
  ).catch((err: unknown): never => {
    if (
      err instanceof GitHubError &&
      err.status === 422 &&
      /already exists|name/i.test(err.message)
    ) {
      // Report the ACTUAL state rather than assuming both names are taken -
      // this is also the message that surfaces if GitHub ever stops honouring
      // the `name` parameter, so it carries GitHub's own words too.
      const taken = [
        preferred ? `"${FORK_NAME}"` : null,
        fallback ? `"${FORK_FALLBACK_NAME}"` : null,
      ].filter((n): n is string => n !== null)
      throw new GitHubError(
        `GitHub wouldn't fork ${UPSTREAM_SLUG} into your account: ${err.message}. ` +
          (taken.length
            ? `You already own ${taken.join(" and ")}, and neither is a fork of ` +
              `${UPSTREAM_SLUG} - rename or delete one, or fork ${UPSTREAM_SLUG} ` +
              `yourself, then save again.`
            : `Fork ${UPSTREAM_SLUG} yourself and save again.`),
        409
      )
    }
    throw err
  })

  const forkName = forked.name

  // forking is asynchronous: wait until the repo answers AND has a tip
  for (let i = 0; i < 12; i++) {
    const made = await repoOrNull(token, login, forkName)
    if (made) {
      try {
        await gh(
          token,
          `/repos/${login}/${forkName}/git/ref/heads/${made.default_branch}`
        )
        return { ...base, repo: made.name, created: true }
      } catch {
        /* refs not published yet - keep waiting */
      }
    }
    await sleep(i === 0 ? 700 : 1000)
  }
  throw new GitHubError(
    "GitHub is still setting up your fork. Give it a few seconds and press save again.",
    504
  )
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ---------- blobs ---------- */

/** Upload one binary (a photo) into the fork; returns its blob SHA. */
export async function createBlob(
  token: string,
  owner: string,
  repo: string,
  data: Uint8Array
): Promise<string> {
  const blob = await gh<{ sha: string }>(token, `/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: {
      content: Buffer.from(data).toString("base64"),
      encoding: "base64",
    },
  })
  return blob.sha
}

/* ---------- finding an entry's pull requests ---------- */

/* Every branch this editor creates is named jolts/<slug>-<hex>, which turns
   "does a pull request already exist for this guide?" into one list call and a
   regex - no per-PR file fetching. GitHub therefore stays the source of truth
   about a contributor's open work, instead of a draft in one browser: switch
   laptops and the editor still finds the pull request you opened at school. */

export const branchPrefix = (slug: string) => `jolts/${slug}-`

const branchPattern = (slug: string) =>
  new RegExp(`^jolts/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-[0-9a-f]{6}(-\\d+)?$`)

/** Every pull request this editor has opened for one entry, newest first,
    including already-merged and closed ones - the caller needs all three
    states to know what a draft is actually looking at. */
export async function listEntryPrs(
  token: string,
  login: string,
  slug: string
): Promise<EntryPr[]> {
  const pattern = branchPattern(slug)
  const pulls = await gh<
    (ApiPull & {
      merged_at: string | null
      state: string
      head: ApiPull["head"] & { repo: { full_name: string; owner?: { login: string } } | null }
    })[]
  >(token, `${"/repos"}/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls?state=all&sort=updated&direction=desc&per_page=100`)

  return pulls
    .filter((pr) => pattern.test(pr.head.label.split(":").pop() ?? ""))
    .map((pr) => ({
      number: pr.number,
      url: pr.html_url,
      branch: pr.head.label.split(":").pop() ?? "",
      author: pr.user?.login ?? "ghost",
      mine: (pr.user?.login ?? "").toLowerCase() === login.toLowerCase(),
      state: pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open",
      title: pr.title,
      updatedAt: pr.updated_at,
    }))
}

type ApiPull = {
  number: number
  title: string
  html_url: string
  updated_at: string
  user: { login: string } | null
  head: { label: string; sha: string; ref?: string }
}

/* ---------- adopting an existing pull request on another machine ---------- */

export type PrEntryFiles = {
  number: number
  url: string
  branch: string
  headSha: string
  contentType: string
  slug: string
  /** the entry's .mdx files as this pull request leaves them */
  files: { name: string; raw: string }[]
  /** image filenames already on the branch - the editor lists them as
      existing, so they are never re-uploaded and never dropped */
  images: string[]
}

/** Read an entry exactly as one of the contributor's open pull requests leaves
    it, so a second machine can carry on from there instead of from what is
    published. A fork's head commit is reachable from the base repo, so this
    needs no access to the fork itself. */
export async function readPrEntry(
  token: string,
  login: string,
  number: number
): Promise<PrEntryFiles> {
  const upstream = `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}`
  const pr = await gh<{
    number: number
    html_url: string
    state: string
    merged_at: string | null
    user: { login: string } | null
    head: { label: string; sha: string }
  }>(token, `${upstream}/pulls/${number}`)

  if ((pr.user?.login ?? "").toLowerCase() !== login.toLowerCase()) {
    throw new GitHubError("That pull request isn't yours to continue.", 403)
  }
  if (pr.merged_at || pr.state !== "open") {
    throw new GitHubError(`Pull request #${number} is no longer open.`, 409)
  }

  const branch = pr.head.label.split(":").pop() ?? ""
  const m = branch.match(/^jolts\/(.+)-[0-9a-f]{6}(?:-\d+)?$/)
  if (!m) {
    throw new GitHubError("That pull request wasn't opened by the editor.", 422)
  }
  const slug = m[1]

  /* which content type owns that slug - the branch name doesn't say, so ask
     the tree which folder the entry actually lives in */
  let contentType: string | null = null
  let listing: { name: string; type: string }[] = []
  for (const candidate of CONTENT_TYPES) {
    const dir = await gh<{ name: string; type: string }[]>(
      token,
      `${upstream}/contents/content/${candidate}/${slug}?ref=${pr.head.sha}`
    ).catch(() => null)
    if (dir && Array.isArray(dir)) {
      contentType = candidate
      listing = dir
      break
    }
  }
  if (!contentType) {
    throw new GitHubError("That pull request's entry folder is missing.", 404)
  }

  const mdx = listing
    .filter((f) => f.type === "file" && /^(index|\d+-.+)\.mdx$/.test(f.name))
    .map((f) => f.name)
    .sort((a, b) => (a === "index.mdx" ? -1 : b === "index.mdx" ? 1 : a.localeCompare(b)))

  const files = await Promise.all(
    mdx.map(async (name) => ({
      name,
      raw:
        (await ghRaw(
          token,
          `${upstream}/contents/content/${contentType}/${slug}/${encodeURIComponent(name)}?ref=${pr.head.sha}`
        )) ?? "",
    }))
  )

  return {
    number: pr.number,
    url: pr.html_url,
    branch,
    headSha: pr.head.sha,
    contentType,
    slug,
    files: files.filter((f) => f.raw !== ""),
    images: listing
      .filter((f) => f.type === "file" && /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.name))
      .map((f) => f.name),
  }
}

/* ---------- commit + pull request ---------- */

const FILE_MODE = "100644"

/* The tree is always built on UPSTREAM's tree, never on the branch's own. Both
   the first save and every later one therefore produce a branch whose diff
   against main is exactly the contributor's current editor state - a page they
   deleted after their first save really disappears, and unrelated work that
   merged in the meantime is carried along rather than reverted.

   Returns null when the result is identical to main, which happens when a
   contributor's work has already been merged and their draft is just a copy of
   what is now published. Committing that would open a pull request with an
   empty diff. */
async function commitChanges(
  token: string,
  fork: ForkInfo,
  parents: string[],
  message: string,
  changes: WireChange[]
): Promise<string | null> {
  const forkPath = `/repos/${fork.owner}/${fork.repo}`

  const tree = await gh<{ sha: string }>(token, `${forkPath}/git/trees`, {
    method: "POST",
    body: {
      base_tree: fork.baseTreeSha,
      tree: changes.map((c) =>
        c.kind === "del"
          ? { path: c.path, mode: FILE_MODE, type: "blob", sha: null }
          : c.kind === "put-blob"
            ? { path: c.path, mode: FILE_MODE, type: "blob", sha: c.sha }
            : { path: c.path, mode: FILE_MODE, type: "blob", content: c.text }
      ),
    },
  })
  if (tree.sha === fork.baseTreeSha) return null

  const commit = await gh<{ sha: string }>(token, `${forkPath}/git/commits`, {
    method: "POST",
    body: { message, tree: tree.sha, parents },
  })
  return commit.sha
}

export class NothingToCommitError extends Error {}

export async function openPullRequest(
  token: string,
  opts: {
    fork: ForkInfo
    branch: string
    title: string
    body: string
    changes: WireChange[]
  }
): Promise<PullRequestResult> {
  const { fork, branch } = opts
  const forkPath = `/repos/${fork.owner}/${fork.repo}`

  const commitSha = await commitChanges(
    token,
    fork,
    [fork.baseSha],
    opts.body ? `${opts.title}\n\n${opts.body}` : opts.title,
    opts.changes
  )
  if (!commitSha) throw new NothingToCommitError()

  const ref = await createBranch(token, forkPath, branch, commitSha)

  const pr = await gh<{ html_url: string; number: number }>(
    token,
    `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls`,
    {
      method: "POST",
      body: {
        title: opts.title,
        body: opts.body,
        head: `${fork.owner}:${ref}`,
        // A fork named like upstream resolves from "owner:branch" alone -
        // the decade-old documented form. Only a fork under our fallback
        // name needs head_repo to point GitHub at the right repository.
        ...(fork.repo === UPSTREAM_REPO
          ? {}
          : { head_repo: `${fork.owner}/${fork.repo}` }),
        base: fork.baseBranch,
        maintainer_can_modify: true,
      },
    }
  )
  return {
    url: pr.html_url,
    number: pr.number,
    branch: ref,
    fork: `${fork.owner}/${fork.repo}`,
  }
}

/** Push another commit onto an existing pull request's branch, so a second save
    revises the review in place instead of opening a rival to it. */
export async function updatePullRequest(
  token: string,
  opts: {
    fork: ForkInfo
    number: number
    title: string
    body: string
    changes: WireChange[]
    /* Which tree the change set was computed against, and therefore which one
       it must be applied to. An editor that loaded from published main means
       "unchanged" = "same as main", so omitted files have to come from main.
       An editor that adopted this branch means "unchanged" = "same as the
       branch", so they have to come from the branch's own tip - otherwise the
       branch's photos and pages, which this editor never had to load, would be
       dropped for being unmentioned. */
    basedOn: "main" | "branch"
  }
): Promise<PullRequestResult> {
  const upstream = `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}`
  const pr = await gh<{
    number: number
    html_url: string
    state: string
    merged_at: string | null
    head: { ref: string; sha: string; repo: { full_name: string } | null }
  }>(token, `${upstream}/pulls/${opts.number}`)

  if (pr.merged_at) {
    throw new GitHubError(
      `Pull request #${pr.number} has already been merged, so it can't take more commits.`,
      409
    )
  }
  if (pr.state !== "open") {
    throw new GitHubError(
      `Pull request #${pr.number} is closed, so it can't take more commits.`,
      409
    )
  }
  // it has to be the caller's own branch in the caller's own fork
  if (
    pr.head.repo?.full_name.toLowerCase() !==
    `${fork_full(opts.fork)}`.toLowerCase()
  ) {
    throw new GitHubError(
      `Pull request #${pr.number} isn't on your fork, so you can't add to it.`,
      403
    )
  }

  const headCommit = await gh<{ tree: { sha: string } }>(
    token,
    `/repos/${opts.fork.owner}/${opts.fork.repo}/git/commits/${pr.head.sha}`
  )
  const base: ForkInfo =
    opts.basedOn === "branch"
      ? { ...opts.fork, baseTreeSha: headCommit.tree.sha }
      : opts.fork

  const commitSha = await commitChanges(
    token,
    base,
    [pr.head.sha],
    opts.body ? `${opts.title}\n\n${opts.body}` : opts.title,
    opts.changes
  )
  if (!commitSha) throw new NothingToCommitError()

  await gh(token, `/repos/${opts.fork.owner}/${opts.fork.repo}/git/refs/heads/${pr.head.ref}`, {
    method: "PATCH",
    body: { sha: commitSha },
  })

  // keep the pull request's title in step with what they just typed
  await gh(token, `${upstream}/pulls/${pr.number}`, {
    method: "PATCH",
    body: { title: opts.title },
  }).catch(() => {
    /* the commit is what matters; a stale title is not worth failing over */
  })

  return {
    url: pr.html_url,
    number: pr.number,
    branch: pr.head.ref,
    fork: fork_full(opts.fork),
  }
}

const fork_full = (fork: ForkInfo) => `${fork.owner}/${fork.repo}`

/** Create refs/heads/<name>, stepping the name aside if it already exists. */
async function createBranch(
  token: string,
  forkPath: string,
  name: string,
  sha: string
): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? name : `${name}-${i + 1}`
    try {
      await gh(token, `${forkPath}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${candidate}`, sha },
      })
      return candidate
    } catch (err) {
      const taken =
        err instanceof GitHubError &&
        err.status === 422 &&
        /already exists/i.test(err.message)
      if (!taken) throw err
    }
  }
  throw new GitHubError("Couldn't find a free branch name in your fork.", 422)
}
