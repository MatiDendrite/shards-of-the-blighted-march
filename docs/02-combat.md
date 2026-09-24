# 2. Combat and encounter design

## Making the first scene playable as an encounter

Combat turned exploration into a repeatable loop: approach enemies, read an attack, spend stamina, dodge or strike, then recover and collect the reward. Sword, axe and spear provided different attack shapes and timing. Weapon combos and class abilities later built on the same combat model.

Combat state is separated from its visual presentation. The model tracks health, stamina, actions, enemies and encounter events; view and effect modules translate that state into poses, trails, warnings and feedback. Tests can therefore exercise attack timing and damage rules without needing to render every frame of a 3D scene.

Attacks have preparation, active and recovery phases. Animation follows those phases so the visible strike corresponds to the period in which a hit can occur. Enemy warnings likewise need to appear before damage is applied, giving the player a meaningful opportunity to react.

## Dodging and character readability

Dodging was refined after playtesting found the movement visually unconvincing. The updated pose bends the knees, lowers the body, adjusts the arms and leans in the direction of escape. It is driven by simulation age, so pausing or a slow rendered frame does not independently advance the pose.

The visual refinement did not itself change the dodge's gameplay cost or protection window. Keeping these concerns separate allowed animation quality to improve without silently changing encounter difficulty.

Enemy models also needed to remain readable as complete silhouettes. Character visibility and equipment placement received dedicated regression checks alongside combat tests. A correct damage calculation alone would not catch a missing torso or a weapon attached in the wrong place.

## Growing the encounters

The first hunts expanded into patrols across the larger maps. In the current campaign, each of the first three regions requires clearing its shard and all 24 guardians: 20 begin on the map, and four arrive through shard waves. Patrols populate the surrounding fields and side routes, giving exploration a purpose beyond reaching the central objective.

The final region uses a separate boss encounter. The Fallen Warden alternates a sweeping attack and an area slam, with a stronger phase after losing half his health. Warning visibility, dodge opportunities and resistance to interruption are explicit parts of that encounter's tests.

Solid scenery matters in combat as well as movement. Melee and ranged checks cover attacks blocked by obstacles, and later class mechanics use the same world boundaries rather than allowing a mobility skill to bypass the map.

## Implementation pointers

- [Combat model](../game/src/combat-model.js), [animation poses](../game/src/combat-motion.js) and [presentation](../game/src/combat-view.js).
- [Encounter definitions](../game/src/campaign-data.js) and [combat tests](../tools/combat.test.mjs).
- [Dodge checks](../tools/dodge-encounter.test.mjs) and [character regression checks](../tools/actor-regression.mjs).

[Back to development stages](README.md)
