# P&P Work Log V2 — Standalone Vite Project

This is the same P&P Work Log app, packaged as a normal Vite + React project so it
can run **outside Claude Artifacts** — in StackBlitz, CodeSandbox, or locally.

**Why this exists:** inside Claude Artifacts, `fetch()` calls run in a sandboxed
iframe that may restrict which external domains can be reached. All four Google
Sheets endpoints (employees/customers/projects/workLogs) were failing identically
with a generic "Load failed" — which points to a network/sandbox-level block
rather than a bug in the app code or the Apps Script backend. Running the exact
same code here, outside that sandbox, is the test that confirms it either way.

---

## Option A — Run on StackBlitz (fastest, no install)

1. Go to **https://stackblitz.com**
2. Click **"Create new project"** → choose **"Vite"** (or "Import from GitHub" if
   you've pushed this folder to a repo)
3. If starting from a blank Vite template, delete the default `src/App.jsx` and
   `src/main.jsx`, then **drag-and-drop or copy in every file from this folder**,
   keeping the same folder structure:
   ```
   package.json
   vite.config.js
   tailwind.config.js
   postcss.config.js
   index.html
   src/main.jsx
   src/App.jsx
   src/index.css
   ```
4. StackBlitz auto-installs dependencies from `package.json` and starts the dev
   server automatically. If it doesn't, open the terminal panel and run:
   ```
   npm install
   npm run dev
   ```
5. The preview pane on the right shows the running app. Open it in a new tab
   for a full-screen view (there's a small "open in new tab" icon in the
   preview toolbar).
6. Watch the browser console (or the StackBlitz preview) for the connection
   status message on the login screen — it will now show real HTTP errors or
   "Connected" instead of the generic artifact-sandbox message.

**Even faster:** if you push this folder to a public GitHub repo, you can open
it directly at `https://stackblitz.com/github/<your-username>/<repo-name>` and
StackBlitz will boot it automatically — no manual file copying needed.

---

## Option B — Run locally

Requires [Node.js](https://nodejs.org) 18+ installed.

```bash
# from inside this folder
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`) in your browser.

---

## What to test

1. Open the app — it should attempt to load Employees/Customers/Projects/WorkLogs
   from the hardcoded `GOOGLE_SCRIPT_URL` at the top of `src/App.jsx`.
2. Check the login screen for the connection status banner:
   - ✅ **"Connected to server"** → all four endpoints worked. If this happens
     here but NOT inside Claude Artifacts, that confirms the issue was the
     artifact sandbox's network restrictions, not your code or Apps Script.
   - ⚠️ **"Employees loaded, but some data failed: customers: ..."** → tells you
     specifically which Google Sheet tab/action is broken (missing tab, wrong
     name, Apps Script error, etc.) — this is a real backend issue to fix in
     `Code.gs`, unrelated to the sandbox.
   - ❌ **"Cannot reach server"** with specific errors listed → same as above,
     applied to all four calls.
3. Open browser DevTools → Network tab → you can now see the actual HTTP
   request/response for each `?action=...` call directly, which isn't visible
   inside the Claude Artifacts preview.

---

## Files in this project

| File | Purpose |
|---|---|
| `package.json` | Dependencies: React, lucide-react (icons), xlsx (Excel export), Vite, Tailwind |
| `vite.config.js` | Vite dev server config |
| `tailwind.config.js` | Tailwind content scanning (src files) |
| `postcss.config.js` | Tailwind + autoprefixer processing |
| `index.html` | HTML entry point |
| `src/main.jsx` | React root mount |
| `src/App.jsx` | The full application (all components, data layer, UI) |
| `src/index.css` | Tailwind directives |

---

## One change from the Claude Artifacts version

The Claude Artifacts build used a special `window.storage` API for persisting
settings, which **only exists inside the Claude Artifacts sandbox**. This
standalone build swaps that for plain browser `localStorage` instead — same
behavior (settings persist across page reloads), just using a standard web API
that works anywhere. Everything else (data loading, UI, styling, the Google
Sheets integration) is unchanged.

---

## Next step after testing

- **If it connects fine here:** the app and Apps Script backend are both
  correct — the fix is to either keep using Claude Artifacts and accept its
  network limitations for this integration, or deploy this Vite project
  somewhere real (Vercel, Netlify) for day-to-day use instead of running it
  inside Claude.
- **If it still fails the same way here:** the problem is genuinely in the
  Apps Script deployment or Google Sheet setup, not the sandbox — check the
  specific per-endpoint error messages the app now surfaces on the login
  screen and in the Network tab.
