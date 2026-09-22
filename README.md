# Shards of the Blighted March

Local stage-one preview for the 404 game jam. English-language dark fantasy RPG. **Awaiting user acceptance of stage 1.** Combat, items, progression, save and quests are intentionally not implemented yet.

## Run locally

```sh
npm install
npm start
```

Open http://localhost:4173. Use a local HTTP server, not `file://`. The self-contained playable directory is `game/`. `/preview/` on the development server exercises subpath hosting. Port can be changed with `PORT=4174 npm start`.

The development server listens on all interfaces to allow a phone on the same trusted network to connect to `http://<computer-LAN-IP>:4173`. Use your editor's port forwarding when this workspace is remote. There is no deployment, account, telemetry service or external runtime request.

Desktop: WASD / arrow keys to move, mouse to face, wheel to zoom, Escape to pause. Mobile: drag the joystick. Pause button works on both. The pause menu can reset the starting position and select render quality.

## Local verification

The project includes a local Node 22 development dependency because the original environment has Node 18. `npm` scripts use the locally installed executable. Chrome may need system libraries: `npx puppeteer browsers install chrome --install-deps`.

```sh
npm test
node_modules/node/bin/node tools/candidates.mjs
node_modules/node/bin/node tools/candidates.mjs gate
node_modules/node/bin/node tools/candidates.mjs pine
node_modules/node/bin/node tools/404/ship.mjs game
node_modules/node/bin/node tools/404/jam.mjs http://localhost:4173/ --start='#startb' --hold='#stick' --out=_artifacts/jam-local --commit=<actual-sha>
```

Reports and screenshots are in `_artifacts/`. FPS under headless software rendering is not a hardware performance certification. Local jam results do not replace a test of the user's eventual public URL.

## Publication — performed by the user

After accepting stage 5, publish the contents of `game/` to your static host, publish this repository with its actual development history, and run the current official jam gate on your public URL and matching commit. Do not publish `node_modules/`, working references or `_artifacts/` as game assets. Complete the official entry template and submit the PR yourself.

The implementation agent does not push, deploy or submit.
