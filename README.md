# Island Portfolio

A playable portfolio built with Three.js and Vite. Run down a jungle path, smash crates, and each crate reveals part of the portfolio. Proof of concept: mechanics first, placeholder art and copy.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:4000).

## Controls

- Run: WASD or arrow keys
- Jump: Space (land on a crate to break it; hold Space to bounce higher)
- Spin: Shift, K or X (breaks crates in reach)
- TNT: landing on it lights a 3 second fuse, spinning into it blows it up straight away

On touch devices an on-screen stick plus Jump and Spin buttons appear. "See everything" shows all content without playing.

## Editing content

All text lives in `src/content.js`. Crates in `src/level.js` point at items by `id`, so changing copy never touches the 3D code.

## Structure

- `src/main.js`: renderer, player physics, crate hits, camera, game loop
- `src/level.js`: path surfaces, crate and fruit placement, checkpoints, scenery
- `src/crates.js`: crate textures, break and explosion effects, TNT fuse
- `src/ui.js`: HUD, content card, summary, touch controls
- `src/pip.js`: placeholder character
- `src/content.js`: portfolio content

In dev builds `window.__game` exposes the state and a `step(dt)` function for testing from the console.
