# Concert Song Lyrics App

Browser-based lyrics for live concerts: the **audience** follows lyrics on their phones, while an **operator** selects the current song from a separate page.

## How it works

| Page | Who uses it | Purpose |
|------|-------------|---------|
| `viewer.html` | Audience (via QR code) | Shows the current song's lyrics |
| `controller.html` | Band / operator | Selects the active song |
| `qr.html` | Operator | QR code that opens the viewer URL |

Song texts live in `public/data/songs.json`. The **current song number** is stored in **Firebase Realtime Database** so every phone updates within about one second when the operator changes the song.

```
  Operator phone                    Audience phones
        |                                  |
        v                                  v
 controller.html  ----writes---->  Firebase Realtime DB
                                         ^
                                         | polls every 1s
                                   viewer.html
                                         |
                                         v
                               public/data/songs.json
```

## Recommended free hosting

Use **two free services** — one for static files, one for shared state:

### 1. Static site: GitHub Pages (recommended)

- **Cost:** free
- **Good for:** HTML, CSS, JS, and `songs.json`
- **URL example:** `https://yourusername.github.io/songtext/`

**Why GitHub Pages:** reliable, no expiry, easy to redeploy after you rebuild songs from PDF, works well with a custom subdomain if you add one later.

**Alternatives (also free):**
- **Cloudflare Pages** — fast CDN, similar deploy flow
- **Netlify** — drag-and-drop deploy of the `public/` folder

All three work. GitHub Pages is the simplest if the project already lives in a Git repo.

### 2. Shared state: Firebase Realtime Database (recommended)

- **Cost:** free Spark plan (more than enough for one concert)
- **Good for:** storing `{ "currentSongNumber": 5 }` that both pages read/write

Static hosts cannot accept writes from the browser. Firebase solves that with a few lines of config and no server to maintain.

**Alternative:** Supabase (free tier) — similar idea, slightly more setup.

## Quick start

### 1. Add your song PDFs

Put PDFs in `songs_pdfs/` (or `songs_pdf/`). Name them with a leading number so order is clear:

```
songs_pdfs/
  01_amazing_grace.pdf
  02_how_great_thou_art.pdf
  03_silent_night.pdf
```

### 2. Build the song catalogue

From the repo root:

```bash
# from this repo's root
python3 scripts/build_songs.py
```

This writes `9_songtext/public/data/songs.json` and renders each PDF page to a JPEG in `public/data/images/`, preserving the original layout (chords, spacing, etc.).

### 3. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → create a project (Spark / free).
2. **Build → Realtime Database → Create database.**  
   For a small concert you can start in **test mode** (open read/write). Tighten rules afterward if you keep the project.
3. **Project settings → Your apps → Web** → register an app and copy the config.
4. Paste the values into `9_songtext/public/js/config.js` (replace the `YOUR_*` placeholders).

Example database rules for a concert (Realtime Database → Rules):

```json
{
  "rules": {
    "songtext": {
      "currentSongNumber": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

For a one-off event, open write access is acceptable. For long-term use, restrict writes (e.g. with Firebase Auth or a secret path).

### 4. Test locally

**Important:** the web files live in `public/`. Run the server from there, or use the helper script:

```bash
# from this repo's root
python3 serve.py

# or manually:
cd public
python -m http.server 8080
```

If you start the server from `9_songtext/` instead of `9_songtext/public/`, pages like `/viewer.html` will return **404** (but `/public/controller.html` may still appear to work).

Open:
- http://localhost:8080/controller.html — pick a song
- http://localhost:8080/viewer.html — confirm lyrics update

### 5. Deploy to GitHub Pages (standalone repo)

This folder is meant to live in **its own Git repository**, not inside the course `agents` repo.

#### First-time setup

1. **Create a new empty repo** on GitHub, e.g. `songtext`  
   Do not add a README or `.gitignore` on GitHub (this folder already has them).

2. **Initialize git in this folder** (if you have not already):

   ```bash
   cd 9_songtext
   git init
   git add .
   git commit -m "Initial commit: concert songtext app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/songtext.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source** → **GitHub Actions**.

4. After the workflow runs, your site is at:

   ```
   https://YOUR_USERNAME.github.io/songtext/viewer.html
   https://YOUR_USERNAME.github.io/songtext/controller.html
   https://YOUR_USERNAME.github.io/songtext/qr.html
   ```

5. In **Firebase Console → Authentication → Settings → Authorized domains**, add:
   `YOUR_USERNAME.github.io`

#### Redeploy after song changes

```bash
python3 scripts/build_songs.py
git add public/data/
git commit -m "Rebuild song images"
git push
```

## Concert day checklist

1. Re-run `build_songs.py` if PDFs changed, then redeploy.
2. Open **controller.html** on the operator device.
3. Print or display **qr.html** for the audience.
4. Select song 1 before the concert starts so phones are not blank.

## File layout

```
9_songtext/
  doc/concept.txt          # original idea
  songs_pdfs/              # source PDFs (you add these)
  scripts/build_songs.py   # PDF → songs.json
  public/
    index.html
    viewer.html
    controller.html
    qr.html
    data/songs.json        # generated catalogue
    css/style.css
    js/
      config.js            # Firebase + app settings
      sync.js              # Firebase read/write
      songs.js             # catalogue helpers
      viewer.js
      controller.js
```

## Notes

- The viewer polls Firebase every **1 second** (configurable in `config.js`).
- The combo box lists titles **A–Z**; prev/next follow that same order.
- Song **numbers** come from PDF filenames (leading digits) or build order.
- `qr.html` uses the free [QR Server API](https://goqr.me/api/) — no install needed.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Viewer stuck on “Waiting…” | Open controller and select a song; check Firebase config |
| “Firebase is not configured” | Fill in `public/js/config.js` |
| Wrong song order | Rename PDFs with numeric prefixes and rebuild |
| Blurry text on phones | Rebuild with higher scale: `python3 scripts/build_songs.py --scale 2.5` |
| Large deploy size | Lower JPEG quality: `--jpeg-quality 80`, or use `--scale 1.75` |
