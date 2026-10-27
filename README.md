# ⚡ Cyber Runner 2099

A high-speed, side-scrolling cyberpunk endless runner web game built with pure vanilla JavaScript, HTML5 Canvas, and the Web Audio API. Dash across the futuristic neon skyline of Neo-Tokyo, execute double jumps across spike hazards, slide under low patrol laser grids, collect data chits, and unleash invulnerable hyper overdrive.

Part of the [Gamility](https://mahesh-yennam.github.io/Gamility/) web games collection. Fully configured to run as an **independent standalone repository** or embedded directly within the Gamility portal.

---

## 📁 Repository Structure

```text
cyber-runner-2099/
├── index.html        # Game layout, 16:9 canvas stage, and Schema.org JSON-LD
├── style.css         # Cyberpunk synthwave styling & mobile touch controls
├── game.js           # 60FPS physics runner engine, parallax skyline & Web Audio SFX
├── favicon.svg       # Dedicated cyber helmet & katana vector SVG favicon
├── site.webmanifest  # Progressive Web App (PWA) manifest for mobile install
├── robots.txt        # Search engine crawler configuration
├── sitemap.xml       # Standalone XML sitemap
├── .gitignore        # Standard web gitignore
└── README.md         # Documentation & deployment guide
```

---

## 🎮 How to Play

- **Objective:** Run as far as possible across the rooftops without crashing into hazards. Collect data chits to multiply your score as your running velocity accelerates over distance.
- **Desktop Controls:**
  - `Spacebar` / `Arrow Up` / `W`: **Jump** (Tap again in mid-air for **Double Jump**)
  - `Arrow Down` / `S`: **Slide Duck** (Slides underneath high laser bars and drones)
  - `P`: Pause / Resume
- **Mobile Controls:**
  - On-Screen **⬆ JUMP** (tap twice for Double Jump) and **⬇ SLIDE** buttons
  - Or swipe up to jump and swipe down to slide directly on the screen

### ⚡ Obstacles & Hazards

| Hazard | Behavior | Countermeasure |
| :--- | :--- | :--- |
| **Neon Spikes** | Sharp floor traps mounted on rooftop edges. | **Jump** or **Double Jump** over them. |
| **Laser Grid** | High hovering laser pylons and security drones. | **Slide Duck** underneath the beams. |
| **Patrol Drone** | Mid-air hovering recon orbs. | Jump high or slide depending on approach. |

### 💎 Collectibles & Power-Ups

| Item | Symbol | Effect |
| :--- | :---: | :--- |
| **Data Chits** | 💎 | Cyan and gold diamonds that boost your final credit score (+10 Pts). |
| **Cyber Shield** | 🛡️ | Kinetic force bubble that absorbs 1 collision with any hazard. |
| **Data Magnet** | 🧲 | Generates an electromagnetic field pulling all chits toward you for 7s. |
| **Overdrive Sprint** | ⚡ | Supercharges runner to blazing hyperspeed, destroying obstacles for 4s. |

---

## ✨ Features

- **Pure Vanilla Web Tech:** Zero dependencies, zero external frameworks, zero build tools.
- **Hardware-Accelerated 60 FPS Canvas:** Triple-layer parallax skyline with moving hovercars, glowing moon, and animated runner trails.
- **Dynamic Speed Scaling:** Seamlessly accelerates in velocity the further you sprint.
- **Synthesized Web Audio:** Footstep rhythms, jump whooshes, harmonic double-jump boosts, slide dashes, crystal chit chimes, and crash impacts generated via the Web Audio API.
- **Persistent High Scores:** Automatically saves your personal best score and maximum distance in `localStorage`.
- **SEO & PWA Ready:** Includes dedicated `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, and Schema.org structured data.

---

## 💻 Local Development

Run with any local static HTTP server or simply double-click `index.html`:

```bash
# Using Python
python -m http.server 8080

# Using Node.js npx
npx serve .
```

Then visit `http://localhost:8080` in your web browser.

---

## 📄 Copyright & Terms

Copyright © 2026 Gamility. All rights reserved.
This repository and its source code are proprietary. Unauthorized copying, distribution, or commercial reuse without explicit permission is strictly prohibited.
