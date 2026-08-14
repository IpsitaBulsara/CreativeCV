# Ipsita — A Creative CV, Kept as a Journal

[![GitHub Pages Deployment](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen?logo=github)](https://pages.github.com/)
[![Built with](https://img.shields.io/badge/Built%20with-HTML5%20%7C%20CSS3%20%7C%20ES6%20JS-blue)]()
[![Sound Engine](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange)]()

An interactive 3D journal-style creative CV built with pure HTML5, CSS3, and JavaScript (zero runtime dependencies).

---

## 📖 Live Demo on GitHub Pages

Once published to your GitHub repository, your interactive journal CV will be live at:

```
https://<your-github-username>.github.io/<repository-name>/
```

---

## 🚀 How to Publish to GitHub Pages (2-Minute Setup)

### Option A: Using Git CLI (Recommended)

1. **Create a new repository** on [GitHub](https://github.com/new) (e.g. `journal-cv` or `<your-username>.github.io`).
2. **Push this project** to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: 3D interactive journal CV"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, choose either:
     - **Deploy from a branch**: Select branch `main` and folder `/ (root)`, then click **Save**.
     - OR **GitHub Actions**: (The included `.github/workflows/deploy.yml` will automatically build and publish).

Your website will be live in ~30 seconds!

---

## 🌟 Key Features

- **3D Interactive Book Engine**: True 3D leaf rotation (`perspective: 2600px`, `preserve-3d`, `rotateY`) with realistic depth, lighting shadows, and leather hardcover styling.
- **Procedural Paper Sound Synthesizer**: Realistic page turn and friction audio generated entirely in real-time via Web Audio API (no audio files needed, works offline).
- **Mobile Touch Gestures**: Smooth swipe navigation (swipe left/right) on phones and tablets.
- **Interactive Table of Contents**: Slide-out index drawer with chapter jumps.
- **Polaroid Photo Zoom**: Click any of the 5 visual plates (Places, Nature, Adventure, Photography, Making) to open a high-res viewer modal with notes.
- **Autoplay Presentation Mode**: Automatically flips through the journal every 6 seconds.
- **Keyboard Shortcuts**:
  - <kbd>→</kbd> / <kbd>Space</kbd> : Next page
  - <kbd>←</kbd> : Previous page
  - <kbd>Home</kbd> / <kbd>End</kbd> : First / Last page
  - <kbd>M</kbd> : Toggle audio sound
  - <kbd>P</kbd> : Toggle autoplay slideshow
  - <kbd>F</kbd> : Toggle fullscreen
  - <kbd>Esc</kbd> : Close table of contents / photo modal
- **Print / PDF Export**: Built-in `@media print` stylesheet for clean resume export.

---

## 💻 Local Development

To run locally on your computer:

```bash
# Using Python
python server.py
# Or: python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

---

## 📄 License
Personal Creative Work by Ipsita. All rights reserved.
