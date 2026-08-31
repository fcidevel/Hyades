# Hyades

_AI-Powered Image Editing and Asset Optimization Tool_

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://hyades.jwd-apps.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

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
│   │   └── user.actions.ts       # User management
│   └── database/
│       ├── mongoose.ts           # Cached database connection
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
├── docs/                         # Review and upgrade notes
│
├── proxy.ts                      # Middleware entry point (see below)
├── build-check.sh                # Vercel Ignored Build Step gate
├── components.json               # Shadcn configuration
├── eslint.config.mjs             # ESLint 9 flat config
├── next.config.mjs               # Next.js configuration
├── postcss.config.mjs            # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Environment variable template
└── package.json                  # Dependencies & scripts
```

### Where authentication is enforced

`proxy.ts` at the repository root is the Next.js 16 middleware entry point
(the role previously filled by `middleware.ts`). It hosts Clerk's
`clerkMiddleware` and the `createRouteMatcher` public-route list - `/`,
`/sign-in(.*)`, `/sign-up(.*)` and the two webhook paths. Every other route
calls `auth.protect()`. If you are looking for where a route becomes public
or protected, it is there and nowhere else.

`build-check.sh` is the Vercel *Ignored Build Step* script: it exits 1 (build
proceeds) only when `VERCEL_GIT_COMMIT_REF` is `master`, and exits 0 (build
cancelled) on every other branch.

---

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# ===================
# App Configuration
# ===================
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# ===================
# MongoDB
# ===================
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/hyades

# ===================
# Clerk Authentication
# ===================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# ===================
# Cloudinary
# ===================
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===================
# Stripe Payments
# ===================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **Note:** Never commit your `.env.local` file to version control. Make sure it's listed in your `.gitignore`.

---

## Getting Started

### Prerequisites

- Node.js **20.19 or higher** (Next.js 16.3 requires `>=20.9.0`; the MongoDB
  driver and Mongoose require `>=20.19.0`, so 20.19 is the effective floor)
- npm, yarn, or pnpm
- MongoDB Atlas account
- Clerk account
- Cloudinary account
- Stripe account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/hyades.git
   cd hyades
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your credentials (see Environment Variables)

4. **Set up webhooks**
   - Configure Clerk webhook endpoint: `https://yourdomain.com/api/webhooks/clerk`
   - Configure Stripe webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`

5. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** in your browser

---

## Available Scripts

| Script          | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint (`eslint .`)  |

---

## Credit Plans

| Plan                | Price | Credits | Features                                          |
| ------------------- | ----- | ------- | ------------------------------------------------- |
| **Free**            | $0    | 10      | Basic access to services                          |
| **Pro Package**     | $39   | 200     | Full access + Priority support                    |
| **Premium Package** | $199  | 3,000   | Full access + Priority support + Priority updates |

---

## Security

- Authentication handled by Clerk with enterprise-grade security
- All payments processed securely through Stripe
- Webhook signatures verified using Svix
- Environment variables for sensitive data

---

## Troubleshooting

### `querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net`

The app starts, then every page that touches the database fails:

```
querySrv ECONNREFUSED _mongodb._tcp.hyades.hu6wt.mongodb.net
```

This is almost never the application, the connection string, or the MongoDB
Atlas IP allowlist. `mongodb+srv://` requires a DNS SRV lookup, so it is the
first thing to break when the machine's DNS resolver is unreachable.

Diagnose it - this compares your system resolver against a public one:

```bash
node -e "const dns=require('dns'); console.log('servers:', dns.getServers()); dns.resolveSrv('_mongodb._tcp.hyades.hu6wt.mongodb.net', (e,r)=>console.log('system:', e ? e.code : r.length+' records')); const R=new dns.Resolver(); R.setServers(['8.8.8.8']); R.resolveSrv('_mongodb._tcp.hyades.hu6wt.mongodb.net', (e,r)=>console.log('8.8.8.8:', e ? e.code : r.length+' records'));"
```

If `system:` reports `ECONNREFUSED` while `8.8.8.8:` returns records, DNS on
the host is broken and MongoDB is fine. A `servers: [ '127.0.0.1' ]` result
means the machine points at a local DNS proxy that is not currently listening
- typically a stopped Pi-hole, AdGuard Home, dnscrypt-proxy, Docker DNS or a
VPN stub resolver.

To fix it:

1. Find what should own port 53 on loopback and whether it is running:
   `netstat -ano | findstr :53` (Windows), then check that service.
2. Start it again, or point the network adapter at a working resolver.
3. Re-run the command above and confirm `system:` now returns records.

Restarting the dev server is not required to recover: a failed connection
attempt is no longer cached, so requests succeed again as soon as DNS does.

> Rewriting `lib/database/mongoose.ts` to a non-SRV `mongodb://` seed list
> also sidesteps the SRV lookup, but it hard-codes shard hostnames that Atlas
> is free to change. Treat it as an emergency fallback, not a fix.

### The page shows "We can't reach the image library right now"

That is the error boundary in `app/(root)/error.tsx` doing its job: the
database was unreachable. Check the server console for the underlying cause
(logged with its full `cause` chain) and see the entry above.

---

## License

This project is private and proprietary.

---

## Author

Made with ❤️ by [JordacheWD](https://jordachewd.com/)
