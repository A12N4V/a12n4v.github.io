# a12n4v.github.io

Arnav Sharma's site: biodigital twins, medical AI, cybernetics, and [Homonin](https://homonin.com). Live at https://a12n4v.github.io.

A single static page with no build step: `index.html`, `style.css`, `main.js`.

1. **I. Hero, on beige.** The name set around the persona. This is the only masked image on the page.
2. **II. Origins.** Delhi to San Francisco, as two engravings.
3. **III. Opera, inverted to black.** Project cards in four eras. Each card's artwork is a public-domain plate (Vesalius 1543, Cajal, Gray's Anatomy), dithered live with an 8×8 Bayer matrix in the card's own ink.
4. **IV. Post-AI.** The viewport dissolves in blocks into a dream while the text hallucinates, then the page wakes up.
5. **V. Contact.**

## Swapping in your own assets

| What | File | Notes |
|---|---|---|
| Delhi illustration | `assets/img/delhi.svg` | Placeholder engraving. Replace it, or point the `<img>` at a `.webp` |
| San Francisco illustration | `assets/img/sf.svg` | Same |
| Dream footage | `assets/dream/deepdream.mp4` | Optional. Picked up automatically and scrubbed with the scroll. Without it, the dream is generated on the GPU |
| Card artwork | `assets/art/*.jpg` | Grayscale is fine. Set `data-art`, `data-ink` and `data-crop` on each `.card` |

Motion honours `prefers-reduced-motion`, and the hallucinated text keeps its original wording for screen readers.

Type: Italiana, Crimson Pro and JetBrains Mono, self-hosted under the SIL Open Font License (see `assets/fonts/*-OFL.txt`).
