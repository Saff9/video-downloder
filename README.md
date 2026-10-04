# VideoFetch Pro — Universal Video Downloader, Snap-Scroll Shorts & Ad-Free Feed

[![Release](https://img.shields.io/badge/version-1.0.3-brightgreen.svg)](https://github.com/Saff9/video-downloder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android%20APK-blue.svg)](https://github.com/Saff9/video-downloder)
[![Developer](https://img.shields.io/badge/developer-saffan%20(@Saff9)-purple.svg)](https://github.com/Saff9)

---

## 💎 Sponsor & Support Project

If you love **VideoFetch Pro** and want to support its continuous development, fast mirror infrastructure, and new features, you can sponsor through any of the options below:

- 💳 **Razorpay Support**: [Support on Razorpay](https://razorpay.me/@CodeChap?amount=kXxURMaXFk%2Bmrv%2B9uGrYpg%3D%3D)
- 🪙 **Solana (SOL) Crypto Address**:
  ```text
  DfL2H7rAaocxpyNYdefV7aybNCSBVJiUSGAn3RDFKRb7
  ```

---

## 🚀 What's New in Version 1.0.1

- 🧠 **Curated Science & Education Feed**: Powered by candidate sourcing inspired by the open-source X algorithm with diversity re-ranking and cluster suppression.
- 📱 **Snap-Scroll Shorts Reels**: Instagram & YouTube Shorts style vertical snap-scroll with instant nocookie autoplay, mute/unmute audio control, and download integration.
- ⚙️ **Feed Preference Customization**: Easily switch between Curated Science & Education, Tech & AI, Physics & Math, Nature & Earth, or All Curated in Settings.
- 🔄 **In-App Update Checker**: Automatic notification and one-click manual update check for new releases.
- 👨‍💻 **Developer Hub & GitHub Integration**: Quick link and connect with developer **saffan** ([@Saff9](https://github.com/Saff9)).
- 📺 **In-Player Sponsor Action Bar**: Directly support development from inside the video player view.
- 🎨 **Base64 Vector Avatars & Universal Logo Fallbacks**: Zero broken images across feeds, reels, search cards, and player views.
- 📥 **Universal Downloader**: Extract and save **4K/1080p MP4** and **320kbps MP3** from YouTube, TikTok, Instagram, Facebook, X (Twitter), Reddit, SoundCloud, and 1,000+ platforms.

---

## 🏗️ Project Structure

```text
videofetch/
├── .github/workflows/
│   └── build-apk.yml          Automated Android APK compilation pipeline
├── server/                    Node.js + Express API (yt-dlp + Invidious racing engine)
│   ├── src/
│   │   ├── config/constants.js Topic pillars, candidate pools, fast mirrors
│   │   ├── services/           Invidious racing, yt-dlp fallback, cache, ranking
│   │   └── utils/helpers.js    Title cleaners, duration formatters, shufflers
│   ├── index.js               API endpoints (/api/feed, /api/search, /api/info, /api/download)
│   └── package.json           Version 1.0.1 backend package configuration
├── web/                       Ultra-fast Responsive Web Application
│   ├── index.html             Tabbed layout (Downloader, Feed, Shorts, History, Settings)
│   ├── css/styles.css         Glassmorphic UI tokens, dark/midnight/light themes, animations
│   ├── js/app.js              Reactive state, snap-scroll reel engine, vector avatars
│   ├── icons/logo.svg         High-definition squircle vector logo & fallback thumbnail
│   └── sw.js                  Offline caching service worker
└── android/                   Native Android Studio Project (Kotlin + WebView)
    ├── app/src/main/assets/web/ Bundled standalone offline web app
    ├── app/src/main/java/     MainActivity.kt with system download manager & fullscreen
    └── app/src/main/res/      Adaptive vector launcher icons, styles, and themes
```

---

## ⚡ Quick Start

### 1. Run Web & Backend Server

```bash
# Navigate to server
cd server

# Install dependencies & fetch yt-dlp
npm install
node scripts/install-ytdlp.js

# Start the server (runs at http://localhost:3000)
npm start
```

### 2. Build Android APK

- **Via GitHub Actions**: Push to `main` branch to automatically trigger the `build-apk.yml` workflow and download the release APK.
- **Via Android Studio**:
  1. Open the `android/` directory in Android Studio.
  2. Sync Gradle dependencies.
  3. Select **Build → Build APK(s)**.
  4. Output location: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 👨‍💻 Developer & Author

- **Developer**: Saffan Akbar
- **GitHub**: [@Saff9](https://github.com/Saff9)
- **Repository**: [https://github.com/Saff9/video-downloder](https://github.com/Saff9/video-downloder)
- **Support**: [Razorpay Link](https://razorpay.me/@CodeChap?amount=kXxURMaXFk%2Bmrv%2B9uGrYpg%3D%3D)

---

## 🔒 Privacy & Terms

VideoFetch Pro is open-source, private, and does not sell or track personal user data. Please respect content copyright and download media only where authorized.