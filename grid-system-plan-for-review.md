# Building OBS overlay grids: Custom CSS Grid with interact.js wins

For a TypeScript/Express drag-and-drop overlay builder targeting OBS Browser Source, **custom CSS Grid combined with interact.js** emerges as the optimal architecture. This approach delivers pixel-perfect snap-to-grid behavior, seamless 21:9-inside-16:9 nesting, and full compatibility with OBS's Chromium 127 engine—without the overhead of heavier layout libraries.

The key insight: libraries like react-grid-layout and gridstack.js impose their own positioning systems, making custom aspect ratio nesting awkward. Native CSS Grid handles the nested viewport geometry elegantly, while interact.js provides the most configurable snap and resize API available.

## Why interact.js beats the grid layout libraries

Four major libraries compete in this space, but their design philosophies differ fundamentally:

**interact.js** offers the finest-grained control over snap behavior through three specialized modifiers: `snap()` for pointer coordinates, `snapSize()` for resize dimensions, and `snapEdges()` for edge positioning. The grid snapper accepts pixel values (`{ x: 60, y: 60, range: 10 }`), enabling true pixel-level snapping rather than abstract "grid units." Critically, it's framework-agnostic and doesn't manage layout—meaning it integrates cleanly with CSS Grid instead of fighting against it. Bundle size runs **~30kb minified**, with full TypeScript support built in.

**react-grid-layout** (997k weekly npm downloads, actively maintained) excels for React dashboard projects with its V2 constraints system supporting aspect ratio locks. However, it operates in grid units rather than pixels, requires React, and doesn't integrate with CSS Grid layouts—it uses absolute positioning internally.

**gridstack.js** (262k weekly downloads, very active development) provides solid vanilla JS grid snapping with nested grid support. Like react-grid-layout, it manages its own positioning system rather than complementing CSS Grid. Better for widget dashboards than custom overlay geometry.

**muuri** should be avoided despite its excellent animation system—the library hasn't been updated in 5 years, lacks native snap-to-grid, and has no resize functionality.

| Feature | interact.js | react-grid-layout | gridstack.js |
|---------|-------------|-------------------|--------------|
| Snap API | Pixel-perfect | Grid units | Grid cells |
| CSS Grid compatibility | Excellent | None | None |
| Framework requirement | None | React | None |
| Resize snapping | ✓ snapSize modifier | ✓ Grid units | ✓ Grid cells |
| Bundle size | ~30kb | ~40kb | ~100kb |
| Aspect ratio constraints | ✓ preserveAspectRatio | ✓ V2 constraints | Manual |

For snap-to-neighboring-elements specifically, interact.js allows custom snap target functions that can return neighboring element positions—enabling magnetic snapping beyond just grid cells.

## OBS Browser Source runs Chromium 127 with full CSS Grid support

OBS 31 (released December 2024) upgraded to **CEF/Chromium 127**, resolving the long-standing compatibility issues from OBS 28-30's outdated Chromium 103. This means modern CSS features work reliably:

CSS Grid, Flexbox, `aspect-ratio`, Container Queries, CSS Variables, `calc()`, `clamp()`, CSS Nesting (`&`), and CSS Transforms are all fully supported. The `aspect-ratio` property (supported since Chromium 88) is particularly valuable for this use case—eliminating the old padding-hack approach to maintaining ratios.

**Critical OBS-specific constraints** affect drag-and-drop implementation:

The Browser Source "Interact" window has limitations compared to full browsers—drag operations that work in Chrome may behave differently in OBS's interaction mode. Custom Browser Docks provide full interaction capabilities, making them preferable for the layout builder interface. The rendering target (the actual overlay) can remain a standard Browser Source since it only displays the final layout.

Performance best practices matter for streaming: use GPU-accelerated properties (`transform`, `opacity`) for any animations, avoid animating `width`/`height`/`margin` directly, enable "Browser Source Hardware Acceleration" in OBS Advanced settings, and use the "Shutdown source when not visible" option.

For transparency, OBS applies default CSS making backgrounds transparent (`background-color: rgba(0,0,0,0)`). Don't override this with an opaque background color on the overlay container.

## Custom CSS Grid architecture beats library abstractions

For 21:9-inside-16:9 nesting with discrete snap cells, native CSS Grid provides everything needed without external dependencies. The approach uses CSS custom properties for configurable aspect ratios:

```css
:root {
  /* Frame and viewport ratios */
  --frame-ratio: calc(16 / 9);
  --uw-ratio: 2.37;  /* 2560×1080 ultrawide */
  
  /* Grid configuration */
  --grid-cols: 32;
  --grid-rows: 14;  /* Within ultrawide content area */
  
  /* Letterbox calculation */
  --content-height-pct: calc(100% / var(--uw-ratio) * var(--frame-ratio));
  --letterbox-pct: calc((100% - var(--content-height-pct)) / 2);
  --letterbox-position: 0.5;  /* 0=top, 0.5=center, 1=bottom */
}

.frame-16-9 {
  aspect-ratio: 16 / 9;
  width: 1920px;
  height: 1080px;
  display: grid;
  grid-template-rows: 
    calc(var(--letterbox-pct) * var(--letterbox-position) * 2)
    1fr
    calc(var(--letterbox-pct) * (1 - var(--letterbox-position)) * 2);
}

.viewport-ultrawide {
  grid-row: 2;
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
}

.overlay-element {
  grid-column: var(--x) / span var(--w, 1);
  grid-row: var(--y) / span var(--h, 1);
}
```

This approach stores element positions as CSS custom properties (`--x`, `--y`, `--w`, `--h`) that JavaScript updates during drag/resize operations. The CSS Grid handles all rendering; interact.js handles all user interaction.

**Why not Bootstrap/Tailwind grids?** Framework grid systems are designed for responsive layouts, not overlay positioning. They don't support row spanning well, add unnecessary bundle weight, and their abstractions leak when you need precise aspect ratio control.

## Ultrawide letterbox math requires attention to actual ratios

"21:9" is marketing—actual ultrawide resolutions vary significantly:

| Resolution | True Ratio | Decimal | Height in 1920×1080 | Letterbox |
|------------|-----------|---------|---------------------|-----------|
| 2560×1080 | **64:27** | 2.370 | 810px | 270px |
| 3440×1440 | **43:18** | 2.389 | 804px | 276px |
| 3840×1600 | **12:5** | 2.400 | 800px | 280px |
| True 21:9 | 21:9 | 2.333 | 824px | 256px |

The core calculation for fit-to-width letterboxing:

```typescript
const calculateLetterbox = (
  frameWidth: number,
  frameHeight: number,
  ultrawideRatio: number,
  position: number = 0.5  // 0=top, 0.5=center, 1=bottom
) => {
  const contentHeight = frameWidth / ultrawideRatio;
  const letterboxTotal = frameHeight - contentHeight;
  return {
    contentHeight,
    letterboxTop: letterboxTotal * position,
    letterboxBottom: letterboxTotal * (1 - position),
  };
};

// Example: 2560×1080 content in 1920×1080 frame
calculateLetterbox(1920, 1080, 64/27);
// → { contentHeight: 810.13, letterboxTop: 134.93, letterboxBottom: 134.93 }
```

For configurable letterbox positioning, the `position` parameter shifts bars between top-only (0), centered (0.5), and bottom-only (1). This enables users to place the ultrawide viewport where their game UI elements dictate.

## Implementation architecture combines CSS Grid rendering with interact.js editing

The recommended architecture separates the **layout editor** (where users drag and resize) from the **overlay renderer** (displayed in OBS):

**Layout Editor** (runs in Custom Browser Dock or standalone browser):
- Uses interact.js for drag, resize, and snap-to-grid behavior
- Calculates grid cell positions based on pointer coordinates
- Updates CSS custom properties on elements during interaction
- Serializes layouts to JSON for storage
- Provides visual guides showing the grid and letterbox regions

**Overlay Renderer** (runs as OBS Browser Source):
- Pure CSS Grid positioning—no JavaScript interaction needed
- Reads layout JSON and applies CSS custom properties
- Renders overlay elements at their grid positions
- Maintains exact 16:9 aspect ratio with ultrawide inset

```typescript
// interact.js configuration for grid snapping
import interact from 'interactjs';

const CELL_WIDTH = 60;  // pixels
const CELL_HEIGHT = 60;

interact('.overlay-element')
  .draggable({
    modifiers: [
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: CELL_WIDTH, y: CELL_HEIGHT })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }]
      }),
      interact.modifiers.restrict({
        restriction: '.viewport-ultrawide',
        elementRect: { left: 0, right: 1, top: 0, bottom: 1 }
      })
    ],
    listeners: {
      move: (event) => {
        const { target, dx, dy } = event;
        const x = (parseFloat(target.dataset.x) || 0) + dx;
        const y = (parseFloat(target.dataset.y) || 0) + dy;
        
        // Convert pixel position to grid coordinates
        const gridX = Math.round(x / CELL_WIDTH) + 1;
        const gridY = Math.round(y / CELL_HEIGHT) + 1;
        
        target.style.setProperty('--x', gridX.toString());
        target.style.setProperty('--y', gridY.toString());
        target.dataset.x = x.toString();
        target.dataset.y = y.toString();
      }
    }
  })
  .resizable({
    edges: { left: true, right: true, bottom: true, top: true },
    modifiers: [
      interact.modifiers.snapSize({
        targets: [interact.snappers.grid({ width: CELL_WIDTH, height: CELL_HEIGHT })]
      }),
      interact.modifiers.aspectRatio({ ratio: 'preserve' })  // Optional
    ]
  });
```

## Conclusion

The winning stack combines **native CSS Grid** for layout rendering with **interact.js** for drag-and-drop editing. This avoids the positioning conflicts that occur when using react-grid-layout or gridstack.js, delivers pixel-perfect snap behavior, and takes full advantage of OBS 31's Chromium 127 CSS support.

Key implementation decisions: use CSS custom properties for element positions (enabling CSS-only rendering in OBS), calculate grid cell dimensions from the actual ultrawide ratio being used (not assumed 21:9), and build the editor interface as a Custom Browser Dock rather than relying on OBS's limited Interact window.

The **~30kb interact.js bundle** plus zero-overhead native CSS Grid creates a lightweight, performant system that won't strain OBS's rendering pipeline—critical for maintaining stream quality while running complex overlays.