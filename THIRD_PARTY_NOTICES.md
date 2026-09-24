# Third-party notices

The third-party components listed below retain their own licenses and attribution. Preserve their license files and upstream notices when distributing the playable folder or source repository. The standalone `game/` folder also includes a [third-party attribution notice](game/NOTICE.txt).

## Three.js

- Project: [Three.js](https://github.com/mrdoob/three.js), version 0.169.0.
- Copyright: Three.js authors, as recorded in the bundled license and source headers.
- License: [MIT](game/vendor/THREE-LICENSE.txt).
- Files: `game/vendor/three.module.js` and `game/vendor/addons/` (BufferGeometryUtils and CSM).
- The engine is the official minified distribution under the project's runtime filename. `tools/vendor-three.mjs` reproduces this copy; no custom engine fork is used.

## 404 game recipe

- Project: [404 game recipe](https://github.com/404-Repo/404-game-recipe), by 404.
- License: [Apache License 2.0](game/lib/404-LICENSE.txt).
- Runtime helpers: `game/lib/assetlib.js`, `game/lib/surfaces.js`, `game/lib/rig.js`.
- Development tools: `tools/404/jam.mjs`, `tools/404/ship.mjs`, `tools/harness/verify.mjs`, `tools/harness/render.html`.
- These are reusable recipe libraries and verification tools, not assets or gameplay code from the reference games. Original upstream notices and license terms remain applicable.

## Development dependencies

Node.js, Puppeteer and their transitive dependencies are installed through npm for local development and browser checks. They are not part of the playable `game/` folder. Their packages contain their respective license and notice files; `package-lock.json` records the installed dependency versions.
