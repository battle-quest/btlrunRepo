# Shared Assets

This folder contains **shared visual assets** used across apps in this monorepo.

## Files

- **`bq-ui-panel-frame-vertical.png`** (1344×2531 px): Decorative HUD/panel frame (transparent center). Use as a consistent frame motif for hero panels and modals.
- **`bq-background-grid-map.png`** (2048×2048 px): Seamless/tileable background texture (grid + topo lines + subtle ASCII marks). Use behind layouts.
- **`bq-icons-set.png`** (2816×1536 px): Icon sprite sheet (4×3 grid) of flat pixel-inspired UI icons.
- **`bq-ui-wide-button-states.png`** (3008×1408 px): Wide “pointed-ends” button **sprite** (3 states stacked vertically). Designed to visually match the teal neon + dark glass style of the panel frames.
- **`bq-ui-gear-icon.svg`** (256×256, vector): (Optional/legacy) settings/gear icon. Not currently used in the Start screen flow.

## Icon sprite details (`bq-icons-set.png`)

The sheet is arranged as a **4 columns × 3 rows** grid.

- **Sheet size**: 2816×1536 px
- **Cell size**: 704×512 px (2816/4 × 1536/3)

Icons included:

- **Sword** (attack)
- **Shield** (defense)
- **Skull** (death/elimination)
- **Play** (start/continue)
- **Heart** (HP/health)
- **Boot** (move)
- **Eye** (vision/scout)
- **Envelope** (message/announcement)
- **Flame** (hazard)
- **Lightning** (energy/action)
- **Crown** (leader/winner/GM)
- **Dice** (RNG/chance)

## Button sprite details (`bq-ui-wide-button-states.png`)

This is a **single PNG sprite sheet** containing three button states arranged **top → bottom**:

- **Row 1 (top)**: Default
- **Row 2 (middle)**: Hover / focus
- **Row 3 (bottom)**: Pressed / active

Design intent:

- **Shape**: Wide, flat top/bottom with **tapered pointed ends** (elongated hex-like silhouette).
- **Palette**: Teal/cyan neon strokes + soft glow; dark blue/charcoal “glass” fill with subtle texture.
- **Compatibility**: Made to sit cleanly on top of `bq-ui-panel-frame-vertical.png` (same HUD motif and glow family).

Dimensions:

- **Sheet size**: 3008×1408 px (transparent background)
- **Rows**: 3 stacked states
- **Recommended row slicing** (top-origin, inclusive pixel ranges):
  - **Default**: \(y = 0..468\) → 3008×469 px
  - **Hover**: \(y = 469..937\) → 3008×469 px
  - **Pressed**: \(y = 938..1407\) → 3008×470 px

Usage notes:

- **Preferred integration**: Use as a sprite and change `background-position` per state (CSS) or slice into 3 separate PNGs at build time.
- **Glow padding**: Keep a few pixels of transparent padding around the button when slicing so the neon glow isn’t clipped.
- **Scaling**: This asset is intentionally high-res; it should be scaled down in UI while preserving the soft glow.

## Web usage

The web app serves runtime assets from `apps/web/public/assets/` (Vite static public folder).

To use these shared assets in the web app, copy them into:
- `apps/web/public/assets/`

Future improvement: wire Vite to serve from `apps/assets/` directly so we don’t need copies.

