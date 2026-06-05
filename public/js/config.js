// Copy this file to config.local.js and fill in your Firebase values.
// config.local.js is gitignored — never commit real credentials.
//
// Free Firebase setup: https://console.firebase.google.com
// 1. Create a project (Spark / free plan)
// 2. Realtime Database → Create database (start in test mode for the concert)
// 3. Project settings → Your apps → Web app → copy the config below

window.SONGTEXT_CONFIG = {
  // Path to the song catalogue (relative to the public folder)
  songsUrl: "data/songs.json",

  // How often the viewer checks for a new song (milliseconds)
  pollIntervalMs: 1000,

  // Firebase Realtime Database (shared state between controller and viewer)
  // Project: songs-texts — fill in apiKey, messagingSenderId, appId from
  // Firebase Console → Project settings → Your apps → Web app → SDK setup.
  firebase: {
    apiKey: "AIzaSyAY6rR5BvgCk8jqatnTnqYu8PyiAye0sUs",
    authDomain: "songs-texts.firebaseapp.com",
    databaseURL: "https://songs-texts-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "songs-texts",
    storageBucket: "songs-texts.firebasestorage.app",
    messagingSenderId: "349870690839",
    appId: "1:349870690839:web:1829460eaca958d5ff4252",
  },

  // Key under which the current song number is stored in Firebase
  statePath: "songtext/currentSongNumber",
};
