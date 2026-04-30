# Overview

This project is a pnpm workspace monorepo using TypeScript, designed to build a comprehensive cinematic experience platform called CineLoop. The platform offers features like personalized content recommendations driven by AI, watch history tracking, user authentication, and payment processing for premium features. The core vision is to create a highly engaging and personalized media consumption experience for users, leveraging modern web technologies and AI to curate content and facilitate seamless interactions.

# User Preferences

I prefer clear and concise communication.
I value an iterative development approach with frequent, small updates.
Please ask for confirmation before implementing major architectural changes or adding new external dependencies.
I prefer detailed explanations when complex logic or new patterns are introduced.
Do not make changes to files within the `lib/api-spec/` directory without explicit instruction.

# System Architecture

The project is structured as a pnpm monorepo, facilitating shared libraries and modular development. It uses Node.js 24, pnpm for package management, and TypeScript 5.9.

**Backend Architecture:**
The backend is built with Express 5, providing a robust API server. Data persistence is handled by PostgreSQL with Drizzle ORM. Zod is used for API request and response validation, ensuring data integrity. API codegen is managed by Orval from an OpenAPI specification, generating React Query hooks for the frontend and Zod schemas for validation.

**Monorepo Structure:**
- `artifacts/`: Contains deployable applications, specifically `api-server`.
- `lib/`: Houses shared libraries such as `api-spec` (OpenAPI), `api-client-react` (generated React Query hooks), `api-zod` (generated Zod schemas), and `db` (Drizzle ORM).
- `scripts/`: Holds utility scripts for various development tasks.

**TypeScript Configuration:**
Each package is a composite TypeScript project, inheriting from `tsconfig.base.json`. Typechecking and declaration file generation (`.d.ts`) are performed at the root level using `tsc --build --emitDeclarationOnly`, ensuring correct cross-package dependency resolution.

**Core Features:**

*   **Payments:** Integrates with Stripe, Paystack, and Flutterwave for secure payment processing. Includes webhook handling with idempotency and a robust pro-subscription grant flow. Currency conversion is implemented for international transactions.
*   **Identity:** Provides a lightweight, email-only sign-in system using HMAC-signed cookies for user authentication.
*   **Subscription:** Manages user subscriptions, including cancellation and resumption of pro plans.
*   **Watch History:** Tracks user media progress, allowing for continuation of partially watched content and access to full viewing history.
*   **Search:** Integrates with TMDB for comprehensive media search functionality.
*   **Error Handling:** Implements client-side error boundaries and polished error pages for a smooth user experience.
*   **AI Mood Match:** Leverages OpenAI for recommending curated media picks based on free-form prompts, enriching recommendations with TMDB data, AI reasoning, and vibe taglines.
*   **AI Director Mode:** Creates personalized cinematic experiences by analyzing user watch history to generate taste profiles, personalized content recommendations ("for-you"), daily mood-based suggestions, and "because you watched" recommendations. This feature uses advanced caching and drift detection for taste profiles.
*   **AI Director Co-pilot:** Floating dock chat (`POST /api/director/chat`) grounded in the user's `watch_history` + `taste_profiles.vibe` returns natural-language replies plus structured TMDB-enriched picks (poster, year, vote, reason). Supports voice input via the Web Speech API directly inside the dock.
*   **Smart Auto-Clipping:** `GET /api/director/best-clip/:type/:id` ranks all YouTube videos for a title with a heuristic (trailer > teaser > clip > featurette + recency) then asks GPT-5.4 to re-rank the top 5 for "most cinematic 6-second hook." Result is cached in-memory for 7 days (with LRU-style eviction at 5K entries) and surfaces an `aiCurated: true` flag plus a one-line reason badge in the FeedCard.
*   **Live Presence + Watch-Party:** `GET /api/director/presence/:type/:id` returns a deterministic per-(mediaId, 5-minute-bucket) viewer count using FNV-1a hashing, producing a long-tail distribution that feels live without DB writes. Pairs with a "Watch party" share button that copies a `?party=<token>&watch=<type:id>` link.
*   **Adaptive Cinematic Theme:** `usePalette` hook samples a 32×32 canvas crop of the poster/backdrop, scores 64 color buckets by saturation × pixel-count, and exports an `--cl-accent` CSS custom property used by the vignette, ambient particles, presence glow, AI-hook badge, and like burst. Routes TMDB images through `GET /api/tmdb/img` (CORS-safe proxy with allowlist, redirect re-validation, 8s timeout, 6 MiB cap, image-type check) so canvas reads aren't tainted.
*   **Spatial 3D Feed:** Mouse-only parallax tilt (-4°..+4° via rAF-throttled `transform: rotateX/Y`) on a `perspective: 1400px` wrapper around media layers, plus palette-tinted CSS-animated drifting particles. Tilt + particles automatically disable when `prefers-reduced-motion` is set.
*   **Media Interactions:** Enables user reactions (likes, bookmarks) and comments on media items, with optimistic UI updates and real-time reflection of changes.
*   **UI/UX:** Features a dynamic `FeedCard` component with video playback, metadata display, and interactive elements. `CommentsSheet` provides a drag-to-dismiss interface for engaging with comments. Specific test IDs are provided for various components to aid in testing.

# External Dependencies

-   **Database:** PostgreSQL
-   **ORM:** Drizzle ORM
-   **API Framework:** Express 5
-   **Validation:** Zod
-   **API Codegen:** Orval (from OpenAPI spec)
-   **Payment Gateways:** Stripe, Paystack, Flutterwave
-   **AI Services:** OpenAI (via Replit AI Integrations proxy for `gpt-5.4`)
-   **Media Data:** TMDB (The Movie Database) API
-   **Build Tool:** esbuild
-   **Utility Library:** `tsx`
-   **Frontend Framework:** React
-   **State Management:** React Query
-   **Styling:** Tailwind CSS (implied by typical modern React stack, not explicitly mentioned but assumed for UI)