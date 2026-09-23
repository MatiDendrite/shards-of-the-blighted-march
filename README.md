# Shards of the Blighted March

Single-player dark fantasy RPG for the 404 game jam. The expanded four-region adventure, M atlas, living-world scenery, improved character models, bottom MMO-style character dock and visible ground equipment are in place. Publication remains the user's responsibility.

## Run locally

```sh
npm install
npm start
```

Open http://localhost:4173. Use a local HTTP server, not `file://`. The self-contained playable directory is `game/`. `/preview/` on the development server exercises subpath hosting. Port can be changed with `PORT=4174 npm start`.

The development server listens on all interfaces to allow a phone on the same trusted network to connect to `http://<computer-LAN-IP>:4173`. Use your editor's port forwarding when this workspace is remote. There is no deployment, account, telemetry service or external runtime request.

Desktop: WASD / arrows to move relative to the camera, mouse to aim, hold left click or F for a three-hit combo, Space to dodge, R to cycle sword / axe / spear, 1 / 2 / 3 for Cleave / Ground Slam / Battle Cry. **Hold the right mouse button and drag to orbit/tilt the camera; wheel zooms; C or View below the minimap restores the default camera.** Escape pauses. Mobile: left joystick plus right-side attack, dodge, weapon and skill buttons; attacks assist aiming at nearby targets. **Drag an unobstructed part of the world view to rotate the camera**, including while another finger holds the joystick. View resets the camera. The pause menu has a separate Restore default camera button, render quality, sound and camera-shake toggles; camera reset never restarts the expedition or changes saved progress. The minimap and M atlas stay north-up.

Cleanse the shards in Hearthstead Approach, Thornwood Reach and Ashen Causeway, then defeat the Fallen Warden in his court. Each region has one automatically tracked quest. Clear its shard and all **16 guardians** to unlock the next road: twelve start on the map, and four answer the shard's two waves. Hunt the western/eastern fields, side roads, southern pasture and shard sanctuary; M shows surviving enemies. The HUD and journal show the required kill count. Walk to the northern portal and press **E** to continue. A blue southern portal returns to the previous region, including from an unfinished region when no enemy is nearby. **J** (Journal) only records quests and regional progress; it cannot teleport you. Regions are separate scenes, not a seamless open world. The Warden remains one boss, alternating a gold axe sweep and a violet ground slam, and enraging at half health. Return to the central settlement to recover health. Three weapons and all skills are unlocked; level and equipment improve their effectiveness.

Dodge now bends the knees and ankles, tucks the arms and leans with the direction of escape before recovering. Its 25-stamina cost, 0.34-second movement window and 0.24-second invulnerability are unchanged. Extra patrols grant XP, gold and raider smithing ore; original guards and shards retain their equipment drops. Previously completed eight-guardian regions stay open after loading an older save, without retroactive rewards. Unfinished regions keep their earned kills and loot and gain the new patrols.

Stage 3: walk over glowing drops to collect gold, ore and equipment. **I** opens inventory, **Q** drinks a healing draught, **E** opens Borin's forge when nearby (western side of Hearthstead market). Forge equipment up to +3 or salvage unequipped items; a draught costs 25 gold. Equivalent touch controls are on the right. The bag has 24 slots and the level cap is 8. Equipping affects stats; rarity does not introduce separate armour meshes.

Progress saves automatically to localStorage on this browser and origin. Reload returns you to the current region’s safe ground with equipment, XP, quests, defeated guardians, shard progress and uncollected drops; surviving enemies regain health. Regional loot stays behind when travelling and can be collected on return. Earlier progression saves become the first region of the campaign without losing equipment. Compact-world saves retain their rewards; their uncollected loot is moved once to each region's market to avoid newly placed buildings. There is no cloud sync. Changing browser/origin does not carry progress over. Storage failures are shown in the HUD; unreadable saves are retained rather than silently overwritten. Death loses 10% of gold but preserves earned progress; retry returns to the current region’s safe ground. **Restart expedition** asks before resetting all quests and ground loot while keeping equipment, level and currency. **New journey** asks before resetting all local progress.

Art revision: original generated soil, limestone and fir-needle textures, finer armour/helmet/boots and a folded cape, denser irregular paving and layered alpha-cut branches.

Regional scenery: Hearthstead's lantern avenue, Thornwood's broken winding trail and mossy outcrops, the Causeway's dry road and ruined side courts, and the Warden's circular paved arena use distinct layouts, material palettes and dusk lighting. The expanded regions now have central settlements, western/eastern hunting fields, southern groves and northern sanctuaries linked by an outer trail. Three reference-led constructor assets add houses, stalls and a well. Saved quest progress is preserved while encounter locations move into the larger world.

Approach Alden, Mara or Rowan and press **E** (or the touch prompt) to talk. Mara sells healing draughts and buys spare weapons and armour in every settlement. Choose **Sell equipment**, inspect the quoted price and confirm; equipped loadout items are protected. Borin's forge remains in Hearthstead and upgrades equipment up to +3. **M**, or tapping the HUD minimap, opens the detailed regional atlas: actual building footprints, roads, trees, rocks, NPC services, enemies, loot and your heading. Drag to pan, use the wheel or +/− to zoom, and select Town, Find me or a location. **M / Escape** closes it; gameplay pauses while it is open. **J** keeps the quest journal; gold northern and blue southern portals on M mark physical travel points. Houses are exterior landmarks, not enterable interiors.

## Local verification

The project includes a local Node 22 development dependency because the original environment has Node 18. `npm` scripts use the locally installed executable. Chrome may need system libraries: `npx puppeteer browsers install chrome --install-deps`.

```sh
npm test
npm run test:combat
npm run test:rpg
npm run test:inventory
npm run test:campaign
npm run test:polish
npm run test:dodge
npm run test:camera
npm run test:services
npm run test:balance
npm run test:performance
npm run test:journey:ci
node_modules/node/bin/node tools/journey-balance.mjs
node_modules/node/bin/node tools/polish-playtest.mjs
npm run test:journey
node_modules/node/bin/node tools/campaign-ui.mjs
node_modules/node/bin/node tools/town-ui.mjs
node_modules/node/bin/node tools/town-ui.mjs --mobile
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

`test:journey:ci` drives the actual input, simulation and HTML UI but skips repeated 3D drawing after the first frame; it is not visual playthrough evidence. Full-quality rendering has separate browser checks. Run performance measurements without other heavy browser renders. The local server compresses text transfers; public-host compression and loading time must be checked again after the user publishes. `npm run vendor:three` restores the official minified build of the pinned library, retaining its license.

## Publication — performed by the user

After accepting stage 5, publish the contents of `game/` to your static host, publish this repository with its actual development history, and run the current official jam gate on your public URL and matching commit. Do not publish `node_modules/`, working references or `_artifacts/` as game assets. Complete the official entry template and submit the PR yourself.

The implementation agent does not push, deploy or submit.
