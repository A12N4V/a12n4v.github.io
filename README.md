# a12n4v.github.io

Arnav Sharma's site: biodigital twins, medical AI, cybernetics, and [Homonin](https://homonin.com). Live at https://a12n4v.github.io.

A single static page with no build step: `index.html`, `style.css`, `main.js`.

1. **I. Hero, on beige.** The name set around the persona. This is the only masked image on the page.
2. **II. Origins.** Delhi, then Irvine, then San Francisco. A pinned stage where each pencil sketch is drawn in by a WebGL shader as you scroll: dark strokes first, then shading, along a flowing front with hatching ahead of it and a dithered edge. Delhi also draws itself in over about four seconds when the section arrives.
3. **III. Inspirations.** Twelve thinkers in cybernetics, semiotics and form. Each is drawn as a small generative machine, dithered live in ink on paper. Most of them recurse, for example Beer's viable system inside a viable system, Peirce's interpretant becoming the next sign, and a Sierpinski automaton for von Neumann.
4. **IV. Opera, inverted to black.** Project cards in four eras. Each card is a public-domain painting, dithered with an 8×8 Bayer matrix in the card's own ink. The dither develops in when the card first scrolls into view.
5. **V. Post-AI.** The viewport dissolves in blocks into Google's 2015 DeepDream frames, which are zoomed and cross-faded with the scroll and posterised through the same dither. The text hallucinates, then the page wakes up.
6. **VI. Contact.**

Bayer-dithered seams join the light and dark sections.

## Assets

| What | File | Source |
|---|---|---|
| Origins sketches | `assets/img/origins/{delhi,irvine,sf}.jpg` | Arnav's own, grayscale 1536×1024 |
| Card paintings | `assets/art/*.jpg` | Van Gogh, Munch, Hokusai, Kandinsky, Turner, Picabia, Matisse and Van Doesburg, all public domain. Grayscale is enough; set `data-art`, `data-ink`, and optionally `data-crop` and `data-invert` on each `.card` |
| Dream frames | `assets/dream/frames/0-4.jpg` | Google's [DeepDream notebook](https://github.com/google/deepdream) (Apache 2.0): the input sky, the sky dreamt at several layers, and frame 29 of the zoom |

Motion honours `prefers-reduced-motion`: each machine shows one still, the sketches appear without animation, and the hallucinated text keeps its original wording for screen readers.

Type: Italiana, Crimson Pro and JetBrains Mono, self-hosted under the SIL Open Font License (see `assets/fonts/*-OFL.txt`).
