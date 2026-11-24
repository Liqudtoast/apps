// Shared Firebase setup for the little apps: Google sign-in gate + Firestore with offline cache.
// Each signed-in user's data lives under users/{uid}/..., and the security rules only let a user touch their own.
import { firebaseConfig } from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

export const fb = { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch };

const configured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("PASTE");
let auth = null;
export let db = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Offline cache: the app loads instantly from this device and queues writes when there's no signal.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}

/* ---------- write helper: don't block the UI waiting for the server ---------- */
let errorHandler = (msg) => console.warn(msg);
export function onSyncError(fn) { errorHandler = fn; }
export function fire(promise) {
  promise.catch((e) => errorHandler("Couldn't sync: " + (e && (e.code || e.message) || e)));
}

/* ---------- sign-in gate ---------- */
const css = `
.fb-gate{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:20px;background:rgba(10,10,14,.72);backdrop-filter:blur(6px)}
.fb-gate[hidden],.fb-card [hidden]{display:none}
.fb-card{width:min(380px,100%);background:#fff;color:#16171a;border-radius:20px;padding:26px;font:16px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 30px 80px #0007;text-align:center}
.fb-card h2{margin:0 0 6px;font-size:24px;line-height:1.15}
.fb-card p{margin:0 0 18px;color:#5e626b;font-size:15px}
.fb-card button{min-height:48px;width:100%;border-radius:999px;border:0;background:#16171a;color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:10px}
.fb-card button:focus-visible{outline:3px solid #ff4f8b;outline-offset:2px}
.fb-card .err{color:#c62828;font-size:14px;margin:12px 0 0;min-height:1.2em}
.fb-card code{background:#f1f1f1;padding:1px 5px;border-radius:4px;font-size:13px}
.fb-acct{max-width:1240px;margin:0 auto;padding:10px max(5vw,16px) 28px;font:14px/1.5 system-ui,sans-serif;opacity:.75;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.fb-acct button{background:none;border:0;padding:6px 0;min-height:auto;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;border-radius:0}
`;
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

/** Shows a sign-in screen until the user signs in with Google. Resolves with the Firebase user. */
export function requireUser({ appName }) {
  document.head.appendChild(el(`<style>${css}</style>`));
  const gate = el(`<div class="fb-gate" role="dialog" aria-modal="true" aria-labelledby="fbT"><div class="fb-card">
      <h2 id="fbT">${appName}</h2><p id="fbMsg">Sign in to sync your data across your devices.</p>
      <button type="button" id="fbBtn"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Sign in with Google</button>
      <p class="err" id="fbErr" aria-live="polite"></p></div></div>`);
  document.body.appendChild(gate);
  const btn = gate.querySelector("#fbBtn"), err = gate.querySelector("#fbErr");

  if (!configured) {
    btn.hidden = true;
    gate.querySelector("#fbMsg").innerHTML = "Firebase isn't set up yet. Paste your project's config into <code>firebase-config.js</code>.";
    return new Promise(() => {});
  }

  btn.addEventListener("click", async () => {
    err.textContent = ""; btn.disabled = true;
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) {
      const c = e && e.code || "";
      err.textContent =
        c === "auth/popup-blocked" ? "Your browser blocked the sign-in window. Allow pop-ups for this site and try again." :
        c === "auth/unauthorized-domain" ? "This site's address isn't on Firebase's authorized domains list yet." :
        c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request" ? "" :
        "Sign-in didn't work (" + (c || e.message) + "). Try again.";
    }
    btn.disabled = false;
  });

  return new Promise((resolve) => {
    let done = false;
    onAuthStateChanged(auth, (user) => {
      if (!user) { gate.hidden = false; return; }
      gate.hidden = true;
      if (done) return;
      done = true;
      const bar = el(`<div class="fb-acct"><span></span><button type="button">Sign out</button></div>`);
      bar.querySelector("span").textContent = "Synced to " + (user.email || "your account");
      bar.querySelector("button").onclick = async () => { await signOut(auth); location.reload(); };
      document.body.appendChild(bar);
      resolve(user);
    });
  });
}
