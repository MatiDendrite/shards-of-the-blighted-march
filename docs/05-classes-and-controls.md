# 5. Classes, interface and camera

## Distinct ways to fight

The original warrior-style character became one of four selectable classes. Mage, Ninja and Dwarf received distinct character models and three abilities each. Shared class definitions supply the combat system, selection screen, descriptions and illustrated action bar, reducing the chance of an icon or tooltip describing a different ability from the one being used.

| Class | Abilities | Intended role |
| --- | --- | --- |
| Warrior | Cleave, Ground Slam, Battle Cry | Wide melee pressure and a temporary damage boost |
| Mage | Firebolt, Frost Nova, Blink | Ranged attacks, slowing nearby enemies and repositioning |
| Ninja | Shadow Cut, Venom Knives, Smoke Veil | Fast engagements, poison and defensive mobility |
| Dwarf | Forge Blow, Cinder Bomb, Iron Ward | Heavy strikes, delayed area damage and absorption |

All classes use the equipment and progression systems. Switching class in a settlement preserves the journey and is not a way to refill resources or discard active combat effects. A fresh journey has its own class-selection step, allowing the player to choose before confirming the reset.

## Balancing mechanics, not only damage totals

Balance checks examined how abilities interacted with equipment, targets and timing. Venom Knives were adjusted so multiple knives do not repeatedly multiply the weapon bonus against the same target. The Mage gained a genuine ranged basic attack with travel time and obstacle collision, rather than relying on a melee hit beneath a ranged appearance.

Cinder Bomb's landing point became a deliberate aim choice. Desktop input selects a ground position, while touch can assist with a nearby target. Once the throw is committed, its target position stays fixed instead of moving with the cursor. Defensive skills and enemy interruption rules also have explicit tests.

These changes establish distinct mechanics and guard against specific exploits. They do not imply that every class produces identical results in every encounter; positioning, recovery time, range and defensive tools remain part of the trade-off.

## An interface that explains the game

The lower character dock groups health, stamina, experience and actions. Equipment portraits show what an item looks like, and the skill bar uses twelve ability illustrations rather than only numbered buttons. Class descriptions, cooldowns and costs provide context for those images.

Inventory, journal and atlas panels each have a separate purpose. Their desktop and touch layouts are checked alongside the game view so a useful world feature does not become inaccessible on a smaller screen.

## Camera changes driven by playtesting

Camera rotation was added without making the view depend on the character's facing. An intermediate movement scheme was revised after feedback: the final arrangement restores camera-relative movement while retaining independent orbit, tilt, zoom and reset controls.

Gate clearance required a separate fix. A broad bound around an arch could pull the camera toward the character even while the player passed through the open centre. Compound obstacle bounds distinguish supports and raised masonry, preserving clearance through the opening while still keeping the camera out of solid scenery.

## Class-specific movement and attack poses

After the character and town-cast rebuilds, animation became a separate visual stage for all four classes. The Warrior uses broad, deliberate swings; the Mage casts with his free hand while retaining his equipped weapon; the Ninja has a lower guard and compact throwing gestures; and the Dwarf combines a wider stance, shorter steps and weighted preparation for heavy blows. Each of the twelve class abilities has authored preparation, release and recovery poses. Sword combinations, axe attacks and spear thrusts retain their weapon identities.

Locomotion samples actual travelled distance rather than held movement input. A blocked character therefore stops advancing the step cycle. Two-bone leg posing keeps the soles level, with a planted part of each stride and a lifted return. Step lengths account for the different model scales, including sideways movement by the wider Dwarf. Starting and stopping blend into the stance, while turns add restrained upper-body lean. This is local, procedural foot placement, not terrain-aware full-body motion capture or root-motion-driven movement.

Dodges retain their original direction, travel distance and protection window. Each class has its own crouch depth, lean and guard. Head and shoulder positions follow the torso's rotation so that the separate model joints remain connected. Equipped weapons attach to the forearm at the authored grip, allowing elbow movement without leaving the weapon behind. The accepted meshes, materials and geometry budgets are unchanged.

Combat rules remain authoritative: melee pose changes occur during the existing attack windows, and one-shot spell, throw and buff release gestures finish at the activation boundary. Visual motion does not spend resources, apply damage, choose destinations or modify saves. Paused frames repeat the same pose, and class changes, travel, death and interrupted actions cannot retain stale visual momentum.

Verification covers planted-foot drift, forward/backward/sideways movement, directional dodges, all class abilities and weapon combinations, grip alignment, pose recovery and unchanged combat outcomes. Pose strips compare the runtime character assembly at explicit ages. Separate keyboard and emulated-touch checks exercise movement, stopping, dodging, class selection, abilities, portraits and reloads. These checks do not claim a physical-device frame rate.

## Implementation pointers

- [Class definitions](../game/src/class-data.js), [class combat](../game/src/class-combat.js) and [balance tests](../tools/class-balance.test.mjs).
- [Item portraits](../game/src/item-portraits.js) and [class interface](../game/src/class-view.js).
- [Camera orbit](../game/src/camera-orbit.js), [camera obstacles](../game/src/camera-obstacles.js) and [journey/camera tests](../tools/journey-camera.test.mjs).
- [Character motion](../game/src/combat-motion.js), [locomotion](../game/src/hero-locomotion.js), [action poses](../game/src/hero-actions.js) and [weapon grips](../game/src/hero-equipment.js).
- [Motion checks](../tools/hero-motion.test.mjs), [pose comparisons](../tools/motion-review.mjs) and [keyboard/touch movement checks](../tools/motion-playtest.mjs).

[Back to development stages](README.md)

## Spell and impact effects

Once poses matched each ability, a dedicated [spell effect layer](../game/src/spell-vfx.js) gave every ability a readable visual signature. Melee swings leave sweeping crescent trails tinted by weapon or class, with combo finishers drawn wider and warmer. Firebolts carry a flame trail and burst into fire, embers and smoke. Frost Nova raises a ring of faceted ice spikes. Blink leaves a violet streak between its two endpoints, Smoke Veil surrounds the Ninja with drifting puffs and Cinder Bombs spark on their fuse before a fiery blast. Iron Ward became a rim-lit shell that flares when it absorbs a hit, while poisoned and chilled enemies emit small status particles.

The layer only reads combat events and state; it never decides hits, ranges or timing, and tests confirm that running every ability with and without it produces the same outcome. Its particle textures are generated at start-up, so nothing extra is downloaded. All particles share two draw calls, plus one for flashes, which render without depth testing so a large burst glows over the ground instead of being sliced by it. Pools have fixed capacities, and every effect mesh hides itself when idle, so a quiet scene costs nothing. Fixed-moment review strips render each class's basic attack and three abilities through the real combat view.
