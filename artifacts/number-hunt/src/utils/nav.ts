import { router } from "expo-router";

/**
 * Reset the navigation stack and land on the Online Multiplayer lobby.
 *
 * Used after "Leave Room" so the post-leave stack is always exactly
 * `[Home, Lobby]` — guaranteeing a single Back press from the lobby
 * returns to Home, regardless of how the user reached the room:
 *   • Home → Mode → Lobby → Create Room → Room → Result
 *   • Home → Mode → Lobby → Join Room → Room → Result
 *   • Home → Mode → Lobby → Random Match → Room → Result
 *   • …including any extra screens introduced by the punishment flow.
 *
 * Implementation: `dismissAll` pops every pushed screen back to the
 * first one in the root Stack (which is the `index` / Home route);
 * then `push("/lobby")` places the lobby on top so back navigation
 * exits to Home, not the app.
 *
 * Plain `router.replace("/lobby")` is intentionally NOT used here — it
 * only swaps the topmost screen, leaving the long Create/Join/Random
 * chain underneath, which is what forces multiple Back presses today.
 */
export function resetToOnlineLobby(): void {
  try {
    router.dismissAll();
  } catch {
    // No-op when there's nothing to dismiss (already at the root).
  }
  router.push("/lobby");
}
