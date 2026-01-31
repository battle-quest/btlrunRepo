---
name: uiux-mock-page
description: Create new UI/UX mock pages for btl.run PWA following the established folder pattern. Use when creating new screens, pages, or views for the uiux mocks, or when the user says "create page", "new screen", "add uiux screen", or references apps/pwa/public/uiux.
---

# Create UI/UX Mock Page

Create static HTML/CSS/JS mock pages for btl.run PWA in `apps/pwa/public/uiux/`.

## CRITICAL: Style Source

**All new pages MUST match the exact styling from these two existing screens:**
- `apps/pwa/public/uiux/00-start-screen/`
- `apps/pwa/public/uiux/01-tribute-setup/`

**DO NOT** use styling guidance from anywhere else in the codebase. The uiux mocks are an isolated design system for testing UI/UX ideas independently.

When in doubt, **read the existing CSS files** and copy patterns directly.

## Quick Start

When user requests a new uiux page:

1. **Read existing screens first** — review `00-start-screen/styles.css` and `01-tribute-setup/styles.css`
2. **Determine the screen number and name** (e.g., `02-game-hub`)
3. **Create folder**: `apps/pwa/public/uiux/{nn}-{screen-name}/`
4. **Create four files** using templates below (copy CSS/JS patterns exactly)

## Folder Structure

```
apps/pwa/public/uiux/
├── assets/                    # Shared images (DO NOT create new folder)
├── 00-start-screen/           # Existing
├── 01-tribute-setup/          # Existing
└── {nn}-{new-screen}/         # Your new screen
    ├── index.html
    ├── styles.css
    ├── script.js
    └── README.md
```

## Required Information

Ask user if not clear:
- **Screen purpose**: What does this screen do?
- **Previous screen**: Which screen navigates here? (for back button)
- **Next screen**: Where do action buttons go? (if any)
- **Key UI elements**: What components are needed?

## Templates

### index.html

```html
<!doctype html>
<!--
  btl.run PWA — UI/UX Mock (Screen {NN}: {Screen Name})

  PURPOSE
  - {Brief description of screen purpose}

  FOLDER STRUCTURE
  - Each screen lives in its own folder: /uiux/{screen-name}/
  - Files: index.html, styles.css, script.js, README.md
  - Shared assets: /uiux/assets/
  - Links MUST use explicit filenames for CloudFront/S3:
    href="../{other-screen}/index.html"

  VIEWING
  - Start dev server: `pnpm dev:pwa`
  - Open: /uiux/{nn}-{screen-name}/
-->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>btl.run — {Screen Title}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="stage" role="application" aria-label="btl.run {screen name}">
      <div class="screen">
        <div class="frame" aria-hidden="true"></div>
        <main class="panel" aria-label="{Screen} panel">
          
          <!-- Header with back button -->
          <header class="header">
            <a href="../{prev-screen}/index.html" class="back-btn" aria-label="Back">←</a>
            <h1 class="header-title">{Screen Title}</h1>
          </header>

          <!-- Main content sections go here -->

          <!-- Ad banner (consistent across screens) -->
          <footer class="ad-banner" aria-label="Banner ad placeholder">
            <span><strong>Ad</strong> · banner placeholder</span>
          </footer>
        </main>
      </div>
    </div>
    <script src="script.js"></script>
  </body>
</html>
```

### styles.css

Copy this exact template — it matches `00-start-screen` and `01-tribute-setup`:

```css
/**
 * btl.run PWA — UI/UX Mock (Screen {NN}: {Screen Name})
 *
 * {Brief description of what this screen does}
 */

:root {
  /* Background colors */
  --bg0: #060a0f;
  --bg1: #0b1220;
  --panel: rgba(8, 14, 22, 0.84);
  
  /* Text colors */
  --text: rgba(235, 246, 255, 0.95);
  --muted: rgba(235, 246, 255, 0.72);
  --dim: rgba(235, 246, 255, 0.55);

  /* Accent colors (type-specific) */
  --teal: #28f2d3;
  --teal2: rgba(40, 242, 211, 0.18);
  --magenta: #ff4dd8;
  --magenta2: rgba(255, 77, 216, 0.14);
  --orange: #ff7a2f;
  --orange2: rgba(255, 122, 47, 0.18);

  /* Borders/shadows */
  --stroke: rgba(40, 242, 211, 0.35);
  --stroke2: rgba(40, 242, 211, 0.18);
  --shadow: rgba(0, 0, 0, 0.55);

  /* Sizing */
  --r: 16px;
  --r-sm: 10px;
  --tap: 48px;

  /* Frame padding (tuned for bq-ui-panel-frame-vertical.png) */
  --frame-pad-x: 22px;
  --frame-pad-top: 10px;
  --frame-pad-bottom: 24px;
  --screen-max-w: 520px;

  /* Active accent (overridden by .screen[data-type=...]) */
  --accent: var(--teal);
  --accent2: rgba(40, 242, 211, 0.18);
  --sprite-hue: 0deg;
}

* { box-sizing: border-box; }

/* Page transition animations */
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeSlideOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
}

/* View Transitions API support */
::view-transition-old(root) {
  animation: fadeSlideOut 200ms ease-out forwards;
}

::view-transition-new(root) {
  animation: fadeSlideIn 200ms ease-out forwards;
}

html, body {
  height: 100%;
  margin: 0;
  background: radial-gradient(120% 120% at 50% 10%, var(--bg1) 0%, var(--bg0) 55%, #020409 100%);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  overscroll-behavior: none;
}

.stage {
  position: relative;
  height: 100svh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  /* Layered background: radial glows + grid texture */
  background:
    radial-gradient(110% 90% at 50% 0%, rgba(40, 242, 211, 0.10), transparent 55%),
    radial-gradient(90% 70% at 18% 18%, rgba(255, 77, 216, 0.10), transparent 55%),
    url("../assets/bq-background-grid-map.png");
  background-size: cover;
  background-position: center;
}

.screen {
  position: relative;
  width: min(100vw, var(--screen-max-w));
  height: 100svh;
  overflow: hidden;
}

/* Type palette variations */
.screen[data-type="classic"] {
  --accent: #28f2d3;
  --accent2: rgba(40, 242, 211, 0.18);
  --sprite-hue: 0deg;
}

.screen[data-type="spicy"] {
  --accent: #ff7a2f;
  --accent2: rgba(255, 122, 47, 0.18);
  --sprite-hue: -62deg;
}

.screen[data-type="funny"] {
  --accent: #ff4dd8;
  --accent2: rgba(255, 77, 216, 0.18);
  --sprite-hue: 130deg;
}

.frame {
  position: absolute;
  inset: 0;
  background-image: url("../assets/bq-ui-panel-frame-vertical.png");
  background-repeat: no-repeat;
  background-size: 100% 100%;
  background-position: center;
  pointer-events: none;
  filter: drop-shadow(0 18px 42px rgba(0,0,0,0.65));
}

.panel {
  position: relative;
  width: 100%;
  animation: fadeSlideIn 250ms ease-out forwards;
  /* Safe area + artwork padding */
  padding:
    calc(env(safe-area-inset-top) + var(--frame-pad-top))
    calc(env(safe-area-inset-right) + var(--frame-pad-x))
    calc(env(safe-area-inset-bottom) + var(--frame-pad-bottom))
    calc(env(safe-area-inset-left) + var(--frame-pad-x));

  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  margin: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ------- Header ------- */

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 15px;
  margin-bottom: -5px;
  width: 75%;
  margin-left: auto;
  margin-right: auto;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.30);
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
  display: grid;
  place-items: center;
  -webkit-tap-highlight-color: transparent;
}

.back-btn:active { transform: translateY(1px); }

.header-title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  color: var(--text);
}

.type-badge {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent) 40%, rgba(255,255,255,0.12));
  background: color-mix(in oklab, var(--accent) 12%, rgba(0,0,0,0.30));
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--accent) 75%, white);
}

/* ------- Section Cards ------- */

.section-card {
  border-radius: var(--r);
  border: 1px solid rgba(255,255,255,0.10);
  background: linear-gradient(180deg, rgba(0,0,0,0.40), rgba(0,0,0,0.18));
  box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  padding: 6px 10px;
  width: calc(100% - 30px);
  margin-left: 15px;
}

.section-label {
  margin: 0 0 4px;
  margin-left: 15px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dim);
}

/* ------- Ad Banner ------- */

.ad-banner {
  height: 50px;
  width: 100%;
  margin-top: auto;
  border-radius: 0;
  border: 0;
  background: #ffffff;
  box-shadow: 0 -6px 18px rgba(0,0,0,0.25);
  display: grid;
  place-items: center;
  color: rgba(0, 0, 0, 0.70);
  font-size: 11px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  user-select: none;
}

.ad-banner strong {
  color: rgba(0, 0, 0, 0.88);
  font-weight: 900;
}

/* Small screens */
@media (max-height: 700px) {
  .panel { gap: 6px; }
}

/* ------- Add screen-specific styles below ------- */
```

### script.js

Copy this exact template — it matches `00-start-screen` and `01-tribute-setup`:

```javascript
/**
 * btl.run PWA — UI/UX Mock (Screen {NN}: {Screen Name})
 *
 * Handles:
 * - Reading game type from URL params (?type=classic|spicy|funny)
 * - {List other behaviors}
 */

(function () {
  // ========== URL Params ==========
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';

  // ========== DOM Elements ==========
  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const typeBadge = document.getElementById('typeBadge');

  // ========== Type Config ==========
  const TYPE_CONFIG = {
    classic: { label: 'Classic' },
    spicy: { label: 'Spicy' },
    funny: { label: 'Funny' },
  };

  // ========== Initialization ==========
  function init() {
    // Apply game type to screen (CSS uses [data-type] for colors)
    if (screen) {
      screen.dataset.type = gameType;
    }

    // Update type badge if present
    if (typeBadge) {
      typeBadge.textContent = TYPE_CONFIG[gameType]?.label || 'Classic';
    }

    // Wire up back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('../{prev-screen}/index.html');
      });
    }

    // Add screen-specific initialization below
  }

  // ========== Utilities ==========

  /**
   * Escape HTML for safe DOM insertion.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Navigate with View Transitions API if supported, otherwise fallback.
   * @param {string} url
   */
  function navigateTo(url) {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = url;
      });
    } else {
      const panel = document.querySelector('.panel');
      if (panel) {
        panel.style.animation = 'fadeSlideOut 200ms ease-out forwards';
        setTimeout(() => {
          window.location.href = url;
        }, 180);
      } else {
        window.location.href = url;
      }
    }
  }

  // ========== Start ==========
  init();
})();
```

### README.md

```markdown
# Screen {NN}: {Screen Name}

{Brief description of what this screen does and when it appears.}

## Purpose

- {Purpose 1}
- {Purpose 2}

## Key Elements

| Element | Description |
|---------|-------------|
| **Header** | Back button + screen title |
| **{Element}** | {Description} |

## URL Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `type` | classic, spicy, funny | classic | Game type (affects colors) |

## Navigation

- **From**: `{previous-screen}/index.html`
- **To**: `{next-screen}/index.html?type={type}`

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure |
| `styles.css` | CSS styling |
| `script.js` | JavaScript behavior |
| `README.md` | This documentation |

## Viewing

\`\`\`bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/{nn}-{screen-name}/
\`\`\`

## Links

**Always use explicit filenames** (CloudFront/S3 compatibility):

\`\`\`html
<!-- ✅ CORRECT -->
<a href="../{other-screen}/index.html">Link</a>

<!-- ❌ WRONG -->
<a href="../{other-screen}/">Link</a>
\`\`\`
```

## Key Patterns from Existing Screens

**IMPORTANT**: Copy these patterns directly from the existing screens. Do not improvise.

### Layout Container (required on every screen)
```html
<div class="stage">
  <div class="screen" data-type="classic">
    <div class="frame"></div>
    <main class="panel">
      <!-- content here -->
    </main>
  </div>
</div>
```

### Type-Based Theming
CSS uses `[data-type]` selectors. JS sets it from URL:
```javascript
const gameType = params.get('type') || 'classic';
screen.dataset.type = gameType;
```

### Wide Action Buttons (from 00-start-screen)
```css
.wide-btn {
  position: relative;
  width: 90%;
  margin-inline: auto;
  min-height: clamp(104px, 14vh, 131px);
  border: 0;
  background: transparent;
  cursor: pointer;
}

.wide-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("../assets/bq-ui-wide-button-states.png");
  background-repeat: no-repeat;
  background-size: 100% 300%;
  background-position: 50% 0%;
  filter: hue-rotate(var(--sprite-hue)) saturate(1.15);
}

/* Color overlay for hover/active states */
.wide-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: transparent;
  transition: background 120ms ease-out;
}

.wide-btn:hover::after {
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--accent) 12%, transparent),
    color-mix(in oklab, var(--accent) 4%, transparent));
}
```

### Scroll-Snap Carousels (from both screens)
```css
.picker { position: relative; }

.strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 72%;
  gap: 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding: 2px;
  -webkit-overflow-scrolling: touch;
  padding-inline: 14px;
}

.strip::-webkit-scrollbar { height: 0; }
.strip { scrollbar-width: none; }

.card {
  scroll-snap-align: center;
  cursor: pointer;
}
```

### Section Cards (from 01-tribute-setup)
```css
.section-card {
  border-radius: var(--r);
  border: 1px solid rgba(255,255,255,0.10);
  background: linear-gradient(180deg, rgba(0,0,0,0.40), rgba(0,0,0,0.18));
  box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  padding: 6px 10px;
  width: calc(100% - 30px);
  margin-left: 15px;
}
```

### color-mix() for accent variations
```css
border-color: color-mix(in oklab, var(--accent) 40%, rgba(255,255,255,0.12));
background: color-mix(in oklab, var(--accent) 12%, rgba(0,0,0,0.30));
color: color-mix(in oklab, var(--accent) 75%, white);
```

## Publishing

After creating the page:
```powershell
# Sync to S3
aws s3 sync apps/pwa/public/uiux s3://btl-run-web-prod-615821144597/uiux --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E18WMI8W5MVMR1 --paths "/uiux/*"
```

Live URL: `https://d22y286k7243yg.cloudfront.net/uiux/{nn}-{screen-name}/index.html`
