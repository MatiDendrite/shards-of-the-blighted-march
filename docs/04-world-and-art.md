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

## Material study and construction detail

A separate visual study introduced original oak and limewash colour textures in `game/textures/oak-albedo.webp` and `game/textures/limewash-albedo.webp`. These are 1024-pixel WebP images. Tileable normal and roughness maps are generated in code and shared across scenery; the subtle relief is procedural, not measured displacement reconstructed from the colour images.

Roof slate and paving have their own surface treatment instead of sharing the rock colour texture. Individual roof shades and construction shading are stored in vertex colours so that static batching can still combine them. Structural timber posts have bevelled edges, and the roof backing sits below the overlapping shingles. Building footprints, traversal and combat rules are unchanged.

The lighting study keeps one shadow cascade and direct rendering. Balanced uses a 1024-pixel shadow map; High raises it to 2048, subject to device limits, and caps the display pixel ratio at 1.5. Switching quality disposes the old shadow target without rebuilding the world. Fixed-camera comparisons, texture-upload checks and real menu interaction cover these changes. Broader character, vegetation, water and post-processing revisions were left for separate passes.

## Ground cover and shoreline detail

The next environment pass reused the existing images. Ground materials blend at irregular boundaries, with a broad grass sample reducing obvious texture repetition. Moisture depends on both distance to water and terrain elevation, so low banks darken without making nearby elevated ground wet. Fine sand relief fades with distance to limit shimmering.

Small constructor-built ferns, reeds, dune grass and pebbles are placed deterministically around banks and in forest-floor patches. They share geometry and materials through spatially grouped instances, disappear at a bounded distance, and do not introduce collision obstacles. Travel routes and bridge approaches remain clear. Plants near the player shrink below combat warnings, while meadows retain their existing triangle budget with more varied blade widths and colours.

Water keeps the original geometry and collision datum. Broken wash bands and filtered shallow-water highlights add motion without transmission, a second scene render or downloaded textures. These are stylised surface effects, not a fluid simulation.

## Character surfaces and equipment detail

The following pass separated actor materials from scenery treatments. Brushed metal, woven cloth, leather grain and directional fur use shared, periodic 128-pixel colour, normal and roughness maps generated in code. Skin, eyes, teeth and luminous insets keep their own simpler materials. Small baked colour differences distinguish constructed parts without adding shader hooks that would be lost when enemies or inventory portraits are cloned.

All four classes received details inside their existing geometry budgets: the Warrior has chased shoulder plates and a helmet ridge; the Mage carries a bound grimoire and embroidered robe details; the Ninja has lacing, shoulder guards and a sheathed utility blade; the Dwarf has forged helmet ribs, plated gloves and an anvil device. These are cosmetic additions, not usable inventory items or new abilities. The Fallen Warden received inset heraldry and crown vanes, while the wolf gained chest and cheek tufts and a hinged lower jaw.

Pivots at the shoulders let capes and scarf tails move with their trim attached. Their restrained secondary motion, the wolf's jaw and its tail are evaluated from simulation time, so paused frames cannot accumulate movement. This is authored animation, not cloth or fur simulation. Named combat joints, model heights, collision radii, skill timing and damage rules remain unchanged. Rigid pieces still batch within their animated joints, and each class is loaded only when needed.

Verification includes fixed-camera comparisons, original model triangle limits, surface sharing and clone independence, grounded dodge poses, late enemy spawning, and keyboard/touch class selection, casts and inventory portraits. Post-processing and larger animation-system changes remain separate work.

## Character volume prototype

Feedback on the equipment pass identified a more fundamental issue: additional trim did not resolve the simple anatomy and flat clothing. The next iteration therefore rebuilt the Mage as a single-class volume prototype. The other classes retained the preceding designs during that review. Acceptance of the Mage's direction then led to the remaining class rebuilds described below.

Continuous cross-sections shape the torso, tapered sleeves, palms, boots and face. The robe wraps around the legs as two thick, pleated half-shells; an open hood, shoulder cowl and curved mantle have separate inner surfaces. The face includes cheek and eye-socket shaping, a projecting nose, eyelids and a short beard. Bent fingers replace the previous simple grips. A diagonal strap and bound book connect the clothing layers visually.

The model remains constructor-built and stylised, not a scanned or sculpted production character. Its 19,644 triangles remain below the existing 20,000-triangle class limit. Height, named animation joints and gameplay rules are preserved. Surface processing now retains authored cloth-depth colours, and closed mesh seams share averaged normals. Dedicated front, side, back and face views support visual review alongside the existing movement, spell, portrait and save checks.

## Extending the approved volume direction

The Warrior, Ninja and Dwarf now use continuous torso and limb profiles, curved palms with separate bent fingers, and modelled faces beneath their headwear. Inner surfaces and joined edges give skirts, scarves, masks, armour and aprons thickness. Thin trim uses fewer radial segments than fingers and other visible anatomy, keeping the original geometry limits intact. Each generator remains standalone and import-free; none decodes an imported mesh.

The Warrior has a convex cuirass, overlapping shoulder plates, shaped greaves and an open helmet. A split tabard and curved mantle follow their existing animation pivots. The Ninja keeps a narrower silhouette, with a cheek-following mask, curved leather vest, wrapped cuffs and two thick scarf tails. The Dwarf has a broad cuirass, a leather apron that wraps the belly, and continuous tapered beard braids with metal bands. These are still stylised designs and authored secondary motion, not realistic cloth or hair simulation.

The rebuilt models contain 17,916, 18,420 and 18,904 triangles respectively. Their heights remain 1.85, 1.78 and 1.40 metres. Skill rules, equipment effects, collision radii and save formats are unchanged. Raiders inherit the Warrior geometry, making encounter rendering and neutral-pose cloning important regression checks in addition to the player portraits. Fixed-camera reviews include side, back, face, walking and dodge views; keyboard and emulated-touch checks exercise each class's movement, abilities, inventory and reload behaviour.

Dense encounter review exposed the cost of separate detail materials. The rebuilt actors therefore opt into linear-colour baking for compatible metal, skin, eye and leather surfaces. Their base colours move into vertex attributes while physical surface properties stay on the materials, allowing more pieces to share each joint's render batch. Fabric keeps its separate palette so enemy recolouring still distinguishes lining, cloth and trim. Rigid construction pivots for faces and pouches are folded into their parents; actual animation joints remain independent. Colour-equivalence, enemy-tint and batch-count tests protect this optimisation without increasing the scene budgets.

## Settlement cast and enemy silhouettes

The next visual stage separated the town cast from the player classes. Borin wears a fitted leather apron with tools and works a hammer over a small anvil. Mara has a long skirt, shoulder shawl, braids, a ledger and a coin. Alden carries a hooked staff and wears a long robe and cowl. Rowan has a travel vest, backpack, bedroll, bow and compass. These are decorative role identifiers; they do not create new equipment, purchases or abilities.

Their faces, hands, sleeves and garments use shaped cross-sections rather than flat costume panels. A shared standalone constructor builds the five-role cast, including a separate Hollow Raider with a lowered hood, face covering, laced leather jerkin and one scavenged shoulder plate. The raider no longer clones the Warrior. Inventory armour portraits still use the neutral player model, and the accepted player classes and wolf are unchanged.

Borin's work cycle has a slow lift, quick strike and a short rest over the workpiece. Mara inspects her ledger and coin, Alden makes restrained head movements, and Rowan alternates his gaze while holding his compass. Their poses use simulation time and reset to authored transforms on each update. Dialogue, inventory and other pauses therefore freeze the animation without accumulating drift. Role positions, interaction distances, service prices and the blacksmith's availability only in Hearthstead are preserved.

The Fallen Warden keeps his original height and combat rig. A convex cuirass, layered rounded shoulders, tapered greaves, articulated grips and a thick torn mantle replace the flatter armour construction. His free arm and head distinguish sweep and slam preparation. Enemy axes now attach at their actual grip to the forearm, remaining in the palm through the attack poses. Damage windows, warning shapes, collision radii, difficulty and save data are unchanged.

The cast bundle contains 33,652 triangles; the Warden contains 11,228, below his existing 12,000-triangle limit. Static construction pieces merge inside the moving joints. These new costumes also opt into linear-colour baking for fabric, allowing their different cloth colours to share a render batch without recolouring the player assets. Town actors use 15–17 mesh batches each, the raider uses 22 and the Warden uses 29 before attaching his weapon. No new downloaded artwork, lights or post-processing passes are required.

Checks cover role-specific geometry, heights, material colour preservation, independent clones, paused poses, hammer contact and weapon grip alignment. Fixed-camera comparisons show costumes from multiple sides and the Warden's attack preparation. Runtime checks exercise late enemy spawning, forging, selling, reloads, portal travel and keyboard/touch interaction, alongside the existing bounded scene-rendering fixtures. These are functional and rendering checks, not claims about frame rates on physical phones.

## Implementation pointers

- [Geography](../game/src/geography.js), [terrain heights](../game/src/terrain-height.js) and [settlement layout](../game/src/settlement-layout.js).
- [Meadows](../game/src/meadow-view.js), [water and coastline rendering](../game/src/geography-view.js) and [landscape effects](../game/src/landscape-effects.js).
- [Cartography](../game/src/cartography.js), [terrain tests](../tools/terrain.test.mjs) and [surface-detail tests](../tools/surface-detail.test.mjs).
- [Material detail](../game/src/surface-detail.js), [quality profiles](../game/src/visual-quality.js), [material comparisons](../tools/materials-review.mjs) and [quality interaction checks](../tools/visual-quality-playtest.mjs).
- [Ground shading](../game/src/landscape-ground.js), [bank plants](../game/assets/bank_plants.js), [placement and instancing](../game/src/bank-dressing.js) and [environment checks](../tools/environment-detail.test.mjs).
- [Actor surfaces](../game/src/actor-surfaces.js), [secondary motion](../game/src/actor-motion.js), [actor checks](../tools/actor-detail.test.mjs) and [character comparisons](../tools/character-review.mjs).
- [Town cast constructor](../game/assets/marchfolk.js), [NPC loading and motion](../game/src/npc-actors.js), [enemy poses and grips](../game/src/enemy-motion.js), [cast checks](../tools/cast-detail.test.mjs) and [cast comparisons](../tools/cast-review.mjs).

[Back to development stages](README.md)

## A brighter borderland

A later art pass replaced the dusk-blue palette with a clear afternoon. The aerial haze became a light sky blue instead of dark teal, regional hours moved from evening to mid-afternoon, and sunlight became warmer. Grass tints were made livelier and market paving received warm sandstone tones, so distance stays readable and the settlements feel inviting rather than gloomy.

## Enterable market houses

The two houses facing each market square became the Lantern Inn and Hearth House. Their collision keeps a real doorway, and stepping through it hides the exterior to reveal a cutaway room: floorboards and a rug, knee-high walls, a stone hearth with a flickering fire and furniture suited to each building. The static parts of each room are baked by material and a single hearth light follows the occupied room, so interiors add only a few draw calls. Their floors are excluded from grass, flower and scenery placement, and a nearby market stall moved slightly to leave space in front of one door.
