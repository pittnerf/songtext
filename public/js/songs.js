(function () {
  "use strict";

  let catalogue = null;

  async function loadCatalogue() {
    if (catalogue) {
      return catalogue;
    }

    const url = window.SONGTEXT_CONFIG.songsUrl;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load songs from ${url}`);
    }

    const data = await response.json();
    catalogue = data.songs
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

    return catalogue;
  }

  function findByNumber(songs, number) {
    return songs.find((song) => song.number === number) || null;
  }

  function findByTitle(songs, title) {
    return songs.find((song) => song.title === title) || null;
  }

  function indexOfNumber(songs, number) {
    return songs.findIndex((song) => song.number === number);
  }

  function neighbour(songs, number, delta) {
    const index = indexOfNumber(songs, number);
    if (index < 0) {
      return songs[0] || null;
    }
    const next = songs[(index + delta + songs.length) % songs.length];
    return next || null;
  }

  window.SongtextSongs = {
    loadCatalogue,
    findByNumber,
    findByTitle,
    indexOfNumber,
    neighbour,
  };
})();
