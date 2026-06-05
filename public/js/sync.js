(function () {
  "use strict";

  const config = window.SONGTEXT_CONFIG;
  let db = null;
  let firebaseReady = false;

  function isConfigured() {
    const fb = config.firebase;
    return fb && fb.apiKey && !fb.apiKey.startsWith("YOUR_");
  }

  function initFirebase() {
    if (!isConfigured() || firebaseReady) {
      return Promise.resolve(firebaseReady);
    }

    return new Promise((resolve, reject) => {
      if (typeof firebase === "undefined") {
        reject(new Error("Firebase SDK not loaded"));
        return;
      }

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config.firebase);
        }
        db = firebase.database();
        firebaseReady = true;
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function getCurrentSongNumber() {
    await initFirebase();
    if (!db) {
      throw new Error("Firebase is not configured. See README for setup.");
    }

    const snapshot = await db.ref(config.statePath).once("value");
    const value = snapshot.val();
    return typeof value === "number" ? value : null;
  }

  async function setCurrentSongNumber(number) {
    await initFirebase();
    if (!db) {
      throw new Error("Firebase is not configured. See README for setup.");
    }

    await db.ref(config.statePath).set(number);
  }

  function watchCurrentSongNumber(onChange) {
    return initFirebase().then(() => {
      if (!db) {
        throw new Error("Firebase is not configured. See README for setup.");
      }

      const ref = db.ref(config.statePath);
      ref.on("value", (snapshot) => {
        const value = snapshot.val();
        if (typeof value === "number") {
          onChange(value);
        }
      });
      return () => ref.off("value");
    });
  }

  window.SongtextSync = {
    isConfigured,
    initFirebase,
    getCurrentSongNumber,
    setCurrentSongNumber,
    watchCurrentSongNumber,
  };
})();
