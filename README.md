# Island Portfolio

A playable portfolio built with Three.js and Vite. Run down a jungle path, smash crates, and each crate reveals part of the portfolio. Everything you see is generated in code for now (models, textures, sound); see `ROADMAP.md` for what still needs real assets.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:4000 (if that port is busy, Vite picks the next free one and prints the URL).

| URL option | What it does |
|---|---|
| `?debug` | Live tuning panel: movement, camera, lighting, quality, teleport |
| `?level=levels/sample.gltf` | Load a level exported from Blender instead of the built-in one |

## Controls

- Run: WASD or arrow keys
- Jump: Space (hold for higher; land on a crate to break it)
- Spin: Shift, K or X (breaks crates and defeats crabs in reach)
- Pause: Esc or P

On touch devices an on-screen stick plus Jump and Spin buttons appear. "See everything" shows all content without playing, and `/portfolio.html` is a plain page with the same content.

### Crates

| Crate | Behaviour |
|---|---|
| basic, `?` | Breaks on stomp or spin. May hold portfolio content |
| TNT | Stomp lights a 3 s fuse, spin blows it up straight away |
| bounce (arrows) | Bounces you high and drops fruit; breaks after 5 bounces or a spin |
| `C` checkpoint | Breaking it moves your respawn point here |
| `!` (green metal) | Unbreakable; hitting it turns ghost (outline) crates solid |
| metal | Unbreakable, you can stand on it |

## Editing content

All portfolio text lives in `src/content.js`. Crates point at items by `id`, so changing copy never touches the 3D code. The same content is baked into `portfolio.html` and the `<noscript>` block at build time.

## Tuning

`src/config.js` holds movement, camera, feel and audio settings. Open the game with `?debug` to tweak them live, then copy the values you like back into the file.

To use real music, put a file in `public/audio/` and set `AUDIO.musicUrl`.

## Building levels in Blender

The built-in level is described in `src/level.js`. A level can also be built in Blender and exported as glTF (`.glb`), which is the path toward real art.

1. Model the level with -Z as "forward" (the direction the player runs, away from the camera) and Y up. Export with **+Y Up** enabled (Blender's default).
2. Name objects by role. Blender's `.001` suffixes are fine.

| Name starts with | Role | Custom properties |
|---|---|---|
| `WALK_` | Visible mesh you can stand on (its bounding box is the collider) | |
| `COL_` | Invisible collider, for when the visible mesh is too detailed | |
| `CRATE_basic`, `CRATE_bonus`, `CRATE_tnt`, `CRATE_bounce`, `CRATE_checkpoint`, `CRATE_activator`, `CRATE_metal` | Crate standing on this point (use an Empty) | `content` (an id from `content.js`), `ghost` (bool) |
| `FRUIT` | A fruit at this point | |
| `ENEMY` | Crab patrolling sideways around this point | `range`, `speed` |
| `MOVER` | Moving platform (the mesh itself moves) | `axis` (`x` or `z`), `range`, `speed` |
| `CRUMBLE` | Platform that falls after you land on it | |
| `SPAWN` | Start point | |
| `CHECKPOINT` | Extra respawn point | |
| `GEM` | Finish | |
| `BOUNDS` | Invisible box the player can't leave | |

Anything else is scenery and gets shadows. Colliders are axis-aligned boxes, so keep walkable pieces box-shaped and unrotated (rotate the visual mesh and use a `COL_` box under it if needed).

3. Export as glTF Binary (`.glb`) into `public/levels/`, with **Custom Properties** enabled so the properties above come through. Draco or Meshopt compression is supported.
4. Open `http://localhost:4000/?level=levels/your-level.glb`, or set `LEVEL_URL` in `src/config.js`.

`node scripts/make-sample-level.mjs` writes `public/levels/sample.gltf`, a small level that uses every convention above; import it into Blender to see a working setup.

## Structure

| File | What it does |
|---|---|
| `src/main.js` | Loading, input, game rules (crates, enemies, fruit, checkpoints), main loop |
| `src/player.js` | Player movement, collision and animation |
| `src/camera.js` | Menu fly-through, follow camera, finish orbit, shake |
| `src/world.js` | Collision boxes and queries |
| `src/level.js` | Built-in level layout |
| `src/gltf-level.js` | Loads a level made in Blender |
| `src/scenery.js` | Terrain, cliffs, palms, bushes, ruins, torches, volcano |
| `src/crates.js`, `src/enemies.js`, `src/platforms.js` | Interactive objects |
| `src/particles.js`, `src/audio.js` | Effects and synthesised sound |
| `src/render/` | Textures, sky, water, foliage, post-processing |
| `src/quality.js` | Graphics tiers and automatic step-down |
| `src/ui.js`, `src/style.css`, `index.html` | Menus, HUD, cards, touch controls |
| `src/content.js`, `src/render-content.js` | Portfolio content and its HTML |

In dev builds `window.__game` exposes the game state and `step(dt)` to advance the simulation from the console, which is how the mechanics were tested.
