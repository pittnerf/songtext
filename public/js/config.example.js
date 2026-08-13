// EXAMPLE ONLY — do not put real Firebase values in this file.
// Real values go in GitHub: Settings → Secrets and variables → Actions.
// The Pages workflow writes public/js/config.js at deploy time.
//
// For local testing you may copy this file to config.js (gitignored).

window.SONGTEXT_CONFIG = {
  songsUrl: "data/songs.json",
  pollIntervalMs: 1000,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
  },
  statePath: "songtext/currentSongNumber",
  externalUrlMode: "open",
};
