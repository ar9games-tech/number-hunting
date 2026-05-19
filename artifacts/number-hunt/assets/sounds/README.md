# Number Hunt — Sound Assets

Drop audio files into this directory and wire them up in
`src/services/soundManager.ts` by replacing the corresponding `null`
in the `SOUND_FILES` map with a `require("../../assets/sounds/<file>.mp3")`.

Every sound is **optional**. A missing file is a safe no-op — the UI
will run silently for that event rather than crashing.

## Recommended format

- **Container**: `.mp3` (best compatibility) or `.m4a`
- **Sample rate**: 44.1 kHz
- **Bit rate**: 96–160 kbps mono is plenty for UI SFX
- **Length**: keep one-shots under ~1.5s; the `random_searching` loop
  should be 2–6s and seamless.

Per-sound playback volume is set in `SOUND_VOLUME` inside `soundManager.ts` —
adjust there rather than re-mastering each file.

## General game sounds

| File                      | When it plays                                  |
| ------------------------- | ---------------------------------------------- |
| `tap.mp3`                 | Generic button tap (Button component)          |
| `key.mp3`                 | Numeric keypad press                           |
| `wrong.mp3`               | Incorrect guess feedback                       |
| `correct.mp3`             | Correct guess landed                           |
| `win.mp3`                 | Win screen entrance                            |
| `lose.mp3`                | Lose screen entrance                           |
| `new_record.mp3`          | Personal-best time beaten                      |
| `room_created.mp3`        | After creating a multiplayer room              |
| `player_joined.mp3`       | Opponent appears in the room                   |
| `match_found.mp3`         | Random-match queue paired you with someone     |
| `random_searching.mp3`    | Looping ambience while searching for opponent  |
| `game_start.mp3`          | Countdown / match kickoff                      |
| `rematch.mp3`             | Host triggers a rematch                        |
| `new_match.mp3`           | "Find new opponent" CTA on the result screen   |

## Punishment pack sequence

Played in order during the mystery-pack opening animation. Each stage
auto-stops the previous one (see `stopPackSounds()`), so even if the
animation timing shifts you won't get overlapping cues.

| File                       | Stage                                |
| -------------------------- | ------------------------------------ |
| `pack_activate.mp3`        | 1. Button pressed (soft activation)  |
| `pack_shake.mp3`           | 2. Suspense ticking / shaking        |
| `pack_glow.mp3`            | 3. Glow buildup / rising energy      |
| `punishment_reveal.mp3`    | 4. Dramatic card-reveal hit          |
| `punishment_pack_open.mp3` | Compound opener (legacy single-shot) |
| `punishment_accept.mp3`    | Target accepts the punishment        |
| `punishment_refuse.mp3`    | Target refuses the punishment        |

### Per-card outcome stings

Routed through `playPunishmentOutcome(cardId, soundOn)`.

| File                                | Card                          | Vibe                          |
| ----------------------------------- | ----------------------------- | ----------------------------- |
| `punishment_direct_elim.mp3`        | `directElimination`           | Strong dramatic red-alert     |
| `punishment_vote.mp3`               | `vote`                        | Crowd / voting bell           |
| `punishment_another_chance.mp3`     | `anotherChance`               | Positive reward chime         |
| `punishment_choose_another.mp3`     | `chooseAnother`               | Mischievous / playful sting   |

## Quick wiring example

Inside `src/services/soundManager.ts`:

```ts
const SOUND_FILES: { [K in SoundId]: AudioSource | null } = {
  tap: require("../../assets/sounds/tap.mp3"),
  // ...
};
```

That's it — the existing `play*` functions and the `soundOn` settings
toggle will pick the file up automatically.
