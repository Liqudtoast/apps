# My little apps

Two small web apps hosted on GitHub Pages, synced through Firebase (free Spark plan).

| App | Path |
|---|---|
| Karaoke Songbook | `/karaoke/` |
| Tee Rotation | `/tees/` |

No build step. Plain HTML + the Firebase JS SDK loaded from Google's CDN.

```
index.html            landing page
firebase-config.js    ← your Firebase web config goes here
firestore.rules       ← paste into the Firebase console
shared/fb.js          Google sign-in gate + Firestore (offline cache on)
karaoke/index.html
tees/index.html
.nojekyll
```

## Where the data lives

Firestore, under `users/{your uid}/`:
- `songs/{id}`: karaoke songs
- `shirts/{id}`, `photos/{id}` (compressed JPEG thumbnails), `settings/tees`: Tee Rotation

Sign in with Google on any device and you see the same data. Each device also keeps an offline copy, so the apps
open and accept changes without signal; changes sync when you're back online.

## One-time Firebase setup

1. **Create the project**: https://console.firebase.google.com → *Create a project* (any name, e.g. `connor-apps`).
   Google Analytics: off. Stay on the free **Spark** plan.
2. **Register a web app**: Project overview → *</>* (Web) → nickname `apps` → don't tick Hosting → *Register app*.
   Copy the `firebaseConfig` values into **`firebase-config.js`**.
3. **Turn on Google sign-in**: *Build → Authentication → Get started → Sign-in method → Google → Enable*,
   pick your support email → Save.
4. **Authorize your GitHub Pages domain**: *Authentication → Settings → Authorized domains → Add domain* →
   `liqudtoast.github.io` (domain only, no `https://` or path).
5. **Create the database**: *Build → Firestore Database → Create database* → Standard edition →
   location `nam5 (United States)` or `us-east4` → **Start in production mode**.
6. **Lock it down**: Firestore → *Rules* → paste **`firestore.rules`**, your Gmail is already in the email list
   (add another address if someone else will use them) → *Publish*.

## Deploying to GitHub Pages

1. Create a **public** repo, e.g. `apps` (GitHub Pages on a free account needs a public repo).
2. Upload everything in this folder, keeping the folders. Include `.nojekyll`.
3. *Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save*.
4. Open `https://liqudtoast.github.io/apps/` after a minute and sign in.

To update later, commit to `main`; Pages redeploys in about a minute.

## Notes

- The config in `firebase-config.js` isn't secret. Every Firebase web app sends it to the browser. The
  security rules are what protect your data, so keep the email allowlist in place.
- iPhone: Safari → Share → **Add to Home Screen** for an app-like icon. If the Google sign-in pop-up is blocked,
  allow pop-ups for the site.
- Backups: each app has **Download backup / Restore backup** (JSON). Tee Rotation backups skip photos.
- Free-tier headroom: Firestore Spark includes 1 GiB stored and 20K writes/day, far beyond what these apps use.
