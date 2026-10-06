# Itihasa · Ancient Narratives & Textual Worlds

**[itihasa.joycemalik.com](https://itihasa.joycemalik.com)**

![Who Is Looking? A film in particles](public/og.png)

> "We read history as a list of events. What if we read it as a map of the human mind?"

*Itihasa* (इतिहास, "so indeed it was") is an interactive archive of Indian history and philosophy, told as experiences rather than articles. Each chronicle is built to be felt, not just read.

## The chronicles

### I · The Origins of Bharat
When does a piece of land become an idea? This chronicle traces the name *Bharat* back to its first breath in the Rig Veda, and runs into a contradiction: the Vedic poets praise the mighty **Saraswati** roaring to the sea, yet geology says that river was dying by 1900 BCE, centuries before the textbook date for the "Aryan" arrival. It's a scroll-driven essay with a generative storm, ink and river visuals, and a Tone.js soundscape.

### II · Who Is Looking? (the film)
A short film drawn in **65,536 GPU-simulated particles**, rendered as pencil strokes.

- Pull the cord of a hanging lamp. It flickers out, and the bulb bursts into particles.
- Scroll through 14 scenes: a sleeper, a hand, an x-ray skeleton, a brain full of voices, neurons, an onion with no center, a street of masks, a hole, a silence, an empty room, a car with no driver, and an eye that looks back.
- A **generative score** is synthesised live with the Web Audio API and follows the scroll. It ends with a scored finale.

### The Sky of Observers
At the end of the film, every viewer is asked one question: **Who is looking?** Each answer becomes a permanent, numbered star in a shared night sky, along with a keepsake card that draws the answer in particles beside Rig Veda 10.129.7, *"Whose eye controls this world in highest heaven, he verily knows it, or perhaps he knows not."*

## Tech

| Area | Stack |
| --- | --- |
| App | React 19, Vite (rolldown), React Router, Tailwind CSS 4, Framer Motion |
| Film | three.js, React Three Fiber, GPGPU particle simulation (curl noise, springs), custom GLSL sketch shaders, postprocessing |
| Sound | Web Audio API (film score), Tone.js (Bharat chronicle) |
| Data | Supabase (Postgres with row-level security, rate-limited RPC writes) for comments and the Sky of Observers |
| Hosting | Netlify |

### How the film is made
3D models (hand, skeleton, brain, neurons, onion, head, car, seated figure) are **baked offline** into compact point clouds: `scripts/bake-points.mjs` samples each mesh's surface by triangle area. The browser loads about 8.6 MB of `public/points/*.bin` instead of about 100 MB of GLB files. A GPU simulation then springs the particles from shape to shape, and the stroke shader turns silhouettes into contour lines and shading into hatching.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

To regenerate the film's point clouds, put the source `.glb` models in `models_src/` (gitignored), then run:

```bash
npm run bake
```

## Project layout

```
src/
  pages/        Home, Chronicle (Bharat), Sky (observers)
  components/   Chronicle views, generative canvas, comments
  film/         The film: particles, shaders, camera, score, overlay
  data/         Chronicle text and the film's script
  lib/          Supabase client
scripts/        Point-cloud baking
.github/        Supabase keep-alive workflow
```

## Author

Made by **[Joyce Malik](https://github.com/joycemalik)**. Questions, corrections and arguments are welcome: leave a note in the margin of any chronicle.
