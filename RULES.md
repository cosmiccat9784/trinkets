# Trinkets Design Law: No Scrolling in Games

**The law:** every game must fit entirely inside the user's window. No scrolling
— vertical or horizontal — is ever required to see or reach any part of a game.
Not on desktop, not on phones, not in landscape, not on short viewports.

This file exists so the rule survives beyond any single session. Any new game,
toy, or modal change must obey it before it ships.

## Why

The modal is the game. If controls (like the 2048 d-pad) sit below the fold,
the game is broken for everyone who doesn't think to scroll. Small viewports
are common (phones, short laptop windows, landscape tablets), and browser
chrome eats more viewport height than developers expect.

## How to comply (in order of preference)

1. **Size play widgets from the viewport, not just the container.**
   Use width formulas that account for both axes, e.g. for a 4:3 canvas:
   `width: min(100%, 720px, calc((100dvh - 380px) * 4 / 3))`.
   The `100dvh` term reserves space for the modal header, stats, messages,
   buttons, and gaps ("chrome budget" ≈ 380–560px depending on the game).
   Prefer `100dvh` over `100vh` (mobile URL bars). Prefer `min()` over
   media queries — it adapts continuously.

2. **Cap JS-driven sizes with `window.innerHeight`.**
   Anything sized in JS (maze grid max-width, powder canvas resolution) must
   take the smaller of its ideal size and the viewport-derived budget.
   Recompute on every render, not just on open, so rotation is handled.

3. **Never rely on panel scroll.** `.modal-panel` keeps `overflow: auto` only
   as a catastrophic fallback. If you see a scrollbar during testing, the
   game is non-compliant — fix the sizing, don't accept the scroll.

4. **`fitGameShell()` is the universal backstop** (script.js).
   After every game opens (and on window resize, and on Toybox page flips),
   it measures the game layout against the visible modal space and applies a
   GPU-friendly `transform: scale()` shrink if anything overflows (scale keeps
   all pointer math correct, since every game maps input through
   `getBoundingClientRect`).
   Never position fixed overlays inside `.game-layout` (the transform would
   trap them); attach them to `.modal-panel` and remove them on close.

5. **Paginate instead of stacking.** Content that is inherently tall (the
   Toybox grid) must be split into pages that each fit, never one long column.

6. **Grids shrink, they don't scroll.** Board/maze/tile grids use
   `minmax(0, 1fr)` columns inside a capped-width container. Maze cells are
   display-only (movement is via d-pad/keys), so shrinking them is always safe.

7. **Embeddable by construction.** Every game also runs inside embed.html
   (no topbar, no shelf, no page-specific DOM). Starters must only touch the
   `#gameShell` subtree plus document-level listeners that cleanup removes.
   Live stats for the embed caption come from `setSnapshot` — keep snapshots
   fresh if a game tracks a score.

8. **Feedback is anonymous-only.** Reports from feedback.html post straight
   to the private sheet inbox (see feedback-server.gs). No popups, no new
   windows, no accounts. The reporter's own history lives in localStorage.

9. **Every shipped game must appear in the feedback form.** When you add a
   new card to `index.html` (`data-game="…"`), immediately add a matching
   `<option value="…">` to the Game `<select>` in `feedback.html` (keep the
   list in shelf order, same values as `data-game`/`gameSlugs`). This keeps
   bug reports routable — missing entries are a ship-blocker just like a
   failing viewport check.

## Testing checklist (manual — no headless browser in this repo)

- 360×640 phone portrait: every game opens with zero scrollbars.
- 844×390 phone landscape (shortest realistic viewport).
- 1366×768 laptop.
- 1920×1080 desktop.
- Rotate a phone with a game open; no scrollbars may appear.
- Never bump `?v=` asset versions by hand: the deploy workflow
  (`.github/workflows/deploy.yml`) restamps every `?v=` to the commit
  SHA and stamps the footer build number (`build <count> (<sha>)`) on
  each push to main. When testing locally, hard-refresh instead —
  stale caches will report ghosts.

## Violations log

- 2048 d-pad cut off below the fold (fixed: viewport-capped board +
  fit pass + asset bump).
