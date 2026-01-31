---
name: react-vite-performance
description: Optimize React + Vite apps for minimal bundle size, fast loading, code splitting, and performance. Use when building frontend, optimizing bundle size, or implementing the retro-modern UI with <200KB target.
---

# React + Vite Performance Optimization

## Bundle Size Target

**btl.run goal: <200KB compressed (JS + CSS)**

Breakdown:
- React + ReactDOM: ~45KB gzipped
- TailwindCSS (purged): ~10-30KB
- Monospace font (JetBrains Mono subset): ~20KB
- App code: ~50KB
- Routing + utilities: ~20KB
- **Total budget: ~175KB, leaving 25KB buffer**

## Vite Configuration

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, gzipSize: true }), // Bundle analysis
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunk
          vendor: ['react', 'react-dom'],
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: false, // No source maps in production
  },
});
```

## Code Splitting with Lazy Loading

**Load heavy features only when needed:**

```typescript
import { lazy, Suspense } from 'react';

// Lazy load PDF export (only used at end of match)
const PDFExport = lazy(() => import('./components/PDFExport'));

// Lazy load GM controls (only for GMs)
const GMPanel = lazy(() => import('./components/GMPanel'));

function MatchView() {
  return (
    <div>
      <MatchLog />
      
      {showExport && (
        <Suspense fallback={<div>Loading export...</div>}>
          <PDFExport matchId={matchId} />
        </Suspense>
      )}
      
      {isGM && (
        <Suspense fallback={<div>Loading GM tools...</div>}>
          <GMPanel matchId={matchId} />
        </Suspense>
      )}
    </div>
  );
}
```

## TailwindCSS Optimization

**Purge unused styles aggressively:**

```typescript
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0a0e14',
          text: '#b3b1ad',
          green: '#87d96b',
          amber: '#ffb454',
          cyan: '#5ccfe6',
          red: '#f07178',
        },
      },
    },
  },
  plugins: [],
};
```

**Result: ~10-20KB after purge and gzip**

## Font Optimization

**Subset and preload fonts:**

```html
<!-- index.html -->
<head>
  <!-- Preload font (subset to Latin) -->
  <link
    rel="preload"
    href="/fonts/jetbrains-mono-subset.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />
  
  <style>
    @font-face {
      font-family: 'JetBrains Mono';
      src: url('/fonts/jetbrains-mono-subset.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap; /* Show fallback immediately */
    }
  </style>
</head>
```

**Generate subset:**

```bash
# Use glyphhanger or similar
npx glyphhanger --subset=*.ttf --formats=woff2 --US_ASCII
```

## SVG Icons (Inline, No Library)

**Avoid icon libraries (FontAwesome = ~80KB):**

```typescript
// src/components/icons.tsx
export const IconPlay = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const IconPause = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </svg>
);

// Usage
<button>
  <IconPlay /> Start Match
</button>
```

**All icons inlined: ~2KB total**

## CSS-Only Visual Effects

**Retro terminal effects without JavaScript:**

```css
/* Scanline effect (optional) */
.terminal-log::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 0, 0, 0.05) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
  animation: scanline 8s linear infinite;
}

@keyframes scanline {
  0% { transform: translateY(0); }
  100% { transform: translateY(100%); }
}

/* Glassmorphism panel */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

/* Smooth auto-scroll */
.terminal-log {
  scroll-behavior: smooth;
  overflow-y: auto;
}
```

## Minimize Dependencies

**Audit and remove unnecessary packages:**

```bash
# Analyze bundle
npx vite-bundle-visualizer

# Check for duplicates
npx depcheck

# Use native alternatives:
# ❌ lodash → ✅ Native JS methods
# ❌ moment.js → ✅ Native Date or date-fns (smaller)
# ❌ axios → ✅ Native fetch
```

## Fetch API Pattern (No Axios)

```typescript
async function createMatch(data: CreateMatchRequest): Promise<Match> {
  const response = await fetch(`${API_URL}/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

## React Performance Patterns

**Avoid re-renders:**

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const TributeCard = memo(({ tribute }: { tribute: Tribute }) => {
  return (
    <div className="tribute-card">
      <h3>{tribute.name}</h3>
      <div>HP: {tribute.hp}/{tribute.maxHp}</div>
    </div>
  );
});

// Memoize expensive calculations
function MatchView({ match }: { match: Match }) {
  const aliveTributes = useMemo(
    () => match.roster.filter(t => t.alive),
    [match.roster]
  );
  
  const handleAction = useCallback((tributeId: string, action: string) => {
    submitAction(match.matchId, tributeId, action);
  }, [match.matchId]);
  
  return (
    <div>
      {aliveTributes.map(t => (
        <TributeCard key={t.id} tribute={t} />
      ))}
    </div>
  );
}
```

## Virtual Scrolling for Long Logs

**For matches with 100+ events:**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function EventLog({ events }: { events: Event[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
  });
  
  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <EventItem event={events[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Note**: Only use if logs exceed 500+ events; adds ~5KB

## Image Optimization

**No images in MVP (ASCII/text only), but if needed:**

```html
<!-- Use WebP with fallback -->
<picture>
  <source srcset="banner.webp" type="image/webp" />
  <img src="banner.png" alt="btl.run" loading="lazy" />
</picture>
```

## Service Worker for Caching

**Optional PWA features:**

```typescript
// src/sw.ts (if implementing PWA)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('btlrun-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/main.js',
        '/assets/main.css',
        '/fonts/jetbrains-mono-subset.woff2',
      ]);
    })
  );
});
```

## Build Analysis

**Check bundle size:**

```bash
# Build and analyze
npm run build
npx vite-bundle-visualizer

# Check gzipped size
du -sh dist/*.js | gzip -c | wc -c
```

## Performance Budget

**Set hard limits in Vite:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 200, // Warn if chunk > 200KB
  },
});
```

## Lighthouse Score Target

- **Performance**: 95+
- **Accessibility**: 95+
- **Best Practices**: 100
- **SEO**: 90+

## Quick Wins Checklist

- [ ] TailwindCSS purged and minified
- [ ] Fonts preloaded and subset
- [ ] No icon libraries (inline SVG)
- [ ] Code splitting for heavy features
- [ ] No lodash/moment/axios (use native)
- [ ] console.log removed in production
- [ ] Images optimized (WebP, lazy loading)
- [ ] Bundle analyzed with visualizer
- [ ] Service worker (optional PWA)
- [ ] Virtual scrolling for long lists (if needed)

## Testing Bundle Size

```bash
# Build
npm run build

# Check gzipped size
cd dist/assets
ls -lh *.js *.css
gzip -k *.js *.css
ls -lh *.gz

# Target: total *.gz < 200KB
```
