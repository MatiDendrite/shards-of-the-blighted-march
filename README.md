# Shards of the Blighted March

Local stage-three preview for the 404 game jam. English-language dark fantasy RPG. Stages 1 and 2 were accepted by the user. **Awaiting user acceptance of stage 3: progression and improved art.** The full quest map and boss remain for stage 4.

## Run locally

```sh
npm install
npm start
```

Open http://localhost:4173. Use a local HTTP server, not `file://`. The self-contained playable directory is `game/`. `/preview/` on the development server exercises subpath hosting. Port can be changed with `PORT=4174 npm start`.

The development server listens on all interfaces to allow a phone on the same trusted network to connect to `http://<computer-LAN-IP>:4173`. Use your editor's port forwarding when this workspace is remote. There is no deployment, account, telemetry service or external runtime request.

Desktop: WASD / arrows to move, mouse to aim, hold left click or F for a three-hit combo, Space to dodge, R to cycle sword / axe / spear, 1 / 2 / 3 for Cleave / Ground Slam / Battle Cry. Wheel zooms; Escape pauses. Mobile: left joystick plus right-side attack, dodge, weapon and skill buttons; attacks assist aiming at nearby targets. The pause menu offers encounter restart, render quality, sound and camera-shake toggles.

Defeat the guardians and destroy the violet shard beyond the lanterns. Watch gold attack warnings and leave the violet circle before the shard erupts. Retreat south to safe ground to restore health. Three weapons and all skills are unlocked; level and equipment improve their effectiveness.

Stage 3: walk over glowing drops to collect gold, ore and equipment. **I** opens inventory, **Q** drinks a healing draught, **E** opens Borin's forge when nearby (southwest of the starting lanterns). Forge equipment up to +3 or salvage unequipped items; a draught costs 25 gold. Equivalent touch controls are on the right. The bag has 24 slots and the level cap is 8. Equipping affects stats; rarity does not introduce separate armour meshes.

Progress saves automatically to localStorage on this browser and origin. Reload returns you to safe ground with your equipment, XP, defeated guardians, shard progress and uncollected drops; surviving enemies regain health. There is no cloud sync. Clearing browser storage, changing host/port or using another browser does not carry progress over. Storage failures are shown in the HUD. Unreadable saves are retained, not silently overwritten. Pause → New journey asks before replacing saved progress. Death loses 10% of gold, rounded down, but keeps equipment and XP. Starting another hunt preserves progression and respawns the encounter, discarding uncollected drops; choose Stay in the clearing first if you want to collect them.

Art revision: original generated soil, limestone and fir-needle textures, finer armour/helmet/boots and a folded cape, denser irregular paving and layered alpha-cut branches.

## Local verification

The project includes a local Node 22 development dependency because the original environment has Node 18. `npm` scripts use the locally installed executable. Chrome may need system libraries: `npx puppeteer browsers install chrome --install-deps`.

```sh
npm test
npm run test:combat
npm run test:rpg
npm run test:play
node_modules/node/bin/node tools/rpg-ui.mjs
node_modules/node/bin/node tools/candidates.mjs
node_modules/node/bin/node tools/candidates.mjs gate
node_modules/node/bin/node tools/candidates.mjs pine
node_modules/node/bin/node tools/candidates.mjs wolf
node_modules/node/bin/node tools/candidates.mjs wanderer3
node_modules/node/bin/node tools/candidates.mjs pine3
node_modules/node/bin/node tools/404/ship.mjs game
node_modules/node/bin/node tools/404/jam.mjs http://localhost:4173/ --start='#startb' --hold='#stick' --out=_artifacts/jam-local --commit=<actual-sha>
```

Reports and screenshots are in `_artifacts/`. `test:play` drives real desktop and multitouch input and can take several minutes under software rendering. Candidate groups also include sword, axe, spear and shard. FPS under headless software rendering is not a hardware performance certification. Local jam results do not replace a test of the user's eventual public URL.

## Publication — performed by the user

After accepting stage 5, publish the contents of `game/` to your static host, publish this repository with its actual development history, and run the current official jam gate on your public URL and matching commit. Do not publish `node_modules/`, working references or `_artifacts/` as game assets. Complete the official entry template and submit the PR yourself.

The implementation agent does not push, deploy or submit.
