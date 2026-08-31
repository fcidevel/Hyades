# Hyades — Security Patch Alignment, Runtime Failure Triage & Docs Audit

**Date:** 2026-08-31 · **Branch:** `devel` · **Reviewer:** automated pass, all claims re-verified on this machine

---

## Executive summary

- The committed `package-lock.json` at HEAD pinned `next@16.2.11` — vulnerable to both critical RCEs in the Next.js August 2026 release. The patched 16.3.3 existed only in an uncommitted working tree.
- **Production was exposed**, and not conditionally: `master`'s lockfile pinned the same 16.2.11, and `npm install` against the old range kept 16.2.11 too — so the `npm ci` vs `npm install` question does not change the verdict.
- The committed lockfile *also* pinned `sharp@0.34.5`, itself carrying a high-severity advisory. This is worse than the prior session recorded — see [Contradictions](#contradictions-with-the-established-context).
- **Fixed:** floor raised to `next@^16.3.3` (+ `eslint-config-next`), lockfile realigned and committed; a clean `npm ci` in a scratch checkout now resolves 16.3.3. Committing the realigned lockfile also moved 19 other direct deps *within their existing ranges* — every one disclosed below, no major changed.
- **CVE-2026-75604 (Windows RCE): not affected** — no Pages Router. **AVIF RCE: not affected** — `sharp@0.35.4` bundles libheif **1.23.2**, the patched version.
- The DNS failure was confirmed machine-level (`dns.getServers() -> [127.0.0.1]`, refused); remediation is a checklist for the user to run, not a change made here.
- **Fixed:** the app no longer collapses when the database is unreachable — `/` now returns HTTP 200 in ~0.05s with a retryable error state, versus `500 in 8.6s` with a raw internal string.
- **Fixed:** `npm run lint` was dead (`next lint` removed in Next 16); migrated to ESLint 9 flat config. One pre-existing lint error remains, deliberately unfixed.
- **Not done:** all ten deferred major upgrades, and the `remotePatterns` hardening (recommended, not applied). `master` still pins the vulnerable version until this branch is merged.

---

## Contradictions with the established context

Flagged prominently per deliverable 4, rather than quietly absorbed.

### 1. `sharp` in the committed tree was 0.34.5, not 0.35.4 — and it was flagged

Section 3 recorded `sharp` (transitive, via `next`) as **0.35.4**. That is true of the *working tree*. The **committed** lockfile at `a0ccc0c` pinned:

```
$ git show a0ccc0c:package-lock.json | grep -A2 '"node_modules/sharp"'
    "node_modules/sharp": {
      "version": "0.34.5",
```

`sharp@0.34.5` falls inside `sharp <0.35.0`, which npm audit reports as **high severity** (GHSA-f88m-g3jw-g9cj — inherited libvips CVE-2026-33327/33328/35590/35591). So the committed state carried an independently-flagged vulnerable `sharp` on top of the vulnerable `next`. The version-floor fix resolves it to 0.35.4 as a side effect.

### 2. The clean `npm audit` was an artifact of auditing the wrong tree

Section 3 recorded `npm audit` = 0 vulnerabilities and inferred that audit "does not flag the lockfile issue". Both halves need correcting.

`npm audit` audits the **installed** dependency tree, which on this machine was the patched 16.3.3 — it was describing the developer's `node_modules`, not what CI would install. Reconstructing the pre-fix committed tree and auditing *that*:

```
$ npm audit          # against the committed HEAD dependency tree
6 high severity vulnerabilities
  brace-expansion, js-yaml, nanoid, postcss, sharp, next
```

So the committed state was **not** clean — nobody had audited it.

**But** the second half matters too: even against the pre-fix tree, audit's `next` entry is purely transitive —

```json
{ "name": "next", "severity": "high", "isDirect": true,
  "via": ["postcss", "sharp"], "range": "9.3.4-canary.0 - 16.3.0-preview.10" }
```

`via` lists only `postcss` and `sharp`. npm audit **never names GHSA-2xp9-vwfh-vxw4 or CVE-2026-75604**. It would have raised an alarm, but not the right one, and not for the right reason.

**Takeaway for the team:** a clean `npm audit` proves nothing about the committed lockfile. Audit what CI installs (`npm ci` in a clean checkout, then audit), and treat framework security advisories as a separate feed from `npm audit`.

### 3. "Leaks internal detail to the client" is true in development, not in production

Section B.2 says `handleError` "leaks internal detail (hostnames, driver internals) to the client". Verified: true in dev, which is where the reported trace came from. In a **production build**, Next.js already redacts server error messages. With DNS broken, the browser console showed only:

```
Error: Minified React error #441; visit https://react.dev/errors/441 ...
```

No hostname, no driver internals, in the HTML or the console — *before* considering my changes. The genuine production defects were the hard 500, the absent error boundary, and the destroyed `cause` chain in the server log — not message leakage. The fix is still correct and still worth making; the rationale is just narrower than stated.

---

## Workstream A — Next.js August 2026 Security Release

Source read directly: <https://nextjs.org/blog/august-2026-security-release> (published 2026-08-25). Patched releases **v16.3.3** (Active LTS) and **v15.5.24** (Maintenance LTS).

### A.1 — The actual exposure (FIXED)

**Finding.** At `a0ccc0c` (pre-fix HEAD):

| Where | `next` version |
| --- | --- |
| `package.json` declared range | `^16.1.6` |
| **committed** `package-lock.json` | **16.2.11** ← vulnerable |
| `master` branch lockfile | **16.2.11** ← vulnerable |
| working tree lockfile (uncommitted) | 16.3.3 |
| installed `node_modules` | 16.3.3 |

**Was production exposed?** Yes — and the answer does not depend on Vercel's install command, which is what makes it worth stating carefully.

There is no `vercel.json` in the repo, so the install command is a Vercel dashboard project setting I cannot read from here. It turns out not to matter. `npm install` resolves nothing new when the lockfile already satisfies the declared range, which I verified against a reconstruction of the pre-fix tree:

```
$ grep '"next":' package.json          # pre-fix declared range
    "next": "^16.1.6",
$ grep -A1 '"node_modules/next"' package-lock.json
    "node_modules/next": { "version": "16.2.11",
$ npm install --package-lock-only --ignore-scripts
$ grep -A1 '"node_modules/next"' package-lock.json    # after npm install
    "node_modules/next": { "version": "16.2.11",
```

`npm ci` installs the lockfile verbatim; `npm install` kept it too. Both paths yield **16.2.11**. Combined with `build-check.sh` gating deploys on `master`, and `master`'s lockfile pinning 16.2.11, any Vercel production build from `master` installed a vulnerable Next.js.

**Fix applied** (commit `aacc4a0`): floor raised to `"next": "^16.3.3"` and `"eslint-config-next": "^16.3.3"` (verified `16.3.3` is the published `latest` for both), reinstalled, lockfile committed.

**Proof, the way CI would do it** — cloned *after* the commit, so the clone reflects the committed state:

```
$ git clone --branch devel <repo> ci-proof && cd ci-proof
$ git log --oneline -1
aacc4a0 security: raise next floor to ^16.3.3 and commit aligned lockfile
$ npm ci --ignore-scripts
added 486 packages, and audited 487 packages in 45s
found 0 vulnerabilities
$ node -e "console.log(require('./node_modules/next/package.json').version)"
resolved next = 16.3.3
PASS: next >= 16.3.3
```

`eslint-config-next` resolved to 16.3.3 in the same clean install.

#### What else the lockfile realignment moved — disclosed, not hidden

Commit `aacc4a0` committed the *whole* realigned lockfile, not a surgical two-package bump. The working-tree lockfile it was built on had been regenerated by the developer at some earlier point, so more than `next` moved. Diffing every top-level package between `a0ccc0c` and HEAD:

```
DIRECT  @hookform/resolvers          5.4.0   -> 5.9.1
DIRECT  @radix-ui/react-alert-dialog 1.1.20  -> 1.1.23
DIRECT  @radix-ui/react-dialog       1.1.20  -> 1.1.23
DIRECT  @radix-ui/react-label        2.1.12  -> 2.1.15
DIRECT  @radix-ui/react-select       2.3.4   -> 2.3.7
DIRECT  @radix-ui/react-slot         1.3.0   -> 1.3.3
DIRECT  @radix-ui/react-toast        1.2.20  -> 1.2.23
DIRECT  @types/react                 19.2.17 -> 19.2.18
DIRECT  @types/react-dom             19.2.3  -> 19.2.5
DIRECT  baseline-browser-mapping     2.11.0  -> 2.11.20
DIRECT  cloudinary                   2.10.0  -> 2.11.0
DIRECT  eslint-config-next           16.2.11 -> 16.3.3   <- intended
DIRECT  mongodb                      7.5.0   -> 7.6.0
DIRECT  mongoose                     9.8.0   -> 9.9.4
DIRECT  next                         16.2.11 -> 16.3.3   <- intended
DIRECT  next-cloudinary              6.17.5  -> 6.18.8
DIRECT  postcss                      8.5.21  -> 8.5.26
DIRECT  qs                           6.15.3  -> 6.16.0
DIRECT  react-hook-form              7.82.0  -> 7.87.0
DIRECT  svix                         1.98.0  -> 1.99.1
DIRECT  zod                          4.4.3   -> 4.5.4

--- totals: 21 direct changed, 102 transitive changed ---
```

**Every one of these is a minor or patch bump within the range already declared in `package.json`. No major version changed**, so §2.1 ("do not bundle major-version migrations into this pass") holds — this is the evidence for the "no out-of-scope dependency was upgraded" line, which would otherwise be an unbacked assertion.

Three things worth knowing rather than discovering later:

- **`@clerk/nextjs` did not move** (6.39.6 before and after), so the §A.4 deferred-upgrade baseline is unchanged for the riskiest package.
- **`postcss` 8.5.21 → 8.5.26 and `sharp` 0.34.5 → 0.35.4 silently resolved four of the six advisories** the pre-fix committed tree carried. That is a real security gain, but it arrived as a side effect of realignment rather than as a deliberate act.
- The 19 unintended movers were **inherited**, not introduced: `npm install` reported "up to date", meaning the working-tree lockfile already contained them. The choice made here was to commit that state (as §A.1 instructs) rather than to reconstruct a minimal lockfile. If you would rather land the security fix in isolation, revert `aacc4a0` and redo it with `npm install next@^16.3.3 eslint-config-next@^16.3.3` against the committed lockfile — but note that would also give back the `sharp` and `postcss` advisory fixes.

### A.2 — CVE-2026-75604, Windows RCE: **NOT AFFECTED** (report only)

**Verdict:** not affected.

**The single fact it rests on:** the vulnerability requires an app using **both** the Pages Router **and** the App Router. This app has no Pages Router.

```
$ ls -d pages src/pages
ls: cannot access 'pages': No such file or directory
ls: cannot access 'src/pages': No such file or directory
```

The advisory's precondition ("applications using both the Pages Router and App Router without Cache Components ... when the Next.js server uses a Windows filesystem") is therefore unmet at the first clause, regardless of the operating system.

**Production runtime:** Vercel, which serves on Linux. The advisory states plainly that "Linux and macOS are not affected by this issue." The Windows 11 development machine runs `next dev` / `next start` locally, which is the only Windows-hosted surface — and it too fails the Pages Router precondition.

⚠️ **This verdict is conditional on a fact that a future commit could silently change.** Adding a `pages/` or `src/pages/` directory would satisfy the "both routers" clause and make the Windows dev server vulnerable. If that ever happens, re-open this assessment. Note the release provides **no workaround** for affected Windows-hosted apps — the only remedy is being on ≥16.3.3, which this branch now guarantees.

### A.3 — AVIF / libheif / sharp: **NOT AFFECTED** (report only; no gap found)

Four checks, all performed rather than assumed:

**1. Is AVIF requested in config?** No. `next.config.mjs` sets no `images.formats` key at all — only `remotePatterns`. No AVIF is explicitly requested.

**2. Does 16.3.3 disable AVIF itself?** Yes. Quoting the release: *"The patched releases disable AVIF optimization until an upstream fix is propagated."*

**3. Is the bundled libheif actually patched?** **Yes — this is the decisive check, and it comes back clean.**

The upstream advisory GHSA-g89c-p67h-r497 (CVSS 9.8, heap buffer overflow in `scale_nearest_neighbor()` via duplicate Alpha planes) states: **affected `<= v1.23.1`, patched `v1.23.2`**.

```
$ node -e "console.log(require('sharp').versions)"
  heif: '1.23.2',
  vips: '8.18.6',
  sharp: '0.35.4'
```

`sharp@0.35.4` bundles libheif **1.23.2** — the patched release, not a vulnerable one. So the exposure is closed twice over: Next disables AVIF, and the underlying library is fixed anyway.

*Caveat, stated because it is a real limitation:* `sharp.versions` was read from the locally installed `@img/sharp-win32-x64` binary. Production uses `@img/sharp-libvips-linux-x64`, which `sharp@0.35.4` pins to the same libvips release (`1.3.3`) as every other platform, so the same libheif build applies. Confirm on a Linux runner if you want this without the inference step.

**4. Direct `sharp` usage in application code?** None.

```
$ grep -rn "sharp" --include=*.ts --include=*.tsx --include=*.mjs . --exclude-dir=node_modules
(no matches)
```

`sharp` is reached only through Next's Image Optimization API. The image surface is `next/image` (credits page, transformation detail page, `InsufficientCreditsModal`, `Search`, `TransformedImage`) and `next-cloudinary`'s `CldImage` / `getCldImageUrl` (`Collection`, `MediaUploader`, `TransformedImage`, `TransformationForm`).

#### Hardening recommendation (recommended, deliberately NOT applied)

`next.config.mjs` allows the optimizer to fetch from `res.cloudinary.com` with no `pathname` constraint:

```js
remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", port: "" }]
```

Any Cloudinary account's assets — not just this project's — can be pushed through the image optimizer. Scoping it:

```js
remotePatterns: [{
  protocol: "https",
  hostname: "res.cloudinary.com",
  port: "",
  pathname: "/<your-cloud-name>/**",   // NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
}]
```

**Not applied**, per the instruction to recommend rather than apply unless it can be shown not to break `CldImage` URLs. Demonstrating that requires rendering authenticated pages against a live Cloudinary account, which this pass could not do with DNS down. Validate it on a preview deploy before merging.

### A.4 — Deferred upgrade inventory (report only — nothing changed)

**Advisory status, verified:** `npm audit` against the current post-fix tree reports **0 vulnerabilities**. None of the ten outdated majors below carries a known advisory at its currently installed version. They are maintenance debt, not live exposure.

Blast radius counted by grepping actual import sites.

| Package | Current → Latest | Advisory | Blast radius (verified) |
| --- | --- | --- | --- |
| `@clerk/nextjs` | 6.39.6 → 7.8.3 | none | **13 files** — every auth surface incl. `proxy.ts` |
| `tailwindcss` | 3.4.19 → 4.3.3 | none | `tailwind.config.ts`, `postcss.config.mjs`, 508-line `globals.css`, every component |
| `typescript` | 5.9.3 → 7.0.2 | none | whole codebase (7.0.2 confirmed as `latest`) |
| `stripe` | 18.5.0 → 22.6.0 | none | 2 files: `transaction.action.ts`, `webhooks/stripe/route.ts` |
| `@stripe/stripe-js` | 7.9.0 → 9.14.0 | none | 1 file: `Checkout.tsx` |
| `eslint` | 9.39.5 → 10.9.1 | none | `eslint.config.mjs` only |
| `svix` | 1.99.1 → 2.1.0 | none | 1 file: `webhooks/clerk/route.ts` |
| `tailwind-merge` | 2.6.1 → 3.6.0 | none | 1 file: `lib/utils.ts` (`cn`) |
| `lucide-react` | 0.556.0 → 1.38.0 | none | 4 files, all `components/ui/*` |
| `@types/node` | 24.13.3 → 26.4.0 | none | types only |

#### Breaking-change detail for the four with real blast radius

Researched against upstream documentation rather than recalled.

**`@clerk/nextjs` 6 → 7 — this is Clerk "Core 3".** The single most disruptive item for this codebase:

> "Core 3 introduces several breaking changes across SDKs: the `Protect`, `SignedIn`, and `SignedOut` control components are replaced by the `Show` component; `appearance.layout` is renamed to `appearance.options`; and the `colorRing` and `colorModalBackdrop` properties render at full opacity by default rather than 15% opacity."
> — *clerk-docs, `upgrade-guides/core-3.mdx`*

`SignedIn` / `SignedOut` are used at **8 JSX sites across 3 files** — `app/(root)/page.tsx`, `app/(root)/credits/page.tsx` and `components/shared/Topbar.tsx`. These components gate what a signed-out visitor sees, so a botched conversion to `Show` is a UI-level information disclosure, not a compile error. `npx @clerk/upgrade` scans and applies automated fixes.

Two mitigating findings: `appearance.layout` is **not** used here (`app/layout.tsx` passes `appearance.variables`), and Core 3's raised floor of `next >= 15.2.3` is already satisfied. `@clerk/nextjs@7.8.3`'s peers (`next: ^16.1.0-0`, `react: ~19.2.3`) are also already satisfied by 16.3.3 / 19.2.8 — so the blocker is migration work, not compatibility.

> ⚠️ **Latent fragility to fix *before* attempting this upgrade.** `components/shared/Topbar.tsx:3` imports `SignedOut` from **`@clerk/clerk-react`** while line 4 imports `SignedIn` from `@clerk/nextjs`. `@clerk/clerk-react` is **not declared in `package.json`** — it is a transitive dependency of `@clerk/nextjs` (currently 5.61.9) that happens to be reachable. Two components that render side by side are resolved from two different packages whose versions can drift independently. Add the import to `@clerk/nextjs` (or declare the dependency explicitly) as a small standalone fix; do not discover this mid-migration.

**`tailwindcss` 3 → 4.** Configuration moves from `tailwind.config.ts` into CSS via the `@theme` directive, so the theme tokens (`dark`, `darkblue`, `orange`, and the `h*`/`p-*` utilities) all relocate into the 508-line `globals.css`. The PostCSS integration also changes:

> "In v3, the `tailwindcss` package was a PostCSS plugin, but in v4 the PostCSS plugin lives in a dedicated `@tailwindcss/postcss` package. Additionally, in v4 imports and vendor prefixing is now handled for you automatically, so you can remove `postcss-import` and `autoprefixer`."
> — *tailwindcss.com, `upgrade-guide.mdx`*

That means `postcss.config.mjs` changes too, not just `tailwind.config.ts`. `npx @tailwindcss/upgrade` automates much of it. `tailwind-merge` v3 exists to match Tailwind 4's class set, so pairing the two is mandatory, not optional.

**`stripe` 18 → 22.** Upstream publishes a per-major migration guide; v22's breaking changes fall into two buckets — **changes to exported TypeScript types, and changes to service method arguments**. Also relevant to this codebase specifically: stripe-node's typing policy means *minor* upgrades can introduce new type errors without being breaking changes, so budget for type churn. One reassurance for `app/api/webhooks/stripe/route.ts` — `constructEvent` verifies the signature and parses the payload but never applies the client's `apiVersion`; the event is rendered per the *webhook endpoint's* configured API version, so pinning `apiVersion` on the client does not change webhook parsing.

**`eslint` 9 → 10 — and today's migration is a hard prerequisite for it.**

> "ESLint v9 introduced a new default configuration format based on the `eslint.config.js` file... Starting with ESLint v10.0.0, the old configuration format is no longer supported."
> — *eslint, `migrate-to-10.0.0.md`*

Had the legacy `.eslintrc.json` still been in place, ESLint 10 would have been a hard blocker. With flat config landed (Section 7), the remaining v10 changes are modest: removal of six deprecated `context` members (affects plugin/custom-rule authors — verify `eslint-config-next`'s bundled plugins are v10-ready), and the per-file config lookup algorithm becoming the default. The `@eslint/v9-to-v10` codemod automates most of it.

**Recommended sequencing** (each step its own PR, each gated on `npm run build` + `npm run lint`):

0. **Fix the undeclared `@clerk/clerk-react` import in `Topbar.tsx` first.** A few minutes, no version change, and it removes a trap from step 5. See the warning above.
1. **`@types/node`, `lucide-react`, `svix`** — small, isolated, independently revertible. Do first to clear noise. `svix` touches only webhook signature verification: test with a real Clerk webhook replay before merging.
2. **`stripe` + `@stripe/stripe-js`** — pair them. Only 3 files, but they are the payment path; verify against Stripe test mode, especially the pinned API version and `constructEvent` signature check.
3. **`eslint` 9 → 10** — **unblocked by this pass**: v10 drops `.eslintrc` support entirely, so it was a hard blocker until flat config landed. `eslint-config-next@16.3.3` declares its peer as `eslint: ">=9.0.0"` with no upper bound, so v10 is permitted by the range; confirm its bundled plugins do not use the six removed `context` members before merging.
4. **`tailwindcss` + `tailwind-merge`** — one project, done together, never split.
5. **`@clerk/nextjs` 6 → 7** — its own project, with a preview deploy and a deliberate check that every protected route still rejects anonymous access.
6. **`typescript` 5 → 7** — last. A new compiler generation under a codebase with `any` in `lib/utils.ts`, `image.actions.ts` and `TransformationForm.tsx` will surface a long tail; do it when nothing else is in flight.

Breaking-change detail above was researched upstream for the four packages with real blast radius (`@clerk/nextjs`, `tailwindcss`, `stripe`, `eslint`). For the remaining six — `@types/node`, `lucide-react`, `svix`, `tailwind-merge`, `@stripe/stripe-js`, `typescript` — only the current→latest versions, advisory status and blast radius were verified here; **read their changelogs before scheduling**, particularly `typescript` 5 → 7, which is a compiler-generation change and is sequenced last for that reason.

---

## Workstream B — `querySrv ECONNREFUSED` on the Atlas SRV record

### B.1 — Root cause: machine-level DNS (confirmed; not repaired, by instruction)

Re-ran the reproduction. It reproduces exactly as recorded:

```
$ node -e "const dns=require('dns'); console.log('servers:', dns.getServers()); ..."
servers: [ '127.0.0.1' ]
system: ECONNREFUSED
8.8.8.8: 3 records
```

**Diagnosis.** The system resolver is `127.0.0.1` and nothing is listening there. A public resolver answers the identical query with all three shards. This is not an application bug, not an Atlas IP-allowlist problem, and not a malformed connection string — `mongodb+srv://` requires a DNS SRV lookup, so it is simply the first thing to notice that *every* DNS lookup on this machine is failing. The usual cause is a local DNS proxy that is installed but stopped: Pi-hole, AdGuard Home, dnscrypt-proxy, Docker's embedded DNS, or a VPN stub resolver.

#### Checklist for you to run (no machine changes were made)

1. **Find what should own loopback port 53, and whether it is running.**
   ```powershell
   netstat -ano | findstr :53
   Get-Service | Where-Object { $_.DisplayName -match 'dns|adguard|pi-hole|dnscrypt' }
   ```
   A `127.0.0.1:53` line with a PID means something *is* listening and the problem is elsewhere. No line means nothing is bound — that is the fault.

2. **Start it, or stop pointing at it.** Either restart the service you identified, or set the adapter's DNS to a working resolver. If a VPN client set this and has since disconnected, reconnecting and disconnecting cleanly often restores the original settings.

3. **Confirm the fix** by re-running the reproduction one-liner above. Success is `system:` reporting `3 records` rather than `ECONNREFUSED`.

4. **No app restart needed.** The connection cache no longer holds a failed attempt (see B.2), so requests recover as soon as DNS does.

> **Do not** "fix" this by rewriting `lib/database/mongoose.ts` to a non-SRV `mongodb://` seed list. It hard-codes shard hostnames Atlas is free to rotate. Recorded in the README as a documented emergency fallback only.

### B.2 — The code defect it exposed (FIXED — commit `905de39`)

An unreachable database should degrade, not detonate. What changed:

**New `lib/errors.ts`** — deliberately *not* in `lib/utils.ts`, which client components import for `cn`, `dataUrl` and `download`:

- `AppError` — carries a user-safe `message`, a `code`, and the original failure on **`cause`**.
- `logError(context, error)` — logging, separated from throwing.
- `toAppError(context, error)` — logs, then returns a typed `AppError`. Always used as `throw toAppError(...)`, so control flow is visible at the call site.

**`toAppError` calls `unstable_rethrow(error)` first.** This matters more than it looks: `redirect()` and `notFound()` signal *by throwing*. Without that guard, wrapping every action in a catch would have swallowed navigation across the app. (`unstable_rethrow` confirmed exported from `next/navigation` in 16.3.3, not assumed.)

**`handleError` deleted from `lib/utils.ts`.** It logged, then threw a *new* `Error` string-wrapping the message — discarding the stack and cause chain, forwarding internal detail, and doing no "handling" despite the name.

**One contract, applied uniformly.** Every action in `image.actions.ts`, `user.actions.ts` and `transaction.action.ts` now throws instead of falling off the end of a `catch`. Previously each inferred `Promise<T | undefined>` while callers assumed a value always arrived; return types are now honest. Domain failures became typed `AppError`s (`NOT_FOUND`, `UNAUTHORIZED`).

*Contract choice, and its one caveat:* throw-and-boundary was chosen because every read action is awaited by a Server Component, which is exactly what `error.tsx` exists for. Be aware that Next redacts thrown messages in production, so `AppError.message` is a development aid and a contract marker — the copy users actually read lives in the boundaries and toasts.

**Two real bugs found while applying it:**

1. **`deleteImage` called `redirect("/")` from a `finally` block.** Because `redirect` signals by throwing, it *overrode the error raised in `catch`* — a failed delete navigated the user home as though it had succeeded, silently. Moved to the success path. This was not in the brief; it surfaced from reading the control flow.

2. **`lib/database/mongoose.ts` never cleared `cached.promise` on rejection.** One DNS failure poisoned the singleton for the life of the process: every later request awaited the same rejected promise and kept failing *even after DNS recovered*. Now cleared in a `catch`, so the next request genuinely retries. Also replaced `global as any` with a typed `globalThis`, and bounded `serverSelectionTimeoutMS` to 5s (the failing request took 8.6s).

**User-visible resilience:**

- `app/(root)/error.tsx` — the main boundary; sits inside the `(root)` layout so the Topbar survives the failure. `app/error.tsx` covers other segments. `app/global-error.tsx` renders its own `<html>`/`<body>` (it replaces the root layout) with self-contained inline styling, since global CSS lives in the layout it replaces. `app/(root)/loading.tsx` covers the streaming case.
- The boundaries render **fixed copy plus `error.digest`** — never `error.message`.
- `page.tsx` and `profile/page.tsx` dropped the `images?.` optional chaining that rendered an empty gallery indistinguishable from a real empty state.
- `TransformationForm` and `DeleteConfirmation` replaced `console.log(error)` with error toasts, matching the existing `useToast` convention.

#### Demonstrated, not asserted

DNS is still broken on this machine, so this is the real failure condition, against a production build (`npm run build && npm start`):

```
$ curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" http://localhost:3100/
HTTP 200 in 0.049450s
HTTP 200 in 0.047949s
HTTP 200 in 0.057690s
```

**Before:** `GET / 500 in 8.6s`, raw `querySrv ECONNREFUSED ...` reaching the dev overlay.
**After:** HTTP 200 in ~0.05s. Rendered page, via browser accessibility snapshot:

```yaml
- navigation: link "Go to front page", link "Login"      # Topbar survived
- heading "We can't reach the image library right now" [level=2]
- paragraph: This is usually temporary. Your images are safe - try loading
             the page again in a moment.
- button "Try again"
- paragraph: "Reference: 2523247303"
```

Scanned the response for leakage — `querySrv`, `ECONNREFUSED`, `hu6wt`, `mongodb.net`: **no matches** in the HTML; the browser console carried only a minified React error id.

Meanwhile the server log keeps everything an operator needs, including the `cause` chain that `handleError` used to destroy:

```
[getAllImages] Error: querySrv ECONNREFUSED _mongodb._tcp.hyades.hu6wt.mongodb.net
  { code: 'ECONNREFUSED', syscall: 'querySrv', hostname: '_mongodb._tcp...' }
⨯ Error [AppError]: We can't reach the image library right now. Please try again in a moment.
  { code: 'DB_UNAVAILABLE', digest: '2523247303',
    [cause]: Error: querySrv ECONNREFUSED _mongodb._tcp.hyades.hu6wt.mongodb.net }
```

The `digest` matches the `Reference:` shown in the browser — a user can quote it and an operator can find the exact failure.

**Note on the status code.** The response is 200, not a graceful 500, because the shell (including `loading.tsx`) flushes before the server component rejects; the boundary then renders through the stream. The definition-of-done discriminator — "not a 500 carrying a raw internal message" — is met on both counts.

**Manual reproduction for a healthy machine:** point `MONGODB_URL` at an unresolvable host (e.g. `mongodb+srv://user:pass@nonexistent.invalid/hyades`) in `.env.local`, then load `/`.

---

## Workstream C — README audit (FIXED — commit `8e84a9e`)

Every item verified against the filesystem or the code before editing.

| # | Claim | Finding | Action |
| --- | --- | --- | --- |
| 1 | TypeScript badge "5.7" | installed **5.9.3** | → `5.x` range, so it stops rotting |
| 2 | "Node.js 18.x or higher" | `next@16.3.3` engines `>=20.9.0`; `mongodb@7` and `mongoose@9` both `>=20.19.0` | → **20.19 or higher**, with the reasoning shown |
| 3 | "Copy `.env.example` to `.env.local`" | **no such file existed** | → created `.env.example` |
| 4 | Tree omits `proxy.ts`, `build-check.sh` | confirmed missing | → added, plus a "Where authentication is enforced" section |
| 5 | `npm run lint` documented as working | **it was broken** — see Section 7 | → docs and script fixed together |
| 6 | Tree accuracy | verified programmatically, both directions | → regenerated |
| 7 | Plans / features / backend / webhooks | see below | → one real error corrected |
| 8 | No troubleshooting section | confirmed | → added, led by B.1 |

**On item 3 —** `.env.example` contains every key the README documents (all 9 `process.env.*` references in code verified present, plus the 6 Clerk SDK-read variables), with placeholder values only. Confirmed `git check-ignore -v .env.example` matches nothing, while `.env.local` is still ignored via `.gitignore:31 (.env*.local)` and remains untracked. No secret values were read, printed or written at any point.

**On item 6 —** the tree was checked by script in both directions: every basename it lists exists on disk, and every real source file appears in it. Two omissions were found and fixed (the webhook `route.ts` files); `next-env.d.ts` is intentionally excluded as generated and gitignored.

**On item 7 —** three of four claims were already correct and were left alone: credit plans match `constants/index.ts` exactly (0/10, 39/200, 199/3000), the five listed features match `transformationTypes` (`restore`, `fill`, `remove`, `recolor`, `removeBackground`), and the webhook paths match `app/api/webhooks/{clerk,stripe}/route.ts`. Plan *names* were aligned to the constants ("Pro Package", "Premium Package"). The one substantive error: **"Next.js API Routes — Serverless API endpoints"** credited the wrong architecture — the data layer is Server Actions in `lib/actions/`, and the only route handlers are the two webhooks. Split into two accurate rows.

---

## Section 7 — Lint toolchain (FIXED — commit `c48b574`)

**Confirmed dead.** `next lint` is no longer a subcommand in Next 16, so `next` treated `lint` as a project directory:

```
$ npm run lint          # before
> next lint
Invalid project directory provided, no such directory: <repo>\lint
$ echo $?
1
```

Compounding it, the repo carried a legacy `.eslintrc.json` (`{"extends": "next/core-web-vitals"}`) which ESLint 9 does not read by default. Nothing had been linted for some time, and **`next build` no longer runs ESLint in Next 16**, so nothing else was covering for it.

**Migration.** Added `eslint.config.mjs` consuming `eslint-config-next/core-web-vitals` (confirmed against the package's real `exports` map rather than guessed), repointed the script to `eslint .`, and removed `.eslintrc.json` only after the replacement ran. The rule set is deliberately identical to what `.eslintrc.json` declared — this is a toolchain change, not a new standard.

**What the linter found once it could run:** 1 error, 3 warnings.

The three warnings were `Unused eslint-disable directive` — stale `camelcase` disables in both webhook routes and `no-unused-vars` in `types/index.d.ts`. Removed; zero behavioural risk, since ESLint itself reported them as doing nothing.

**On the two file-wide directives in `lib/utils.ts`** (`prefer-const`, `no-prototype-builtins`): both traced to `deepMergeObjects` alone. Rather than narrow them to specific lines, I removed the *causes* — `let output` → `const output`, `for (let key in ...)` → `for (const key in ...)`, and `obj1.hasOwnProperty(key)` → `Object.prototype.hasOwnProperty.call(obj1, key)`. Both disables are gone entirely.

**Current state:**

```
$ npm run lint
> eslint .

components\shared\TransformationForm.tsx
  209:7  error  Calling setState synchronously within an effect can trigger
                cascading renders   react-hooks/set-state-in-effect

✖ 1 problem (1 error, 0 warnings)
$ echo $?
1
```

**`npm run lint` still exits 1**, on one error, deliberately left. It is pre-existing and unrelated to this pass — proven, not assumed:

```
$ git diff 905de39~1 905de39 -- components/shared/TransformationForm.tsx \
    | grep -E "^[+-].*(useEffect|setNewTransformation\(transformationType)"
(no output — the flagged effect is untouched)
$ git show a0ccc0c:components/shared/TransformationForm.tsx | sed -n '188,190p'
    if (image && (type === "restore" || type === "removeBackground")) {
      setNewTransformation(transformationType.config);
```

Identical at the original commit. Resolving it means restructuring how `newTransformation` derives from `image` — a behavioural React refactor, not a toolchain change, and outside a security-and-correctness pass. **Recommend a follow-up ticket.** The ESLint 9 → 10 major stays out of scope per §2.1.

---

## Residual risk / not done

**Highest priority — the fix is not yet where production reads from.**

`master` still pins `next@16.2.11` and `sharp@0.34.5`. `build-check.sh` only permits Vercel builds from `master`, so **production remains on the vulnerable version until `devel` is merged.** Per §2.6 I did not push, open a PR, or deploy. This is the one item that should not wait.

**Deliberately not changed:**

| Item | Why |
| --- | --- |
| All ten major upgrades (§A.4) | Out of scope per §2.1. Inventory and sequencing above. |
| `remotePatterns` `pathname` scoping | Recommended, not applied — cannot prove `CldImage` still works without an authenticated render against live Cloudinary. Validate on a preview deploy. |
| Machine DNS configuration | §2.3 — diagnosis and checklist only; no adapter, hosts file or service was touched. |
| `react-hooks/set-state-in-effect` | Pre-existing behavioural refactor; keeps `npm run lint` at exit 1. |
| Non-SRV `mongodb://` fallback | Documented in the README as an emergency measure, not implemented. |
| `@clerk/clerk-react` undeclared import in `Topbar.tsx` | Real fragility (importing from a transitive dependency), but it is a Clerk-upgrade prerequisite rather than a security or resilience fix, and §2.1 keeps dependency work out of this pass. Sequenced as step 0 in §A.4. |
| Minimal-diff redo of the lockfile | 19 in-range packages moved alongside `next`. All disclosed above; reverting them would also give back the `sharp` and `postcss` advisory fixes, so the recommendation is to keep them. |

**Known limitations of this review:**

- **The AVIF verdict carries one inference.** libheif 1.23.2 was read from the installed Windows binary; Linux production uses a different platform package pinned to the same libvips release. Confirm on a Linux runner for a fully direct check.
- **Vercel's install command was never read** — it is a dashboard setting, and no `vercel.json` exists. The exposure verdict was made independent of it (both `npm ci` and `npm install` were shown to yield 16.2.11), but if you want the setting itself recorded, check the dashboard.
- **No automated test covers the degradation path.** It was verified manually against a production build with DNS genuinely broken, and the reproduction is documented, but nothing will catch a regression here. The project has no test framework at all; adding one was out of scope.
- **Authenticated pages were not exercised.** With DNS down, `/profile`, `/credits` and the transformation flows could not be rendered against real data. Their error paths follow the same contract, but only `/` was demonstrated end to end.

**Verification summary**

| Gate | Result |
| --- | --- |
| `package.json` floor `^16.3.3` + lockfile committed | ✅ `aacc4a0` |
| Clean `npm ci` resolves `next` ≥ 16.3.3 | ✅ 16.3.3, output above |
| Both CVEs have an explicit verdict + the fact it rests on | ✅ A.2, A.3 |
| `npm run build` passes | ✅ exit 0, output above |
| `npm run lint` documented | ✅ exit 1, one pre-existing error, documented |
| `/` degrades gracefully with DNS broken | ✅ HTTP 200, snapshot above |
| Every README claim checked | ✅ Workstream C |
| No secret values in any file, commit or report | ✅ |
| No out-of-scope dependency upgraded | ✅ no **major** changed — full 21-package lockfile diff in §A.1 |

**Commits on `devel`** (separate per concern, per §2.5; not pushed):

```
8e84a9e docs: correct README drift and add a real .env.example
c48b574 build: migrate lint to ESLint 9 flat config and a working script
905de39 fix: degrade gracefully when the database is unreachable
aacc4a0 security: raise next floor to ^16.3.3 and commit aligned lockfile
```
