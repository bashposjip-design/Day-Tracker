# Daylight — Your Daily Reset

A calm, minimalist, multi-user daily goals journal and progress visualization web application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Firebase Authentication**, and **Cloud Firestore**.

---

## Deploying via GitHub

This project is pre-configured for both **GitHub Pages** and **GitHub → Netlify** deployments:

- `vite.config.ts` uses `base: './'` so static assets load cleanly whether hosted on a subpath (`https://<your-username>.github.io/<repo-name>/`) or a root domain (`https://<your-site>.netlify.app/`).
- `.github/workflows/deploy.yml` automatically builds and deploys `dist/` to **GitHub Pages** whenever you push to `main` (or `master`).

### Option 1: Host Directly on GitHub Pages
1. Export or push this repository to GitHub (keep `firebase-applet-config.json` committed—it contains standard public Firebase Web client identifiers required by the frontend SDK, while security is enforced server-side by `firestore.rules`).
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push to `main` (or click **Run workflow** under the **Actions** tab). Your live URL will appear at `https://<your-username>.github.io/<repo-name>/`.
5. **Authorize Your GitHub Pages Domain in Firebase** *(Required for Sign-In)*:
   - Open [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/gen-lang-client-0490989809/authentication/settings).
   - Click **Add domain** and enter `<your-username>.github.io` (just the hostname, without `https://` or `/<repo-name>`).

### Option 2: Connect GitHub Repository to Netlify
1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project → GitHub** and select your repository.
3. Netlify automatically detects `netlify.toml` (`npm run build`, publish directory `dist`).
4. Add your resulting `<your-site>.netlify.app` hostname under **Firebase Console → Authentication → Settings → Authorized domains**.

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

## Security Rules & Optional Providers

- **Google Sign-In**: Provisioned and ready out of the box via `signInWithPopup`.
- **Email & Password Sign-In (Optional)**: To enable Email/Password alongside Google Sign-In, open **Firebase Console → Authentication → Sign-in method → Email/Password → Enable → Save**.
- **Firestore Security Rules (`firestore.rules`)**: Enforces verified ownership (`request.auth.uid == userId` and `email_verified == true`), parent profile checks, field allowlists, and size limits. Review `firestore.rules` in the Firebase Console Rules Playground before sharing broadly.

---

## Local Development

```bash
npm install
npm run dev
npm run build
```
