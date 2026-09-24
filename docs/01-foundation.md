# 1. Foundation and art direction

## Starting with a playable place

The first goal was a compact scene in which the character could move and the visual direction could be judged in motion. A settlement, an old gate, lanterns, trees and a corrupted landmark established the contrast between shelter and danger. The project remained a single-player browser game: its RPG-like town and equipment interface did not imply a multiplayer server.

This small foundation gave later work a practical reference. Paths needed enough room for movement, silhouettes needed to read from an elevated camera, and decorative objects needed to behave consistently when the player approached them. Feedback was applied to the local build before the next expansion.

## Constructing the models

The 3D assets were built through the 404 recipe as JavaScript functions using Three.js geometry and operations. Buildings, trees, weapons and characters were assembled from procedural parts rather than imported character or scenery meshes. Character parts also provided the joints used by subsequent animation work.

The initial appearance was deliberately simple enough to evaluate shape, scale and composition. Later iterations refined those same foundations instead of changing the game's identity with each new object. The [candidate collection](../work/candidates/) includes alternative sword profiles, tree constructions, building forms and character assemblies, showing several directions explored during development.

Raster textures and ability illustrations were generated for the project and introduced as separate image assets. They complement the procedural geometry; they do not replace the model constructors.

## Movement and collision

Keyboard and touch input were part of the playable foundation. The world needed to be navigable using both a desktop movement scheme and a phone joystick, without relying on a large screen to avoid scenery.

One early review exposed a concrete omission: lanterns were visible, but their poles did not stop the player. Collision was added so these objects occupied space in gameplay as well as in the rendered scene. This became a recurring concern as the environment grew: adding visual detail also required checking routes, interaction distances and physical boundaries.

The outcome was a navigable scene and a reusable set of procedural assets. That made it possible to introduce combat without first redesigning the entire presentation or movement system.

## Implementation pointers

- [Asset constructors](../game/assets/) and [world assembly](../game/src/world.js).
- [Input handling](../game/src/input.js) and [shared world layout](../game/src/world-map.js).
- [Navigation checks](../tools/navigation.test.mjs) and [model experiments](../work/candidates/).

[Back to development stages](README.md)
