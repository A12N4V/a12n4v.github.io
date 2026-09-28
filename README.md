# a12n4v.github.io

Arnav Sharma's site: biodigital twins, medical AI, cybernetics, and [Homonin](https://homonin.com). Live at https://a12n4v.github.io.

A single static page with no build step: `index.html`, `style.css`, `main.js`.

- **Hero**: the persona is re-dithered live on a canvas with an 8×8 Bayer matrix. An orange probe follows the pointer, or drifts on its own, and shows the image's highlights in an x-ray lens. It honours `prefers-reduced-motion`, and without JavaScript the plain image shows.
- **Sections**: Persona (Peirce's icon, index and symbol), Opera (work, with Homonin's 24×24 pixel glyphs), Systema (the profile plates), Pvlsvs (the live GitHub plate, served from the `output` branch of [A12N4V/A12N4V](https://github.com/A12N4V/A12N4V)), and Contact.
- **Palette**: Homonin's (paper `#ebe6dc`, ink `#0c0a09`, night `#000`, accent `#f97f3a`). Transitions between paper and night are drawn as dithered ramps.
- **Type**: Italiana, Crimson Pro and JetBrains Mono, self-hosted under the SIL Open Font License (see `assets/fonts/*-OFL.txt`).

`assets/plates/*.gif` are copies of the profile plates, which are rendered by `tools/plates` in A12N4V/A12N4V.
