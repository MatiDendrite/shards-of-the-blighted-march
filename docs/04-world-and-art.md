# 4. World building and visual refinement

## Expanding the town-and-wilderness structure

Feedback on the early areas called for larger, more varied maps. The expansion kept a safe settlement near the centre and added surrounding fields, roads, hunting grounds and ruins. The purpose was to create places to explore and routes between activities, not just increase the distance to the next objective.

Regions gained their own arrangements of landmarks and scenery. Rivers, bridges, cliffs, beaches and a sea-facing coastline gave the player recognisable destinations. Water and rocks also changed where the player could walk, so scenery, navigation and encounter placement had to be checked together.

The regional atlas and minimap use shared world information. The detailed map opened with M exposes routes, landmarks and surviving enemies, making the expanded hunting requirements easier to understand. These maps remain north-up even when the camera rotates.

## Moving beyond flat terrain

The terrain revision introduced hills, graded approaches and raised settlement areas. A shared height field connects the visible ground to character placement, aiming, effects and camera clearance. This avoids treating terrain as decoration while gameplay continues on an unrelated flat plane.

Building sites use level footing areas blended into their surroundings. Adjacent structures need compatible terraces so a visually narrow passage does not become an abrupt, unusable slope. Bridges and water edges similarly require deliberate transitions.

Ground markers, loot and ability effects also need terrain-aware placement. Tests cover height sampling, aiming at slopes, structure footings and effects above elevated ground. Adding hills therefore changed more than the terrain mesh alone.

## Improving surfaces and silhouettes

Several art passes increased detail in roofs, timber frames, plaster, wells, stalls and vegetation. The goal was to improve recognisable construction and material differences from the gameplay camera, while keeping the model generators understandable and bounded.

Water received a richer animated surface and shoreline treatment. Meadows became taller, denser and more responsive, with grass grouped into instanced patches. Distant patches and their finer layers are hidden according to distance to limit unnecessary rendering. Small environmental effects, including chimney smoke, add movement to otherwise static settlement scenery.

Visual density was balanced with performance work: static scenery is batched, repetitive cover is organised into spatial groups, textures are prepared before the first playable frame, and map backgrounds are cached. These techniques reduce repeated work without changing the underlying encounter rules.

## Implementation pointers

- [Geography](../game/src/geography.js), [terrain heights](../game/src/terrain-height.js) and [settlement layout](../game/src/settlement-layout.js).
- [Meadows](../game/src/meadow-view.js), [water and coastline rendering](../game/src/geography-view.js) and [landscape effects](../game/src/landscape-effects.js).
- [Cartography](../game/src/cartography.js), [terrain tests](../tools/terrain.test.mjs) and [surface-detail tests](../tools/surface-detail.test.mjs).

[Back to development stages](README.md)
