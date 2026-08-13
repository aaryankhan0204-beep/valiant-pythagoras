# Step-by-Step Guide: Deploying & Enabling Live Collaboration

This guide takes you from your local prototype to a **live functioning website** hosted on GitHub Pages or Vercel, with **working live collaboration** for multiple users across devices.

---

## Step 1: Create a GitHub Repository & Push Code

1. Open your terminal in the project directory (`valiant-pythagoras`).
2. Initialize Git (if not already initialized) and make your initial commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Valiant Decision Workspace with Live Collaboration"
   ```
3. Go to [GitHub.com](https://github.com/new) and create a **New Repository** named `valiant-pythagoras` (set visibility to Public or Private).
4. Link your local repo and push your code to the `main` branch:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/valiant-pythagoras.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Enable Free Live Hosting

### Option A: GitHub Pages (Automated via GitHub Actions)
Your project already includes `.github/workflows/deploy.yml`!
1. On GitHub, navigate to your repository **Settings** tab -> **Pages** (under Code and automation).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push any commit to `main` (or click **Run workflow** under the **Actions** tab).
4. Your site will automatically build and publish live at:
   `https://YOUR_GITHUB_USERNAME.github.io/valiant-pythagoras/`

### Option B: Vercel / Netlify (One-Click Instant Hosting)
1. Log into [Vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New Project** -> Select your `valiant-pythagoras` repository.
3. Leave build settings as default (`Vite` framework preset) and click **Deploy**.
4. You will immediately get a live URL: `https://valiant-pythagoras.vercel.app`.

---

## Step 3: Test Real-Time Live Collaboration

1. Open your live site URL in **Window 1** (e.g., Chrome).
2. Click **Share** in the top navbar and copy your unique room URL (e.g., `https://.../?room=board-new-starter`).
3. Open a second browser tab or an Incognito window (**Window 2**) and paste the copied URL.
4. Add a sticky note, drag a card, cast a vote, or draw a stroke in Window 1 — you will see Window 2 update in **real-time**!

---

## Step 4: Enabling Global Cross-Device Backend Sync (Optional Firebase / Supabase)

Out-of-the-box, the app includes multi-tab/window BroadcastChannel synchronization. To enable real-time database syncing across different devices across the internet:

### Option A: Free Firebase Realtime Database (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Enable **Realtime Database** in test mode.
3. Install Firebase SDK in your project:
   ```bash
   npm install firebase
   ```
4. Put your Firebase config keys in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_DATABASE_URL=https://your-db-default-rtdb.firebaseio.com
   ```

### Option B: Liveblocks (Purpose-built multiplayer cursors & state)
1. Register at [Liveblocks.io](https://liveblocks.io) for a free account.
2. Install Liveblocks React package (`@liveblocks/client @liveblocks/react`).
3. Use Liveblocks room hooks to sync presence, cursors, and board state across users.

---

## Summary of Commands to Run Now

```bash
# 1. Verify build locally
npm run build

# 2. Push to GitHub
git add .
git commit -m "Add live collaboration engine and GitHub Pages deployment workflow"
git push origin main
```
