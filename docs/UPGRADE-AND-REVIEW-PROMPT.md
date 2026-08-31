# Agent Prompt — Hyades: Security Patch Alignment, Runtime Failure Triage & Docs Audit

> **How to use:** paste this entire document as the opening message to a coding agent working in the
> Hyades repository root. Everything below is the prompt.

---

## 1. Role and mission

You are a senior Next.js / TypeScript engineer performing a **security-and-correctness review pass**
on the Hyades codebase (Next.js 16 App Router + React 19 + Mongoose/MongoDB Atlas + Clerk + Stripe +
Cloudinary, deployed on Vercel, developed on Windows 11).

You have three workstreams, in priority order:

- **A — Dependency alignment with the Next.js August 2026 Security Release** (highest priority; a
  vulnerable version is currently committed to the repo).
- **B — Triage of a runtime failure** (`querySrv ECONNREFUSED` against MongoDB Atlas) and the code
  defect it exposed.
- **C — README accuracy audit.**

Deliver a written report *and* the code changes for the items marked **FIX**. Items marked
**REPORT ONLY** must not be changed in this pass.

---

## 2. Ground rules (non-negotiable)

1. **Do not bundle major-version migrations into this pass.** The security release requires *only* a
   Next.js version floor change. Clerk 6→7, Stripe 18→22, Tailwind 3→4, TypeScript 5→7, ESLint 9→10,
   lucide-react 0.x→1.x, svix 1→2, tailwind-merge 2→3 are **out of scope**: inventory them, assess
   risk, propose a sequenced plan — but change none of them.
2. **Never print, echo, commit, or paste the contents of `.env.local`.** Refer to variables by name
   only. `.env.local` is currently untracked and must stay that way.
3. **Do not modify the developer's machine configuration** (DNS settings, hosts file, network
   adapters, services). Where the fix is machine-level, write instructions for the user to run
   themselves and stop.
4. **Verify before asserting.** Every claim in Section 3 below was checked once, on one machine, at
   one point in time. Re-run the stated verification command before you build on it. If your result
   contradicts what is written here, report the contradiction — do not silently adopt either version.
5. **Separate commits per concern.** At minimum: (a) the security version floor + lockfile,
   (b) error-handling/resilience code changes, (c) lint toolchain, (d) README. Do not squash.
6. Work on the `devel` branch. Do not push, open PRs, or deploy without being asked.
7. Run `npm run build` before declaring any workstream complete, and paste the real output. A passing
   build is the gate; "should work" is not.

---

## 3. Established context — re-verify, then build on it

These findings come from a prior investigation session. Treat them as **leads with evidence**, not as
settled truth.

### Environment snapshot

| Item | Value |
| --- | --- |
| Node / npm | v24.16.0 / 12.0.2 |
| Installed `next` (working tree) | **16.3.3** |
| `next` in `package.json` | **`^16.1.6`** |
| `next` in **committed** `package-lock.json` (HEAD) | **16.2.11** ← vulnerable |
| `next` in **working-tree** `package-lock.json` (uncommitted, `M`) | 16.3.3 |
| `sharp` (transitive, via `next`) | 0.35.4 |
| react / react-dom | 19.2.8 |
| Router | App Router **only** — no `pages/` or `src/pages/` directory exists |
| Middleware file | `proxy.ts` at repo root (Next 16 naming), Clerk `clerkMiddleware` |
| Error boundaries under `app/` | **none** — no `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` |
| `npm audit` | 0 vulnerabilities (it does **not** flag the lockfile issue above — see A.1) |
| Deploy target | Vercel (see `build-check.sh`, gates on `VERCEL_GIT_COMMIT_REF == master`) |

### Verification commands

```bash
node -v && npm -v
node -e "console.log(require('./node_modules/next/package.json').version)"
git show HEAD:package-lock.json | grep -A2 'node_modules/next'
git show HEAD:package.json | grep next
npm ls sharp
ls -d pages src/pages 2>&1
find app -name "error.tsx" -o -name "global-error.tsx" -o -name "not-found.tsx"
npm audit && npm outdated
```

---

## 4. Workstream A — Next.js August 2026 Security Release

**Reference:** <https://nextjs.org/blog/august-2026-security-release> (published 2026-08-25).
Fetch and read it yourself; do not rely on the summary below alone.

Patched releases: **v16.3.3** (Active LTS) and **v15.5.24** (Maintenance LTS).

Two critical-severity issues:

1. **Unauthenticated RCE in the Image Optimization API via AVIF** —
   `GHSA-2xp9-vwfh-vxw4` / upstream `GHSA-g89c-p67h-r497` (libheif, reached through `sharp`).
   Triggered when Next.js optimizes an attacker-controlled AVIF image. The patched releases
   **disable AVIF optimization** pending the upstream fix.
2. **Unauthenticated RCE on Windows-hosted servers** — `CVE-2026-75604` / `GHSA-p293-qw3h-jr36`.
   Affects apps using **both** the Pages Router **and** the App Router **without Cache Components**,
   when the Next.js server runs on a Windows filesystem. Linux and macOS unaffected.
   **No workaround** for affected Windows-hosted apps.

### A.1 — The actual exposure (FIX)

The running dev server is already on the patched 16.3.3, which makes this look resolved. It is not.
The **committed** lockfile at HEAD pins `next@16.2.11`. Any `npm ci` — Vercel builds, CI, a fresh
clone — installs a **vulnerable** Next.js. The uncommitted working-tree lockfile is the only thing
holding 16.3.3, and it has not been committed.

Do all of the following:

- Raise the declared floor in `package.json` from `"next": "^16.1.6"` to **`"next": "^16.3.3"`** so a
  vulnerable version can never be resolved, and do the same for `eslint-config-next`.
- Reinstall so `package-lock.json` is coherent with the new range, and **commit the lockfile**.
  Explain in the commit message that the committed lock previously pinned a vulnerable 16.2.11.
- Confirm the fix the way CI would: a clean `npm ci` in a scratch checkout, then assert the resolved
  version is ≥ 16.3.3.
- Check whether the Vercel build uses `npm ci` (lockfile) or `npm install`, and state which, because
  it determines whether production was actually exposed.
- Note that `npm audit` reports **0 vulnerabilities** here. Explain in your report why it did not
  catch this, so the team does not treat a clean audit as sufficient in future.

### A.2 — CVE-2026-75604, Windows RCE: assess and close out (REPORT ONLY)

The dev machine is genuinely Windows 11, so this deserves an explicit verdict rather than a shrug.
The discriminating condition is the **Pages Router**: this app has no `pages/` or `src/pages/`
directory, so the "both routers" precondition is not met and the app is **not affected**.

In your report, state that verdict *and* the single fact it rests on, so nobody re-panics later.
Also confirm the production runtime is Linux (Vercel), not a Windows-hosted server. Add a note that
introducing a Pages Router directory would change this verdict.

### A.3 — AVIF / libheif / sharp: verify, do not assume (REPORT ONLY unless a gap is found)

- `next.config.mjs` sets **no `images.formats`**, so no AVIF is explicitly requested; and 16.3.3
  disables AVIF optimization itself. Confirm both by reading the config and the release notes.
- `sharp@0.35.4` arrives transitively through `next`. Look up the libheif advisory
  (`GHSA-g89c-p67h-r497`) and check 0.35.4's bundled libvips/libheif against the fixed version.
  Report the finding — do **not** assert "clear" without checking.
- Grep for any direct `sharp` usage in application code. Report what you find.
- Image surface for context: `next/image` is used in `app/(root)/credits/page.tsx`,
  `app/(root)/transformations/[id]/page.tsx`, and
  `components/shared/{InsufficientCreditsModal,Search,TransformedImage}.tsx`; `next-cloudinary`'s
  `CldImage` / `getCldImageUrl` is used in
  `components/shared/{Collection,MediaUploader,TransformedImage,TransformationForm}.tsx`.
- Hardening suggestion to evaluate: `next.config.mjs` allows `remotePatterns` host
  `res.cloudinary.com` with no `pathname` constraint, so any Cloudinary account's assets pass through
  the optimizer. Propose scoping `pathname` to this project's cloud name. Recommend it; do not apply
  it unless you can show it does not break `CldImage` URLs.

### A.4 — Wider dependency inventory (REPORT ONLY — change nothing)

`npm outdated` currently reports these majors behind. For **each**, produce: current → latest, whether
it carries a known advisory, breaking-change highlights, blast radius in this codebase, and a
recommended sequencing (which to do first, which to pair, which to defer).

```
@clerk/nextjs      6.39.6 → 7.8.3     @stripe/stripe-js  7.9.0  → 9.14.0
@types/node       24.13.3 → 26.4.0    eslint             9.39.5 → 10.9.1
lucide-react      0.556.0 → 1.38.0    stripe             18.5.0 → 22.6.0
svix               1.99.1 → 2.1.0     tailwind-merge     2.6.1  → 3.6.0
tailwindcss       3.4.19  → 4.3.3     typescript         5.9.3  → 7.0.2
```

Call out explicitly that Clerk 7 touches `proxy.ts` and every auth surface, and that Tailwind 4
replaces `tailwind.config.ts` with CSS-first config — both are their own projects, not part of this
pass.

---

## 5. Workstream B — `querySrv ECONNREFUSED` on the MongoDB Atlas SRV record

### Observed failure

```
▲ Next.js 16.3.3 (Turbopack)  ✓ Ready in 545ms
○ Compiling / ...
querySrv ECONNREFUSED _mongodb._tcp.hyades.hu6wt.mongodb.net
⨯ Error: Error: querySrv ECONNREFUSED _mongodb._tcp.hyades.hu6wt.mongodb.net
    at handleError (lib\utils.ts:18:11)
    at getAllImages (lib\actions\image.actions.ts:148:16)
    at async Home (app\(root)\page.tsx:14:18)
 GET / 500 in 8.6s
```

### B.1 — Root cause (already isolated; re-verify, then instruct the user)

This is **not** an application bug, not an Atlas IP-allowlist problem, and not a malformed connection
string. The machine's DNS resolver is unreachable:

```
dns.getServers()                       ->  [ '127.0.0.1' ]
resolveSrv(...) via system resolver    ->  ERR ECONNREFUSED
resolveSrv(...) via 8.8.8.8            ->  resolves all three shards:
      hyades-shard-00-00 / -01 / -02 .hu6wt.mongodb.net:27017
```

Reproduce with:

```bash
node -e "const dns=require('dns'); console.log('servers:', dns.getServers()); dns.resolveSrv('_mongodb._tcp.hyades.hu6wt.mongodb.net', (e,r)=>console.log('system:', e ? e.code : r.length+' records')); const R=new dns.Resolver(); R.setServers(['8.8.8.8']); R.resolveSrv('_mongodb._tcp.hyades.hu6wt.mongodb.net', (e,r)=>console.log('8.8.8.8:', e ? e.code : r.length+' records'));"
```

The system is configured to use a **local DNS proxy on 127.0.0.1 that is not listening** — typically a
stopped Pi-hole / AdGuard Home / dnscrypt-proxy / Docker DNS / VPN stub resolver. Every DNS lookup on
the machine fails; `mongodb+srv://` just happens to be the first thing that notices.

**Your job here is diagnosis and instructions, not repair.** Write the user a short checklist to run
themselves: identify what should be bound to `127.0.0.1:53` and whether it is running, restart it or
point the adapter at a working resolver, then re-run the reproduction command above. Do **not** change
adapter settings, the hosts file, or services yourself. Do **not** "fix" this by rewriting
`lib/database/mongoose.ts` to a non-SRV `mongodb://` seed list — record that only as a documented
emergency fallback.

### B.2 — The real code defect this exposed (FIX)

An unreachable database turns the entire home page into a hard 500 with a raw internal error string
reaching the browser. That part *is* a code problem, and it is what this workstream should actually
change. Review and fix:

- **`lib/utils.ts:14-28` — `handleError`.** It logs, then re-throws a new `Error` that string-wraps
  the original message. This destroys the stack/cause chain, leaks internal detail (hostnames, driver
  internals) to the client, and makes the helper's name a lie — it does not handle anything. Consider
  preserving `cause`, using a typed error, and separating "log" from "throw".
- **`lib/actions/image.actions.ts` — every `catch (error) { handleError(error) }`.** The `catch` has
  no `return`, so TypeScript infers `Promise<... | undefined>` while callers are written as though a
  value always arrives. Audit **all** action files: `image.actions.ts`, `transaction.action.ts`,
  `user.actions.ts`. Decide one consistent contract (throw-and-boundary, or a discriminated
  `{ ok: true, data } | { ok: false, error }` result) and apply it uniformly.
- **`app/(root)/page.tsx:14`** — `images?.data` / `images?.totalPage` optional-chain around that
  `undefined`, silently rendering an empty gallery indistinguishable from a real empty state.
- **No error boundaries exist anywhere under `app/`.** Add at minimum `app/error.tsx` and
  `app/global-error.tsx`, and consider `app/(root)/error.tsx` plus `loading.tsx` for the streaming
  case. The user should see a retryable "can't reach the library right now" state, not a stack trace.
- **`lib/database/mongoose.ts`** — review the cached-connection singleton: `cached.promise` is never
  reset when the connection rejects, so after one DNS failure the poisoned promise can be handed back
  for the life of the process and every later request keeps failing even once DNS recovers. Also
  review the `global as any` typing and whether `serverSelectionTimeoutMS` should be bounded (the
  failing request took 8.6s).

Ship a test or a documented manual reproduction (e.g. point `MONGODB_URL` at an unresolvable host)
showing the page now degrades instead of 500-ing.

---

## 6. Workstream C — README audit (FIX)

`README.md` is broadly accurate but has drifted. Verify each item, then correct it.

Known defects:

1. **TypeScript badge says 5.7**; installed is **5.9.3**. Prefer a version-range statement over a
   number that rots, or automate the badge.
2. **"Node.js 18.x or higher"** under Prerequisites is below what Next.js 16 supports. Look up the
   actual minimum for 16.3.x and state it — do not guess a number.
3. **Installation step 3 says "Copy `.env.example` to `.env.local`"**, but **no `.env.example` exists
   in the repo**. Either create a real `.env.example` containing every key present in the README's env
   block (names and placeholder values only, never real secrets) or rewrite the step. Creating the
   file is the better fix; if you do, confirm `.gitignore` allows `.env.example` while continuing to
   ignore `.env.local`.
4. **The project-structure tree omits `proxy.ts` and `build-check.sh`.** Add them, plus a line
   explaining that `proxy.ts` is the Next 16 middleware entry point hosting Clerk's `clerkMiddleware`
   and its public-route matcher — a reader currently has no way to find where auth is enforced.
5. **`npm run lint` is documented as working** in the Available Scripts table — see Section 7; fix the
   docs and the script together.
6. Regenerate the tree against the real filesystem: confirm every listed file exists and that nothing
   present is missing (`components/ui/*`, `constants/`, `hooks/`, `types/`).
7. Sanity-check the rest against the code rather than assuming: credit-plan prices/credits in the
   table vs. `constants/index.ts`; the feature list vs. the actual `transformationTypes`; the
   "Backend & Database" row claiming "Next.js API Routes — Serverless API endpoints" when the data
   layer is Server Actions in `lib/actions/` and the only routes are the two webhooks; and the
   webhook paths under Setup vs. `app/api/webhooks/{clerk,stripe}/route.ts`.
8. Add a short **Troubleshooting** section, with the `querySrv ECONNREFUSED` diagnosis from B.1 as its
   first entry, including the reproduction one-liner.

---

## 7. Cross-cutting — the lint toolchain (FIX; verify first)

`npx next lint --help` printed the *generic* Next CLI help rather than lint-specific help, which
suggests `lint` is no longer a recognized subcommand in Next 16. Meanwhile the repo still has
`"lint": "next lint"` in `package.json`, a **legacy `.eslintrc.json`**
(`{"extends": "next/core-web-vitals"}`) rather than an ESLint 9 flat config, and a README advertising
the script.

Confirm the actual behaviour (`npm run lint`, then report the exit code) and capture the output. If
the command is dead:

- migrate to ESLint flat config (`eslint.config.mjs`) using `eslint-config-next`'s flat export,
- repoint the `lint` script at `eslint` directly,
- remove `.eslintrc.json` only once the replacement passes,
- update the README's Available Scripts table,
- and report what the linter finds once it runs again — including whether the two file-wide
  `/* eslint-disable */` directives at the top of `lib/utils.ts` (`prefer-const`,
  `no-prototype-builtins`) are still needed or can be narrowed to specific lines.

Keep this ESLint 9 flat-config migration in scope; the ESLint 9→10 major upgrade stays out of scope
per Section 2.

---

## 8. Deliverables

1. **`docs/SECURITY-REVIEW-2026-08.md`** — the written report, structured as:
   - Executive summary (≤ 10 lines): what was actually exposed, what was fixed, what remains.
   - Workstream A: CVE-by-CVE applicability verdict with the evidence for each, the lockfile finding,
     the clean-`npm ci` proof, and the deferred-upgrade inventory with sequencing.
   - Workstream B: root cause with evidence, the user-run remediation checklist, and the code
     resilience changes made.
   - Workstream C: README diff summary.
   - Section 7: lint toolchain outcome.
   - **Residual risk / not done**: everything deliberately left, and why.
2. **Code changes** for every **FIX** item, in the separate commits described in Section 2.5.
3. **`README.md`** updated, plus `.env.example` if you create it.
4. Any finding that contradicts Section 3 flagged prominently rather than quietly absorbed.

## 9. Definition of done

- [ ] `package.json` declares `next` at a floor of `^16.3.3`, and the aligned `package-lock.json` is committed.
- [ ] A clean `npm ci` in a scratch checkout resolves `next` ≥ 16.3.3 — output pasted in the report.
- [ ] Both CVEs have an explicit applicability verdict, each naming the fact it rests on.
- [ ] `npm run build` passes; output pasted.
- [ ] `npm run lint` either passes or is documented as intentionally replaced; output pasted.
- [ ] With DNS deliberately broken, `/` renders a graceful error state instead of a 500 carrying a raw
      internal message — demonstrated, not asserted.
- [ ] Every README claim in Section 6 has been checked against the filesystem or the code.
- [ ] No secret values appear in any file, commit, or report.
- [ ] No out-of-scope dependency was upgraded.
