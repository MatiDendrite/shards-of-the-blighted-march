# 3. Progression and the complete journey

## Giving combat lasting rewards

Equipment, experience, gold, ore and healing supplies gave each hunt consequences beyond the current fight. The inventory supports equipping items, inspecting their properties and managing limited space. Level and equipment bonuses feed back into combat rather than existing only as interface labels.

Loot was made visible in the world. Equipment drops show the corresponding object with a highlight, so a weapon can be recognised before collection. If the bag is full, the drop remains available instead of disappearing with part of its reward lost.

The settlement gained practical services. Borin's forge in Hearthstead upgrades equipment using gold and ore and can salvage spare items. Mara buys unequipped equipment and sells healing supplies. Proximity, affordability and equipped-item protection are checked in the gameplay model, not just by disabling interface buttons.

## From one hunt to four regions

The journey now passes through Hearthstead Approach, Thornwood Reach and Ashen Causeway before reaching the Warden's Court. Each region has a tracked objective, and completing one opens the next part of the campaign. The areas are separate scenes rather than a seamless open world.

Travel was moved into the world itself. The player must reach a physical portal and interact with it; the journal explains progress but is not a teleport menu. Return portals allow revisiting earlier areas when travel conditions are safe. This makes routes and settlement placement relevant to the whole journey.

Quest rewards are granted once. Returning to a cleared region or reloading a save must not duplicate experience, money or equipment. Regional encounter state also keeps defeated guardians and uncollected loot associated with the correct area.

## Saving without a backend

Progress is stored locally in the browser. The save contains equipment, progression and campaign state, while restoration rebuilds the active encounter from that data. It is not an account-based or cross-device save service.

Save handling became more important as the game expanded. New patrols and larger layouts could not simply invalidate earlier progress. Compatibility logic preserves completed objectives and rewards, and relocates old drops when later geography makes their original positions inaccessible.

Validation rejects malformed save data, including inconsistent campaign state and duplicate item identifiers. Unreadable saves are protected from automatic replacement until the player deliberately starts a new journey. Storage failures are reported without preventing the game from running.

## Implementation pointers

- [Progression and save handling](../game/src/progression.js), [campaign state](../game/src/campaign.js) and [region definitions](../game/src/campaign-data.js).
- [Ground equipment](../game/src/ground-loot.js) and [inventory presentation](../game/src/rpg-view.js).
- [Progression tests](../tools/progression.test.mjs), [campaign tests](../tools/campaign.test.mjs) and [service tests](../tools/services.test.mjs).

[Back to development stages](README.md)

## Shore fishing

Rivers, the sea, the tarn, bridges and piers are fishing spots. Pressing E beside open water casts a line when no enemy is near; when the float dives the player has a short window to hook the fish, and a missed bite simply waits for the next. Moving, attacking, dodging or an approaching enemy reels the line in. Catches of three rarities — Silver Perch, Rainbow Trout and Golden Carp — go into a saved creel of up to twenty fish and are eaten with G to restore health, smallest first, on their own short cooldown. Older saves without a creel load unchanged.
