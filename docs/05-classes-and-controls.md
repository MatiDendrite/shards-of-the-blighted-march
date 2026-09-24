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

## Implementation pointers

- [Class definitions](../game/src/class-data.js), [class combat](../game/src/class-combat.js) and [balance tests](../tools/class-balance.test.mjs).
- [Item portraits](../game/src/item-portraits.js) and [class interface](../game/src/class-view.js).
- [Camera orbit](../game/src/camera-orbit.js), [camera obstacles](../game/src/camera-obstacles.js) and [journey/camera tests](../tools/journey-camera.test.mjs).

[Back to development stages](README.md)
