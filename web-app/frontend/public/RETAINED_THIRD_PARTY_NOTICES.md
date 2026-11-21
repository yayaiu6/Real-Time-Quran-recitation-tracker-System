# Third-party components

The following components remain subject to their owners' licensing and attribution
requirements. Public availability or possession of an API key is not a license.

| Component | Notice |
|---|---|
| Quran Lab recognition SDK, worker and WASM | Preserve packaged notices and comply with SDK/model terms. Recognition services and model distribution remain operated by Quran Lab. |
| Quran.ws / QVP renderer, atlas, page vectors and surah font | QVP v0.5.0 resources are available through `https://cdn.quran.ws/qvp/v0.5.0/`. Verify the applicable renderer, data and font terms before redistribution. |
| Quran text, pronunciation/alignment data and Hafs Smart font | Preserve applicable text/data/font notices and verify redistribution terms with the relevant rights holders. |
| Audio cues and other included assets | Verify applicable redistribution permissions before publication. |
| Tailwind CSS v4 | Builds the shared local UI utility stylesheet. MIT License; the generated CSS banner and full notice below are preserved in the distribution. |

Product configuration does not override third-party rights. No project-wide
license is declared until the applicable component terms have been reviewed.

- `fonts/HafsSmart_08.ttf` is KFGQPC Hafs Smart v0.08, published by the
  [King Fahd Glorious Quran Printing Complex](https://fonts.qurancomplex.gov.sa/).
  See `KFGQPC-Hafs-Smart-EULA.txt` and the font's embedded copyright and terms.
  The download URL for this exact version has not been verified.
- `data/quran.json` is the unchanged v4 corpus matching the available reader
  distribution. The exact dataset's redistribution terms have not been verified.
  It is distinct from the backend's `quran-json@3.1.2` source.
- `QURAN-WS-ENGINE-MIT.txt` carries the renderer code notice for covered
  Quran.ws material. It does not license QVP v0.5.0 data or its font.

### Application Sound Effects

The application includes three custom-generated sound effects used for recitation feedback. These audio assets are separate from the application's source-code license and remain subject to any applicable third-party generation and distribution terms.

## Tailwind CSS — MIT License

Copyright (c) Tailwind Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
