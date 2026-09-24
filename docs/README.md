# How Shards of the Blighted March was built

The project began as a small, playable dark-fantasy scene and grew into a single-player browser RPG. Development followed local, playable iterations: build a feature, inspect it in the game, collect feedback, then refine or extend it. The town-and-wilderness structure remained the centre of the design as combat, progression and the surrounding landscape expanded.

These chapters are a retrospective account written from the implementation and development history. They group related work into readable stages; they are not contemporaneous test reports or a claim that every feature in a chapter was delivered in one iteration.

## Development stages

1. [Foundation and art direction](01-foundation.md) — the first scene, procedural models, movement and collision.
2. [Combat and encounter design](02-combat.md) — weapons, enemies, dodging and readable action.
3. [Progression and the complete journey](03-progression-and-campaign.md) — equipment, saving, services, regional quests and portals.
4. [World building and visual refinement](04-world-and-art.md) — larger maps, landmarks, terrain, water, vegetation and buildings.
5. [Classes, interface and camera](05-classes-and-controls.md) — distinct abilities, balance, equipment presentation and independent camera movement.
6. [Verification and delivery](06-verification.md) — model tests, browser playtests, rendering checks and the limits of each kind of evidence.

## Reading the implementation

The playable application is in [game/](../game/). Its [source modules](../game/src/) separate gameplay state from presentation, while [asset constructors](../game/assets/) build the 3D models. [Alternative constructors](../work/candidates/) preserve examples of model experiments. [Tools](../tools/) contain the local server and automated checks.

The [project README](../README.md) remains the player-facing introduction, with screenshots, controls and startup instructions. These chapters explain development decisions without reproducing private conversations, machine-specific information or raw session logs.
