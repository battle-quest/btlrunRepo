---
name: preact-vite-performance
description: Optimize Preact + Vite bundle size and performance for btl.run PWA. Use when bundle size grows, performance degrades, or adding new dependencies.
---

# Preact + Vite Performance Optimization

Optimize the btl.run Preact PWA for minimal bundle size and fast loading.

## Target Metrics

- **Bundle size**: <50KB total (currently ~40KB)
- **First contentful paint**: <1s
- **Time to interactive**: <2s

## Current Bundle Analysis

From `frontend/package.json` and build output:
```
Preact runtime:       ~3KB
App code:            ~14KB
CSS:                 ~2KB
PWA assets:          ~20KB
Total:               ~40KB ✓ (well under target)
```

## Vite Configuration

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      // PWA configuration
    })
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: undefined  // Keep bundle simple and small
      }
    }
  }
});
```

## Bundle Size Optimization

### 1. Dependency Audit

```powershell
cd frontend
pnpm list --depth=0

# Check for large dependencies
pnpm exec vite-bundle-visualizer
```

**Keep dependencies minimal:**
- ✅ Preact (3KB) - core framework
- ✅ Preact hooks - included in preact
- ❌ Avoid moment.js, lodash, large icon libraries

### 2. Code Splitting

For Preact with lazy loading:

```typescript
import { lazy, Suspense } from 'preact/compat';

// Lazy load heavy components
const GameBoard = lazy(() => import('./components/GameBoard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameBoard />
    </Suspense>
  );
}
```

### 3. Tree Shaking

Ensure imports are tree-shakeable:

```typescript
// ✅ Good - tree-shakeable
import { useState, useEffect } from 'preact/hooks';

// ❌ Bad - imports entire library
import * as PreactHooks from 'preact/hooks';
```

### 4. Asset Optimization

**Images:**
- Use SVG for icons (inlined in bundle)
- Optimize PNG/JPG with tools like tinypng
- Lazy load images below the fold

**Fonts:**
- Use system fonts when possible
- If custom font needed, subset to used characters only
- Use `font-display: swap`

## Preact-Specific Optimizations

### 1. Prefer Hooks Over Class Components

```typescript
// ✅ Good - functional with hooks (smaller bundle)
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ❌ Avoid - class components (larger)
class Counter extends Component {
  state = { count: 0 };
  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
```

### 2. Memoization (Use Sparingly)

```typescript
import { memo, useMemo, useCallback } from 'preact/compat';

// Only memoize expensive operations
const ExpensiveComponent = memo(({ data }) => {
  const processed = useMemo(() => heavyCalculation(data), [data]);
  return <div>{processed}</div>;
});
```

### 3. Preact Signals (Future)

For even better performance, consider Preact Signals:
```typescript
import { signal } from '@preact/signals';

const count = signal(0);

function Counter() {
  return <button onClick={() => count.value++}>{count}</button>;
}
```

## Build Analysis

### Check Bundle Size

```powershell
cd frontend
pnpm build

# Output shows:
# dist/index.html         0.87 kB
# dist/assets/index.css   1.76 kB  
# dist/assets/index.js   14.32 kB
```

### Analyze Bundle Composition

```powershell
# Install analyzer
pnpm add -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  preact(),
  visualizer({ open: true })
]

# Build and view
pnpm build
# Opens stats.html with bundle breakdown
```

## Performance Checklist

### Bundle Optimization
- [ ] Total bundle < 50KB
- [ ] No duplicate dependencies
- [ ] Tree shaking enabled
- [ ] Dead code eliminated (terser)
- [ ] Console logs removed in production

### Code Splitting
- [ ] Lazy load non-critical routes/components
- [ ] Dynamic imports for heavy features
- [ ] Keep initial bundle minimal

### Asset Optimization
- [ ] SVGs inlined for small icons
- [ ] Images optimized and lazy loaded
- [ ] Fonts subset if using custom fonts
- [ ] PWA assets cached by service worker

### Preact Best Practices
- [ ] Use hooks, not class components
- [ ] Memoize only expensive computations
- [ ] Avoid unnecessary state updates
- [ ] Use keys for lists

### PWA Optimization
- [ ] Service worker caches static assets
- [ ] Offline fallback configured
- [ ] App shell architecture
- [ ] Fast first paint with skeleton UI

## Common Issues

### Issue: Bundle Too Large

**Diagnosis:**
```powershell
pnpm exec vite-bundle-visualizer
```

**Solutions:**
1. Replace large libraries with smaller alternatives
2. Lazy load non-critical features
3. Remove unused dependencies

### Issue: Slow Initial Load

**Diagnosis:** Check Network tab in DevTools

**Solutions:**
1. Reduce bundle size
2. Enable compression (gzip/brotli)
3. Optimize critical rendering path
4. Preload critical resources

### Issue: Poor Runtime Performance

**Diagnosis:** Use Chrome DevTools Performance profiler

**Solutions:**
1. Reduce re-renders (use `memo`, `useMemo`)
2. Virtualize long lists
3. Debounce/throttle frequent updates
4. Use CSS animations instead of JS

## Integration with btl.run

The current frontend (40KB) is already highly optimized. Key to maintaining performance:

1. **Avoid heavy dependencies** - question every new package
2. **Lazy load features** - game modes, PDF export, advanced features
3. **Keep Preact** - don't switch to React (3KB vs 45KB)
4. **Monitor bundle size** - run this agent after adding features

## Success Criteria

Performance audit passes when:
- ✅ Total bundle < 50KB (currently 40KB)
- ✅ No unnecessary dependencies
- ✅ Critical features load fast
- ✅ Lighthouse score > 90
- ✅ No performance warnings in build
