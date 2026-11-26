# Hyades

_AI-Powered Image Editing and Asset Optimization Tool_

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://hyades.jwd-apps.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Secret scan](https://github.com/fcidevel/Hyades/actions/workflows/gitleaks.yml/badge.svg?branch=main)](https://github.com/fcidevel/Hyades/actions/workflows/gitleaks.yml)

---

## About

**Hyades** is a modern Software-as-a-Service (SaaS) application that leverages advanced AI technology to simplify and accelerate image editing and transformation workflows.

Whether you're a creative professional, a marketing team, or a brand looking to optimize visual assets, Hyades provides powerful tools to transform your images in minutes—eliminating the need for costly reshoots and time-consuming manual edits.

> _Named after the star cluster in the constellation Taurus, Hyades brings clarity and brilliance to your visual content._

### Key Features

- **Image Restore** — Refine images by removing noise, artifacts, and imperfections using AI
- **Generative Fill** — Enhance image dimensions using AI-powered outpainting
- **Object Remove** — Intelligently remove unwanted objects from images
- **Object Recolor** — Change colors of specific objects within images
- **Background Remove** — Automatically remove image backgrounds with precision
- **Credit System** — Flexible credit-based pricing with Free, Pro, and Premium plans
- **User Profiles** — Personal dashboard to manage transformations and credits
- **Secure Authentication** — Enterprise-grade auth with Clerk
- **Stripe Payments** — Secure payment processing for credit purchases

---

## Tech Stack

### Frontend

| Technology                                      | Purpose                         |
| ----------------------------------------------- | ------------------------------- |
| [Next.js 16](https://nextjs.org/)               | React framework with App Router |
| [React 19](https://react.dev/)                  | UI library                      |
| [TypeScript](https://www.typescriptlang.org/)   | Type-safe JavaScript            |
| [Tailwind CSS](https://tailwindcss.com/)        | Utility-first CSS framework     |
| [Shadcn/ui](https://ui.shadcn.com/)             | Accessible component library    |
| [React Hook Form](https://react-hook-form.com/) | Form handling                   |
| [Zod](https://zod.dev/)                         | Schema validation               |

### Backend & Database

| Technology                                                                                         | Purpose                  |
| -------------------------------------------------------------------------------------------------- | ------------------------ |
| [MongoDB](https://www.mongodb.com/)                                                                | NoSQL database           |
| [Mongoose](https://mongoosejs.com/)                                                                | MongoDB ODM              |
| [Server Actions](https://nextjs.org/docs/app/getting-started/updating-data)        | Data layer (`lib/actions/`) |
| [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) | Webhook endpoints only      |

### Services & Integrations

| Technology                            | Purpose                          |
| ------------------------------------- | -------------------------------- |
| [Cloudinary](https://cloudinary.com/) | AI-powered image transformations |
| [Clerk](https://clerk.com/)           | Authentication & user management |
| [Stripe](https://stripe.com/)         | Payment processing               |
| [Svix](https://www.svix.com/)         | Webhook handling                 |
| [Vercel](https://vercel.com/)         | Hosting                          |

### Tooling

| Technology                                       | Purpose                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [gitleaks](https://github.com/gitleaks/gitleaks) | Mandatory secret scanning (git hooks + CI) - see [Secret scanning](#secret-scanning-mandatory) |
| [ESLint 9](https://eslint.org/)                  | Linting (flat config, `next/core-web-vitals` rules)                                         |

---

## Project Structure

```
hyades/
├── app/                          # Next.js App Router
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with ClerkProvider
│   ├── error.tsx                 # Error boundary for non-(root) segments
│   ├── global-error.tsx          # Last-resort boundary (renders its own <html>)
│   ├── favicon.ico
│   ├── (auth)/                   # Authentication routes (grouped)
│   │   ├── layout.tsx            # Auth layout
│   │   ├── sign-in/              # Sign in page
│   │   └── sign-up/              # Sign up page
│   ├── (root)/                   # Main app routes (grouped)
│   │   ├── layout.tsx            # App layout with navigation
│   │   ├── page.tsx              # Home page with hero & gallery
│   │   ├── error.tsx             # Error boundary (keeps the Topbar)
│   │   ├── loading.tsx           # Streaming skeleton
│   │   ├── credits/              # Credit plans & checkout
│   │   ├── profile/              # User profile & history
│   │   └── transformations/      # Image transformation pages
│   │       ├── [id]/             # View/update transformation
│   │       └── add/[type]/       # Create new transformation
│   └── api/                      # Route Handlers
│       └── webhooks/             # Webhook handlers
│           ├── clerk/route.ts     # Clerk webhook (user sync)
│           └── stripe/route.ts    # Stripe webhook (payments)
│
├── components/
│   ├── shared/                   # Reusable components
│   │   ├── Checkout.tsx          # Stripe checkout component
│   │   ├── Collection.tsx        # Image gallery grid
│   │   ├── CustomField.tsx       # Form field wrapper
│   │   ├── DeleteConfirmation.tsx# Delete dialog
│   │   ├── Header.tsx            # Page header
│   │   ├── InsufficientCreditsModal.tsx
│   │   ├── MediaUploader.tsx     # Cloudinary uploader
│   │   ├── MobileNav.tsx         # Mobile navigation
│   │   ├── Search.tsx            # Search component
│   │   ├── Topbar.tsx            # Top navigation bar
│   │   ├── TransformationForm.tsx# Main transformation form
│   │   └── TransformedImage.tsx  # Transformed image display
│   └── ui/                       # Shadcn UI components
│       ├── alert-dialog.tsx
│       ├── button.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── logo.tsx
│       ├── pagination.tsx
│       ├── select.tsx
│       ├── sheet.tsx
│       ├── toast.tsx
│       └── toaster.tsx
│
├── constants/
│   └── index.ts                  # navLinks, plans, transformationTypes
│
├── hooks/
│   └── use-toast.ts              # Toast notification hook
│
├── lib/
│   ├── utils.ts                  # Utility functions
│   ├── errors.ts                 # AppError + toAppError (server error contract)
│   ├── actions/                  # Server actions - the data layer
│   │   ├── image.actions.ts      # Image CRUD operations
│   │   ├── transaction.action.ts # Payment transactions
│   │   └── user.actions.ts       # User lookup and credit fee
│   └── database/
│       ├── mongoose.ts           # Cached database connection
│       ├── transactions.ts       # Stripe purchases (server-only)
│       ├── users.ts              # Clerk user sync (server-only)
│       └── models/               # Mongoose schemas
│           ├── image.model.ts    # Image model
│           ├── transaction.model.ts
│           └── user.model.ts     # User model
│
├── public/
│   └── assets/
│       ├── icons/                # SVG icons
│       └── images/               # Static images & logos
│
├── types/
│   └── index.d.ts                # TypeScript type definitions
│
├── .githooks/
│   ├── pre-commit                # gitleaks scan of the staged changes
│   └── pre-push                  # gitleaks scan of every commit being pushed
├── .github/
│   └── workflows/
│       └── gitleaks.yml          # "Secret scan" CI job (full history)
│
├── proxy.ts                      # Middleware entry point (see below)
├── build-check.sh                # Vercel ignored-build-step script (builds main only)
├── components.json               # Shadcn configuration
├── eslint.config.mjs             # ESLint 9 flat config
├── next.config.mjs               # Next.js configuration
├── postcss.config.mjs            # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── .gitleaks.toml                # gitleaks rules (built-in + project-specific)
├── .gitleaksignore               # Reviewed findings, ignored by fingerprint
├── .gitattributes                # LF line endings for the git hooks
├── package.json                  # Dependencies & scripts
├── package-lock.json
└── LICENSE                       # FCI Devel Reference Licence
```

### Where authentication is enforced

`proxy.ts` at the repository root is the Next.js 16 middleware entry point
(the role previously filled by `middleware.ts`). It hosts Clerk's
`clerkMiddleware` and the `createRouteMatcher` public-route list - `/`,
`/sign-in(.*)`, `/sign-up(.*)` and the two webhook paths. Every other route
calls `auth.protect()`. If you are looking for where a route becomes public
or protected, it is there; the pages that need a signed-in user also call
`auth()` and redirect signed-out visitors to `/sign-in`.

`build-check.sh` is the Vercel *Ignored Build Step* script: it exits 1 (build
proceeds) only when `VERCEL_GIT_COMMIT_REF` is `main`, and exits 0 (build
cancelled) on every other branch.

---

## Credit Plans

| Plan                | Price | Credits | Features                                          |
| ------------------- | ----- | ------- | ------------------------------------------------- |
| **Free**            | $0    | 10      | Basic access to services                          |
| **Pro Package**     | $39   | 200     | Full access + Priority support                    |
| **Premium Package** | $199  | 3,000   | Full access + Priority support + Priority updates |

---

## Secret scanning (mandatory)

Every change is checked for leaked credentials with
[gitleaks](https://github.com/gitleaks/gitleaks), at three layers:

| Layer  | What runs                                                                                                    | What it blocks                          |
| ------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Commit | `.githooks/pre-commit` - scans the staged changes                                                            | the commit                              |
| Push   | `.githooks/pre-push` - scans every commit being pushed                                                       | the push                                |
| GitHub | `Secret scan` job (`.github/workflows/gitleaks.yml`) - scans the full history on every push and pull request | updating `main` (required status check) |

- **No credentials in the source code.** The app reads them from its deployment
  environment.
- **Project-specific rules.** [`.gitleaks.toml`](.gitleaks.toml) keeps every built-in
  gitleaks rule and adds four for credential formats of the services this project
  uses: webhook signing secrets (Stripe and Clerk), MongoDB connection strings with an
  embedded password, Cloudinary `cloudinary://` URLs, and Context7 API keys.
- **Hooks on by default.** Installing the dependencies switches the hooks on for that
  clone.
- **Supply-chain hardening.** The CI job pins `actions/checkout` to a commit SHA and
  verifies the gitleaks release binary against its published checksum.
- **Leaked-secret policy.** A secret that ever reaches GitHub is treated as
  compromised and rotated at the source immediately.

---

## Security

### Application

- **Route protection** - every route outside the public list in [`proxy.ts`](proxy.ts)
  requires a signed-in user (Clerk `auth.protect()`); see
  [Where authentication is enforced](#where-authentication-is-enforced).
- **Signed webhooks** - Clerk events are verified with Svix
  ([`app/api/webhooks/clerk/route.ts`](app/api/webhooks/clerk/route.ts)) and Stripe
  events with `stripe.webhooks.constructEvent()`
  ([`app/api/webhooks/stripe/route.ts`](app/api/webhooks/stripe/route.ts)); an event
  that fails verification is not processed.
- **Hosted checkout** - credit purchases run on Stripe Checkout, so card details are
  entered on Stripe's page and never reach this app.

### Runtime

The app is pinned to the **Node.js 24.x** LTS line through the `engines` field in
[`package.json`](package.json), matching the hosting setting. Development uses
**v24.22.3** or later, which includes the
[November 2026 Node.js security release](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases).

### Repository protection

Only the repository owner can change this repository. Two GitHub rulesets enforce it:

| Ruleset          | Applies to              | Rules                                                         | Bypass                          |
| ---------------- | ----------------------- | ------------------------------------------------------------- | ------------------------------- |
| Owner Only Rule  | all branches            | restrict creations, updates and deletions; block force pushes | repository admin (the owner)    |
| Secret Scan Rule | default branch (`main`) | `Secret scan` must pass; block deletions and force pushes     | none - applies to the owner too |

A commit can reach `main` only after `Secret scan` has passed on it, and nobody can
force-push or delete `main`.

---

## Author

Built with ❤️ by [FCI Devel](https://fcidevel.com)

---

## License

Source-available, not open source. The code is public so that prospective clients,
partners and employers can review how FCI Devel builds software: you may read it, and
clone and run it on your own devices for that review, but you may not reuse it.
Contributions are not accepted, and security issues are reported privately as the
licence describes.

See [LICENSE](LICENSE) for the full terms.
