# GARANG Accumulation Cinematic Asset — Production Spec v1

## Purpose

The Today Hero is a GARANG-owned digital brand asset, not a browser-generated effect. The browser must only compose, play, pause, crossfade, and react to product state. The water / ink / lacquer material itself must be authored and rendered in a real material/lighting pipeline.

## Brand idea

**누적 / Accumulation**: one action changes the surface; repetition leaves a trace; the trace remains as a quieter, denser state.

The asset should read as contemporary Korean luxury through restraint rather than ornament. References are material-level only: ink density, lacquer depth, celadon/jade response, moon-jar asymmetry, negative space.

## Visual acceptance bar

A still frame must look credible as a premium editorial campaign image even with all GARANG UI and logos removed. If the frame reads as a web effect, presentation animation, meditation-app loop, stock wellness footage, or AI-tech particle graphic, it fails.

### Material

- Near-black physically believable liquid surface, not a flat black plane.
- Surface tension must be physically plausible at impact and during settling.
- Refraction, absorption, roughness, and specular response must vary subtly across the surface.
- Black must preserve tonal depth. Do not crush all shadow information into #000.
- Jade/celadon influence is a reflected material response, never a teal glow painted on top.
- No perfect circles. Disturbance edges and reflections should retain natural asymmetry.

### Camera and composition

- Macro / product-film character, fixed camera.
- Recommended equivalent focal character: 85–120 mm, shallow but controlled depth.
- Low grazing angle on the surface so micro-reflections remain visible.
- Primary action must stay inside the central 55% safe region so 390 / 393 / 430 px mobile crops remain intentional.
- The first frame and neutral settle frame must work as static poster frames.

### Lighting

- One large soft key reflected across the liquid.
- Strong negative fill around the environment.
- Restrained warm-white specular.
- Optional extremely weak jade/celadon bounce in only a small part of the reflection.
- No neon rim light, cyan sci-fi edge, lens flare, bloom-heavy glow, or obvious volumetric effect.

## Motion design

### Idle — `hero-idle`

- 10–14 seconds, seamless.
- Motion is near-imperceptible at first glance: micro surface drift, reflection breathing, minute tension changes.
- It must feel alive when watched, but never look like a looping screensaver.
- Start/end frame must match closely enough for a seamless loop.

### Deposit event — `hero-deposit`

- 2.2–3.0 seconds.
- Triggered only after a real GARANG record/check-in causes accumulation to increase.
- A disturbance enters the material, creates a physically credible short tension event, then deposits a new residual trace.
- Do not stage a generic centered droplet followed by five perfect rings.
- End on a neutral frame compatible with return to `hero-idle`.

## Rendering / mastering

Preferred authoring: Blender Cycles, Houdini, Cinema 4D/Redshift, or an equivalent physically based offline renderer.

- Master: ProRes 422 HQ or lossless image sequence; 10-bit preferred.
- Delivery frame rate: 30 fps.
- Render enough samples / denoise quality to remove shimmer in black gradients and micro-speculars.
- Avoid temporal denoise artifacts around the liquid boundary.
- Deliver a clean master before web compression.

## Web delivery files

Place final binaries in:

`05_assets/garang-accumulation-cinematic/v1/`

Required:

- `hero-idle.webm`
- `hero-idle.mp4`
- `hero-deposit.webm`
- `hero-deposit.mp4`
- `hero-poster.webp`

Recommended encoded dimensions: 1440×900 or larger master crop, encoded for the app after visual QA. Avoid excessive bitrate that causes mobile startup stalls; preserve dark gradients and specular detail over raw resolution.

When the five deliverables are present and visually approved, change `manifest.json` status from `production-required` to `ready`. The runtime will begin using the cinematic asset without a JavaScript rewrite.

## Runtime behavior contract

- Stable Hero DOM node across lifecycle/state events.
- `muted`, `playsinline`, native `<video>` playback for iOS / Instagram WebKit resilience.
- Idle media is the only loop.
- Deposit media plays only after accumulation increases, then returns to idle.
- Reduced-motion users receive the approved poster frame only.
- If media fails, the UI falls back to a quiet near-black surface rather than procedurally manufacturing fake water.
- No Canvas water renderer is permitted in this surface.

## Rejection conditions

Reject the asset if any of the following are visible:

- PPT / template-like droplet and ripple language.
- Generic concentric rings.
- Plastic/jelly liquid.
- Bright teal as the primary visual device.
- Cheap bloom or chromatic aberration used to imply quality.
- Stock-footage feeling unrelated to GARANG.
- Obvious repeating loop point.
- Compression banding or block noise in black gradients.
- Motion that competes with Today information hierarchy.
