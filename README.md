# Georgios Kalfas – Portfolio

Welcome to my personal portfolio website. This repo hosts the code for my
multi-page **data & AI portfolio** — a cinematic, animated site covering my
data engineering, analytics and applied ML/AI work, built with HTML, CSS and
vanilla JavaScript (no build step).

🌐 **Live site:** https://georgekalf.github.io/portfolio/

---

## Features

- Multi-page layout: **Home, About, Experience, Projects, Education, Contact**
- Cinematic 3D hero — a WebGL faceted polyhedron with floating tech chips (graceful CSS fallback)
- Modern dark/light theme with a persistent toggle that respects your system preference
- Smooth scrolling with scroll-triggered reveal animations throughout
- Animated KPI count-up on the About page and an alternating, scroll-in timeline on Experience
- Curated, filterable Projects grid — filter by category; each card links to its GitHub repo and shows the project's image
- Responsive design for desktop, tablet and mobile, with `prefers-reduced-motion` and no-JS fallbacks

---

## Tech Stack

- **HTML5** – structure and content
- **CSS3** – custom styling, theming (dark/light) and layout; no framework
- **JavaScript (vanilla)** – theme toggle, animation orchestration, project filters, KPI count-up, custom cursor
- **GSAP 3.13 + ScrollTrigger** – entrance and scroll-triggered animations
- **Lenis** – smooth scrolling
- **Three.js (r160)** – WebGL hero
- **GitHub Pages** – static hosting

All libraries load from CDNs — nothing to install.

---

## Project Structure

```text
root
├── index.html          # Landing page — WebGL hero, tech-stack reel, section links
├── about.html          # About me + animated KPI cards
├── experience.html     # Career timeline
├── projects.html       # Filterable project grid
├── education.html      # Education history
├── contact.html        # Contact links
├── 404.html            # Custom not-found page
├── assets/
│   ├── css/
│   │   └── cinematic.css   # Main stylesheet + theme tokens
│   │   └── style.css   # Old stylesheet not used anymore
│   ├── images/
│   │   ├── profile.jpg
│   │   └── favicon.ico
│   └── js/
│       ├── cinematic.js    # Theme, animations, filters, custom cursor
│       └── hero3d.js       # Three.js WebGL hero (ES module)
│       └── script.js       # Old js not used anymore
└── README.md
```

---

## Running locally

The WebGL hero (`hero3d.js`) is an ES module, which browsers block over the
`file://` protocol, so use a local server:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/ (or use the VS Code "Live Server" extension).
Everything except the WebGL hero also works over `file://`; without it the home
page falls back to a glowing CSS orb.

---

## Deployment

Hosted on **GitHub Pages**, served from the repo root. Push your changes and
GitHub Pages publishes them to the live URL above — no build or CI step required.

---

