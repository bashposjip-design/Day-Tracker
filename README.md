# Daylight — Your Daily Reset

A calm, minimalist, multi-user daily goals journal and progress visualization web application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Firebase Authentication**, and **Cloud Firestore**.

---

## Architecture Overview

- **Brand Configuration (`src/config/brand.ts`)**: Centralized brand name (`Daylight`) and tagline (`Your Daily Reset`) so renaming the website takes a single one-line edit.
- **Public Entry & Multi-User Isolation**:
  - Visitors opening the shared URL see a welcoming landing page with an interactive dashboard preview, daily quote, and **Get Started / Sign In / Create Account** options.
  - Authenticated users are routed to their private individual workspace keyed strictly by Firebase Auth UID (`users/{userId}` and `users/{userId}/dailyRecords/{date}`).
- **Timezone-Safe Local Calendar Dates (`src/lib/dateUtils.ts`)**:
  - Uses local `YYYY-MM-DD` date keys (never UTC `toISOString()` slices) and automatically detects midnight rollovers so each morning opens a clean list while preserving every previous day.
- **Deterministic Offline Motivational Quotes (`src/data/quotes.ts`)**:
  - 108 verified historical/literary quotes and calm original reflections with deterministic daily hashing and session-scoped manual cycling (`sessionStorage`).
- **Progress Pathway & Honest Metrics (`src/lib/statsUtils.ts`, `src/components/ProgressSection.tsx`)**:
  - Smooth interactive SVG curve with `Last 7 Days`, `Last 30 Days`, and `All Time` filters.
  - Days with zero goals are never misleadingly plotted as `100%` complete; they are excluded from the completion-rate line.
- **Data Portability & Preferences (`src/lib/storagePreferences.ts`, `src/components/SettingsModal.tsx`)**:
  - Versioned JSON Backup Export & Validated Import, Clear All Data with confirmation, Warm White / Calm Dark / System theme, Reduced Motion toggle, and configurable Streak Rule.

---

## Security Rules & Data Model

Firestore security rules (`firestore.rules`) enforce:
1. Default-deny catch-all across the entire database (`allow read, write: if false;`).
2. Strict verified ownership (`request.auth != null && request.auth.token.email_verified == true && request.auth.uid == userId`).
3. Parent `users/{userId}` relational verification (`hasValidParentUser`) on single-document operations and `resource.data.uid == request.auth.uid` on list queries.
4. Strict field allowlists (`hasAll` / `hasOnly`), immutable `uid` / `date` / `createdAt`, server-timestamp validation (`request.time`), and string/array size caps (`<= 50` goals/day, `<= 280` chars/goal, `<= 5000` chars/reflection).

> **Security Note**: Before sharing any production deployment broadly, review `firestore.rules` in the Firebase Console Rules Playground and audit any future schema changes with `npx eslint firestore.rules`.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local Vite dev server (http://localhost:3000)
npm run dev

# 3. Type-check and build production static bundle
npm run lint
npm run build
```

---

## Firebase Authentication & Free-Tier Quotas

- **Google Sign-In**: Provisioned and ready out of the box via `signInWithPopup`.
- **Email & Password Sign-In (Optional Manual Toggle)**:
  - The UI supports Email & Password registration, email verification, sign-in, and password reset.
  - To enable Email/Password in Firebase Console: open **Authentication → Sign-in method → Add new provider → Email/Password → Enable → Save**.
- **Free-Tier Quotas (Firebase Spark Plan)**:
  - Daylight stores each calendar day as a single compact document (`users/{uid}/dailyRecords/{YYYY-MM-DD}`) and caches reads locally per UID to minimize Firestore reads and writes within Firebase’s free Spark tier.

---

## Deploying to Netlify

`netlify.toml` is preconfigured for zero-config static deployment:

1. Push this repository to GitHub / GitLab / Bitbucket, or run `npm run build` and drag-and-drop the `dist/` folder into Netlify.
2. Netlify settings (auto-detected from `netlify.toml`):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. **Important — Authorize Your Netlify Domain in Firebase**:
   - Once Netlify assigns your domain (e.g., `your-daylight-app.netlify.app`), open **Firebase Console → Authentication → Settings → Authorized domains → Add domain** and add `your-daylight-app.netlify.app` so Google Sign-In popups are permitted on your live URL.
