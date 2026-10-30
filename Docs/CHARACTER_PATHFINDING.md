# Character pathfinding (prototype)

The character starts in the command room and automatically patrols between reachable rooms.
Choose **مسیریابی آدمک** in the room tools, then tap a room to send the character there.
The selected destination is shown as a faint route while walking. On arrival the character
displays WORK, REST or IDLE depending on the room type.

- `characters/pathfinding.ts` contains deterministic breadth-first search over the 14-column
  grid, a pure movement model, and the passability rules.
- Horizontal movement may cross excavated corridors or room cells. Unexcavated underground
  cells are blocked. Vertical movement is allowed only between two unoccupied open cells
  (an accessible shaft) or into/out of the command room (its prototype elevator).
  Stacked ordinary rooms cannot be traversed through the ceiling.
- A layout change recomputes the route. Removing or disconnecting the destination cancels
  movement; an unreachable manually selected room produces a message.
- Pause stops simulation updates. Reduced motion finishes reachable movement immediately.
  Residents are currently visual-only; no worker economy or saved resident state is added.

A dedicated elevator/shaft construction system is a separate feature. The prototype
corridor connection rule must be replaced by that system when implemented.
