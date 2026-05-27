// Centralized translation table. Add a key here and it becomes available
// everywhere via useT(). To add a new language, add another entry to
// `translations` with the same key set.

export type Language = "en" | "ar";

export type TranslationKey =
  // Common
  | "common.cancel"
  | "common.reset"
  | "common.save"
  | "common.saved"
  | "common.ok"
  | "common.back"
  // Home
  | "home.title"
  | "home.subtitle"
  | "home.solo"
  | "home.multiplayer"
  | "home.records"
  | "home.howto"
  // Mode
  | "mode.title"
  | "mode.solo"
  | "mode.soloDesc"
  | "mode.multiplayer"
  | "mode.mpDesc"
  // Difficulty
  | "diff.title"
  | "diff.lead"
  | "diff.label"
  | "diff.label2"
  | "diff.label3"
  | "diff.label4"
  | "diff.2desc"
  | "diff.3desc"
  | "diff.4desc"
  // Solo
  | "solo.title"
  | "solo.hidden"
  | "solo.history"
  // Lobby
  | "lobby.title"
  | "lobby.create"
  | "lobby.createDesc"
  | "lobby.createBtn"
  | "lobby.join"
  | "lobby.joinDesc"
  | "lobby.joinBtn"
  | "lobby.codePh"
  | "lobby.invalidCode"
  | "lobby.invalidCodeMsg"
  | "lobby.notFound"
  | "lobby.notFoundMsg"
  | "lobby.note"
  | "lobby.playingAs"
  | "lobby.joinFull"
  | "lobby.joinFullMsg"
  | "lobby.joinStarted"
  | "lobby.joinStartedMsg"
  | "lobby.random"
  | "lobby.randomDesc"
  | "lobby.randomBtn"
  | "lobby.searching"
  | "lobby.searchingDesc"
  | "lobby.cancelSearch"
  | "lobby.randomErrorTitle"
  | "lobby.randomErrorInRoom"
  | "lobby.randomErrorNoName"
  // Create room (N-player picker)
  | "create.title"
  | "create.lead"
  | "create.players"
  | "create.playersShort"
  | "create.summary"
  | "create.hint"
  | "create.btn"
  | "create.creating"
  | "create.errorTitle"
  | "create.errorMsg"
  // Room
  | "room.title"
  | "room.waitingOpponent"
  | "room.race"
  | "room.youHost"
  | "room.youGuest"
  | "room.opponentGuesses"
  | "room.shareCode"
  | "room.shareHint"
  | "room.yourGuesses"
  | "room.notFound"
  | "room.returningLobby"
  | "room.closedTitle"
  | "room.closedMsg"
  | "room.you"
  | "room.opponent"
  | "room.waitingForJoin"
  | "room.leave"
  | "room.connectErrorTitle"
  | "room.connectErrorMsg"
  | "room.sendErrorTitle"
  | "room.sendErrorMsg"
  | "room.full"
  | "room.waitingMore"
  | "room.waitingHost"
  | "room.playersCount"
  | "room.players"
  | "room.youSuffix"
  | "room.hostLabel"
  | "room.emptySlot"
  | "room.pickDigits"
  | "room.cantStartYet"
  | "room.digitsShort"
  | "room.unknownWinner"
  | "room.yourTurn"
  | "room.waitingTurn"
  | "room.playersTurn"
  | "room.notYourTurn"
  | "game.errorTitle"
  | "game.errorMsg"
  // Result
  | "result.solo"
  | "result.online"
  | "result.youGotIt"
  | "result.someoneWon"
  | "result.newRecord"
  | "result.hidden"
  | "result.time"
  | "result.guesses"
  | "result.digits"
  | "result.playAgain"
  | "result.viewRecords"
  | "result.home"
  | "result.rematch"
  | "result.leaveRoom"
  | "result.playRandomAgain"
  // Records
  | "records.title"
  | "records.label"
  | "records.guesses"
  | "records.empty"
  | "records.reset"
  | "records.resetTitle"
  | "records.resetMsg"
  | "records.soloSection"
  | "records.onlineSection"
  | "records.onlineLifetime"
  | "records.soloHint"
  | "records.onlineHint"
  // Profile
  | "profile.title"
  | "profile.identity"
  | "profile.onlineStats"
  | "profile.bestSoloTimes"
  | "profile.bestOnlineTimes"
  | "profile.noTime"
  | "profile.viewFullRecords"
  // Settings
  | "settings.title"
  | "settings.profile"
  | "settings.playerName"
  | "settings.playerPh"
  | "settings.serial"
  | "settings.appearance"
  | "settings.theme"
  | "settings.themeSystem"
  | "settings.themeLight"
  | "settings.themeDark"
  | "settings.language"
  | "settings.gameplay"
  | "settings.note"
  | "settings.danger"
  | "settings.data"
  | "settings.reactions"
  | "settings.reactionsOnA11y"
  | "settings.reactionsOffA11y"
  // In-app purchases ("Remove Ads Forever")
  | "iap.section"
  | "iap.removeAdsTitle"
  | "iap.removeAdsBody"
  | "iap.buyCta"
  | "iap.purchased"
  | "iap.processing"
  // Reactions
  | "reactions.openLabel"
  | "reactions.panelTitle"
  | "reactions.emojiSection"
  | "reactions.textSection"
  // How to Play
  | "howto.title"
  | "howto.goal"
  | "howto.goalText"
  | "howto.gameplay.title"
  | "howto.gameplay.b1"
  | "howto.gameplay.b2"
  | "howto.gameplay.b3"
  | "howto.hints.title"
  | "howto.hints.intro"
  | "howto.hints.low"
  | "howto.hints.high"
  | "howto.hints.tooLow"
  | "howto.hints.tooHigh"
  | "howto.hints.rulesTitle"
  | "howto.hints.d2"
  | "howto.hints.d3"
  | "howto.hints.d4"
  | "howto.hints.correctCount"
  | "howto.example.title"
  | "howto.example.correctLabel"
  | "howto.example.guessLabel"
  | "howto.example.feedbackLabel"
  | "howto.example.feedbackBody"
  | "howto.example.note"
  | "howto.win.title"
  | "howto.win.body"
  | "howto.solo"
  | "howto.solo.b1"
  | "howto.solo.b2"
  | "howto.solo.b3"
  | "howto.mp"
  | "howto.mp.b1"
  | "howto.mp.b2"
  | "howto.mp.b3"
  | "howto.pun.section"
  | "howto.pun.intro"
  | "howto.pun.byCount"
  | "howto.pun.count3"
  | "howto.pun.count4"
  | "howto.pun.cardsHeader"
  | "howto.pun.directElim.title"
  | "howto.pun.directElim.body"
  | "howto.pun.forgive.title"
  | "howto.pun.forgive.body"
  | "howto.pun.vote.title"
  | "howto.pun.vote.body"
  | "howto.pun.chooseAnother.title"
  | "howto.pun.chooseAnother.body"
  | "howto.pun.selection.title"
  | "howto.pun.selection.b1"
  | "howto.pun.selection.b2"
  | "howto.pun.redirect.title"
  | "howto.pun.redirect.body"
  | "howto.pun.odds2.title"
  | "howto.pun.odds2.count3"
  | "howto.pun.odds2.count4"
  | "howto.important.title"
  | "howto.important.b1"
  | "howto.important.b2"
  | "howto.important.b3"
  // Feedback labels
  | "fb.correct"
  | "fb.tooHigh"
  | "fb.tooLow"
  | "fb.high"
  | "fb.low"
  | "fb.makeFirst"
  | "fb.correctDigit"
  | "fb.correctDigits"
  // Stats (lifetime aggregates on the Records screen)
  | "stats.overview"
  | "stats.empty"
  | "stats.games"
  | "stats.wins"
  | "stats.losses"
  | "stats.winRate"
  | "stats.currentStreak"
  | "stats.bestStreak"
  | "stats.bestTimes"
  | "stats.avgGuesses"
  | "stats.winsCount"
  | "stats.noWinsYet"
  | "stats.totalGuesses"
  | "stats.avgGuessesAll"
  // Result extras
  | "result.youLost"
  | "result.opponentWon"
  | "result.defeat"
  | "result.newAchievements"
  | "result.achievementsUnlocked"
  | "result.viewAchievements"
  // Punishment cards
  | "punishment.button"
  | "punishment.opening"
  | "punishment.drawnBy"
  | "punishment.accept"
  | "punishment.refuse"
  | "punishment.refused"
  | "punishment.refusedBody"
  | "punishment.alreadyUsed"
  | "punishment.errorTitle"
  | "punishment.notWinnerBody"
  | "punishment.notWonBody"
  | "punishment.close"
  | "punishment.watching"
  | "punishment.pickTarget"
  | "punishment.pickTargetBody"
  | "punishment.targetLabel"
  | "punishment.waitingDecision"
  | "punishment.accepted"
  | "punishment.acceptedBody"
  | "punishment.refusedShort"
  | "punishment.invalidTargetBody"
  | "punishment.notAllowedBody"
  | "punishment.card.directElimination.title"
  | "punishment.card.directElimination.body"
  | "punishment.card.vote.title"
  | "punishment.card.vote.body"
  | "punishment.card.anotherChance.title"
  | "punishment.card.anotherChance.body"
  | "punishment.card.chooseAnother.title"
  | "punishment.card.chooseAnother.body"
  | "punishment.pickAnother"
  | "punishment.pickAnotherBody"
  | "punishment.passToPlayer"
  | "punishment.continue"
  | "punishment.forgivenTitle"
  | "punishment.forgivenBody"
  | "punishment.drawNewCard"
  | "punishment.redirectWaiting"
  | "punishment.redirectYourTurn"
  | "punishment.waitingRedirectSelection"
  // Welcome / first-run nickname
  | "welcome.title"
  | "welcome.subtitle"
  | "welcome.nickname"
  | "welcome.nicknamePh"
  | "welcome.hint"
  | "welcome.continue"
  | "welcome.identityPreview"
  | "welcome.nicknameRequired"
  | "welcome.languageLabel"
  | "welcome.openSettings"
  // Keypad accessibility
  | "keypad.backspace"
  | "keypad.clear"
  // Home
  | "home.achievements"
  | "home.profile"
  | "home.store"
  | "store.title"
  | "store.intro"
  // Achievements screen
  | "ach.title"
  | "ach.progress"
  | "ach.empty"
  | "ach.unlocked"
  | "ach.unlockedOn"
  | "ach.tier.bronze"
  | "ach.tier.silver"
  | "ach.tier.gold"
  | "ach.tier.diamond"
  | "ach.tier.legendary"
  | "ach.first_win.title"
  | "ach.first_win.desc"
  | "ach.online_win.title"
  | "ach.online_win.desc"
  | "ach.streak_5.title"
  | "ach.streak_5.desc"
  | "ach.streak_10.title"
  | "ach.streak_10.desc"
  | "ach.wins_25.title"
  | "ach.wins_25.desc"
  | "ach.wins_100.title"
  | "ach.wins_100.desc"
  | "ach.fast_2.title"
  | "ach.fast_2.desc"
  | "ach.fast_3.title"
  | "ach.fast_3.desc"
  | "ach.fast_4.title"
  | "ach.fast_4.desc"
  | "ach.sniper_3.title"
  | "ach.sniper_3.desc"
  | "ach.sniper_4.title"
  | "ach.sniper_4.desc"
  // New tiered achievements (50-total expansion)
  | "ach.first_solo.title" | "ach.first_solo.desc"
  | "ach.wins_3.title" | "ach.wins_3.desc"
  | "ach.online_wins_3.title" | "ach.online_wins_3.desc"
  | "ach.plays_5.title" | "ach.plays_5.desc"
  | "ach.win_2digit.title" | "ach.win_2digit.desc"
  | "ach.win_3digit.title" | "ach.win_3digit.desc"
  | "ach.guesses_50.title" | "ach.guesses_50.desc"
  | "ach.solo_5.title" | "ach.solo_5.desc"
  | "ach.streak_3.title" | "ach.streak_3.desc"
  | "ach.wins_10.title" | "ach.wins_10.desc"
  | "ach.online_wins_10.title" | "ach.online_wins_10.desc"
  | "ach.win_4digit.title" | "ach.win_4digit.desc"
  | "ach.fast_3_60.title" | "ach.fast_3_60.desc"
  | "ach.guesses_100.title" | "ach.guesses_100.desc"
  | "ach.plays_20.title" | "ach.plays_20.desc"
  | "ach.random_used_1.title" | "ach.random_used_1.desc"
  | "ach.punish_used_1.title" | "ach.punish_used_1.desc"
  | "ach.punish_received_1.title" | "ach.punish_received_1.desc"
  | "ach.online_wins_25.title" | "ach.online_wins_25.desc"
  | "ach.fast_2_5.title" | "ach.fast_2_5.desc"
  | "ach.fast_3_15.title" | "ach.fast_3_15.desc"
  | "ach.random_used_5.title" | "ach.random_used_5.desc"
  | "ach.random_win.title" | "ach.random_win.desc"
  | "ach.plays_50.title" | "ach.plays_50.desc"
  | "ach.guesses_500.title" | "ach.guesses_500.desc"
  | "ach.all_digits.title" | "ach.all_digits.desc"
  | "ach.wins_50.title" | "ach.wins_50.desc"
  | "ach.online_wins_50.title" | "ach.online_wins_50.desc"
  | "ach.fast_4_30.title" | "ach.fast_4_30.desc"
  | "ach.sniper_4_5.title" | "ach.sniper_4_5.desc"
  | "ach.plays_100.title" | "ach.plays_100.desc"
  | "ach.guesses_1000.title" | "ach.guesses_1000.desc"
  | "ach.wins_4plus.title" | "ach.wins_4plus.desc"
  | "ach.random_wins_5.title" | "ach.random_wins_5.desc"
  | "ach.punish_given_5.title" | "ach.punish_given_5.desc"
  | "ach.online_wins_100.title" | "ach.online_wins_100.desc"
  | "ach.streak_15.title" | "ach.streak_15.desc"
  | "ach.fast_4_15.title" | "ach.fast_4_15.desc"
  | "ach.trifecta_25.title" | "ach.trifecta_25.desc"
  // Misc
  | "misc.noGuesses"
  | "misc.player1"
  | "misc.player2"
  | "misc.host"
  | "misc.guest"
  | "misc.goBack"
  // Session (multi-round play)
  | "session.over"
  | "session.winner"
  | "session.youWon"
  | "session.eliminated"
  | "session.youEliminated"
  | "session.round"
  // Vote card
  | "vote.title"
  | "vote.eliminate"
  | "vote.stay"
  | "vote.waiting"
  | "vote.live"
  | "vote.tieBreakTitle"
  | "vote.tieBreakBody"
  | "vote.waitingTieBreak"
  | "vote.resultEliminate"
  | "vote.resultStay"
  | "vote.youVoted"
  // Spectator banner
  | "spectator.banner";

const en: Record<TranslationKey, string> = {
  "common.cancel": "Cancel",
  "common.reset": "Reset",
  "common.save": "Save",
  "common.saved": "Saved",
  "common.ok": "OK",
  "common.back": "Back",

  "home.title": "Number Hunting",
  "home.subtitle": "Crack the hidden number\nas fast as you can",
  "home.solo": "Solo",
  "home.multiplayer": "Multiplayer",
  "home.records": "Records",
  "home.howto": "How to Play",
  "home.achievements": "Achievements",
  "home.profile": "Profile",
  "home.store": "Store",
  "store.title": "Store",
  "store.intro": "Support Number Hunting and enjoy an ad-free experience.",

  "mode.title": "Choose Mode",
  "mode.solo": "Solo",
  "mode.soloDesc": "Race the clock. Beat your best time.",
  "mode.multiplayer": "Multiplayer",
  "mode.mpDesc": "Create or join a room. Play with a friend.",

  "diff.title": "Choose Difficulty",
  "diff.lead": "How long should the hidden number be?",
  "diff.label": "{n}-digit",
  // Per-length labels used by the Solo difficulty picker. EN keeps the
  // simple "N Digits" form; AR uses grammatically correct forms
  // (dual for 2, named for 3/4) instead of the literal "٢ خانات".
  "diff.label2": "2 Digits",
  "diff.label3": "3 Digits",
  "diff.label4": "4 Digits",
  "diff.2desc": "Quick warmup",
  "diff.3desc": "Balanced",
  "diff.4desc": "True challenge",

  "solo.title": "{n}-Digit · Solo",
  "solo.hidden": "HIDDEN NUMBER",
  "solo.history": "HISTORY",

  "lobby.title": "Multiplayer",
  "lobby.create": "Create a Room",
  "lobby.createDesc": "Pick a difficulty, get a code, and share it with a friend.",
  "lobby.createBtn": "Create Room",
  "lobby.join": "Join a Room",
  "lobby.joinDesc": "Enter the 5-character code from the host.",
  "lobby.joinBtn": "Join Room",
  "lobby.codePh": "ABC123",
  "lobby.invalidCode": "Invalid code",
  "lobby.invalidCodeMsg": "Please enter a valid room code.",
  "lobby.playingAs": "PLAYING AS",
  "lobby.joinFull": "Room is full",
  "lobby.joinFullMsg": "That room can't take any more players.",
  "lobby.joinStarted": "Game already started",
  "lobby.joinStartedMsg": "This room has already begun — try a different code.",
  "lobby.random": "Random Match",
  "lobby.randomDesc": "Find an opponent automatically",
  "lobby.randomBtn": "Find Opponent",
  "lobby.searching": "Searching for opponent…",
  "lobby.searchingDesc": "Hang tight — we'll start the game the moment another player joins.",
  "lobby.cancelSearch": "Cancel Search",
  "lobby.randomErrorTitle": "Couldn't start matchmaking",
  "lobby.randomErrorInRoom": "You're already in a room. Leave it before searching for a random match.",
  "lobby.randomErrorNoName": "Set your nickname on the welcome screen before searching.",
  "create.title": "Create Room",
  "create.lead": "How many players will be in the room?",
  "create.players": "{n} players",
  "create.playersShort": "PLAYERS",
  "create.summary": "Room for {n} players",
  "create.hint": "Players join with the room code. The game starts once the room is full and you pick a digit length.",
  "create.btn": "Create Room",
  "create.creating": "Creating…",
  "create.errorTitle": "Couldn't create room",
  "create.errorMsg": "We couldn't reach the server. Check your connection and try again.",
  "lobby.notFound": "Room not found",
  "lobby.notFoundMsg": "Double-check the code with the host.",
  "lobby.note":
    "Both players race to guess a hidden number chosen by the server. The first to get it right wins.",

  "room.title": "Room {code}",
  "room.waitingOpponent": "Waiting for opponent to join…",
  "room.race": "Race! Guess the hidden {n}-digit number",
  "room.youHost": "You · Host",
  "room.youGuest": "You · Guest",
  "room.opponentGuesses": "{name}: {n} guesses",
  "room.shareCode": "SHARE THIS CODE",
  "room.shareHint": "The game starts as soon as your friend joins.",
  "room.yourGuesses": "YOUR GUESSES",
  "room.notFound": "Room not found",
  "room.returningLobby": "Returning to lobby.",
  "room.closedTitle": "Room closed",
  "room.closedMsg": "The other player left the room.",
  "room.you": "YOU",
  "room.opponent": "OPPONENT",
  "room.waitingForJoin": "Waiting for opponent…",
  "room.leave": "Leave room",
  "room.connectErrorTitle": "Couldn't connect",
  "room.connectErrorMsg": "We couldn't reach the room. Check your connection and try again.",
  "room.sendErrorTitle": "Guess not sent",
  "room.sendErrorMsg": "Something blocked that guess. Please try again.",
  "room.full": "Room is full!",
  "room.waitingMore": "Waiting for more players to join…",
  "room.waitingHost": "Waiting for the host to start the game…",
  "room.playersCount": "{n} / {m} players",
  "room.players": "PLAYERS",
  "room.youSuffix": "(you)",
  "room.hostLabel": "HOST",
  "room.emptySlot": "Waiting for player…",
  "room.pickDigits": "PICK A DIGIT LENGTH TO START",
  "room.cantStartYet": "The room isn't full yet.",
  "room.digitsShort": "DIGITS",
  "room.unknownWinner": "A player",
  "room.yourTurn": "Your turn",
  "room.waitingTurn": "Waiting for your turn",
  "room.playersTurn": "{name}'s turn",
  "room.notYourTurn": "Wait for your turn",
  "game.errorTitle": "Couldn't submit guess",
  "game.errorMsg": "That guess couldn't be processed. Please try again.",

  "result.solo": "Solo Result",
  "result.online": "Round Over",
  "result.youGotIt": "You got it!",
  "result.someoneWon": "{name} won!",
  "result.newRecord": "New Record!",
  "result.hidden": "HIDDEN NUMBER",
  "result.time": "Time",
  "result.guesses": "Guesses",
  "result.digits": "Digits",
  "result.playAgain": "Play Again",
  "result.viewRecords": "View Records",
  "result.home": "Home",
  "result.rematch": "Rematch",
  "result.leaveRoom": "Leave Room",
  "result.playRandomAgain": "Play Random Again",

  "records.title": "Records",
  "records.label": "{n}-digit",
  "records.guesses": "{n} guesses",
  "records.empty": "No record yet — play to set one",
  "records.reset": "Reset all records",
  "records.resetTitle": "Reset all records?",
  "records.resetMsg": "This will erase all of your best times.",
  "records.soloSection": "SOLO TIMES",
  "records.onlineSection": "ONLINE TIMES",
  "records.onlineLifetime": "ONLINE LIFETIME STATS",
  "records.soloHint": "Your best solo runs by digit length.",
  "records.onlineHint": "Your best online wins by digit length.",
  "profile.title": "Profile",
  "profile.identity": "IDENTITY",
  "profile.onlineStats": "ONLINE LIFETIME",
  "profile.bestSoloTimes": "BEST SOLO TIMES",
  "profile.bestOnlineTimes": "BEST ONLINE TIMES",
  "profile.noTime": "—",
  "profile.viewFullRecords": "View full records",

  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.playerName": "Player name",
  "settings.playerPh": "Your name",
  "settings.serial": "Serial",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.themeSystem": "System",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.language": "Language",
  "settings.gameplay": "Gameplay",
  "settings.note":
    "Settings save automatically — changes apply instantly.",
  "settings.danger": "Data",
  "settings.data": "Data",
  "settings.reactions": "In-game reactions",
  "settings.reactionsOnA11y": "Reactions on",
  "settings.reactionsOffA11y": "Reactions off",
  "iap.section": "Shop",
  "iap.removeAdsTitle": "Remove Ads Forever",
  "iap.removeAdsBody": "One-time purchase. Removes banner, interstitial, and rewarded ad prompts across the whole app.",
  "iap.buyCta": "Buy {price}",
  "iap.purchased": "✓ Ads removed — thanks for your support!",
  "iap.processing": "Processing…",

  "reactions.openLabel": "Send a reaction",
  "reactions.panelTitle": "Send a reaction",
  "reactions.emojiSection": "Emoji",
  "reactions.textSection": "Quick text",

  "howto.title": "How to Play",
  "howto.goal": "Goal",
  "howto.goalText": "Guess the hidden number before the other players.",

  "howto.gameplay.title": "Gameplay",
  "howto.gameplay.b1": "The system picks a hidden number.",
  "howto.gameplay.b2": "Players take turns guessing.",
  "howto.gameplay.b3":
    "After each guess, you get hints to help you reach the correct number.",

  "howto.hints.title": "Hints",
  "howto.hints.intro": "After each guess, the game tells you one of:",
  "howto.hints.low": "Low",
  "howto.hints.high": "High",
  "howto.hints.tooLow": "Too Low",
  "howto.hints.tooHigh": "Too High",

  "howto.hints.rulesTitle": "How verdicts work",
  "howto.hints.d2":
    "2 digits — difference of 10 or less → High / Low. More than 10 → Too High / Too Low.",
  "howto.hints.d3":
    "3 digits — difference of 50 or less → High / Low. More than 50 → Too High / Too Low.",
  "howto.hints.d4":
    "4 digits — difference of 200 or less → High / Low. More than 200 → Too High / Too Low.",
  "howto.hints.correctCount":
    "The game also shows how many digits in your guess match the hidden number — but never which ones or where.",

  "howto.example.title": "Example",
  "howto.example.correctLabel": "Hidden number",
  "howto.example.guessLabel": "Your guess",
  "howto.example.feedbackLabel": "Feedback",
  "howto.example.feedbackBody":
    "High or Low depending on the number, and shows you have 2 correct digits.",
  "howto.example.note":
    "However, the correct digits are NOT in the correct positions. You must figure out the correct order yourself.",

  "howto.win.title": "How to win",
  "howto.win.body":
    "The first player to guess the full correct number wins the round.",

  "howto.solo": "Solo Mode",
  "howto.solo.b1": "Play against the system.",
  "howto.solo.b2": "Unlimited guesses.",
  "howto.solo.b3": "Try to beat your best time.",

  "howto.mp": "Online Mode",
  "howto.mp.b1": "Play against real players.",
  "howto.mp.b2": "Gameplay is turn-based.",
  "howto.mp.b3": "You can only guess during your turn.",

  "howto.pun.section": "Punishments",
  "howto.pun.intro":
    "Punishments appear only in rooms with 3 or more players.",
  "howto.pun.byCount": "Punishment chances",
  "howto.pun.count3":
    "3 players: Final Elimination 33.3%, Forgiveness 33.3%, Choose Another Player 33.3%",
  "howto.pun.count4":
    "4+ players: Final Elimination 25%, Forgiveness 25%, Vote 25%, Choose Another Player 25%",
  "howto.pun.cardsHeader": "Punishment explanations",
  "howto.pun.directElim.title": "Final Elimination",
  "howto.pun.directElim.body": "The player is removed immediately.",
  "howto.pun.forgive.title": "Forgiveness",
  "howto.pun.forgive.body":
    "The player is forgiven and the next round starts.",
  "howto.pun.vote.title": "Vote",
  "howto.pun.vote.body":
    "Players vote on whether the punished player stays or is eliminated.",
  "howto.pun.chooseAnother.title": "Choose Another Player",
  "howto.pun.chooseAnother.body":
    "The punished player picks someone else to take the punishment instead, then presses the Punishment button to reveal a new punishment.",

  "howto.pun.selection.title": "How a punishment is chosen",
  "howto.pun.selection.b1":
    "After a round ends, the winner picks which player will be punished.",
  "howto.pun.selection.b2": "Then a random punishment is drawn for that player.",

  "howto.pun.redirect.title": "Redirect rule",
  "howto.pun.redirect.body":
    "If the punishment is \u201CChoose Another Player\u201D and the punished player picks someone else, the second punishment draw will not include \u201CChoose Another Player\u201D again.",
  "howto.pun.odds2.title": "Second draw chances after redirect",
  "howto.pun.odds2.count3": "3 players: Final Elimination 50%, Forgiveness 50%",
  "howto.pun.odds2.count4":
    "4+ players: Final Elimination 33.3%, Forgiveness 33.3%, Vote 33.3%",

  "howto.important.title": "Important",
  "howto.important.b1": "Random Match has no punishments.",
  "howto.important.b2": "Next rounds start automatically.",
  "howto.important.b3": "You can send reactions during matches.",

  "fb.correct": "Correct!",
  "fb.tooHigh": "Too High",
  "fb.tooLow": "Too Low",
  "fb.high": "High",
  "fb.low": "Low",
  "fb.makeFirst": "Make your first guess",
  "fb.correctDigit": "{n} correct digit",
  "fb.correctDigits": "{n} correct digits",

  "stats.overview": "LIFETIME STATS",
  "stats.empty": "Finish a game to start tracking your stats.",
  "stats.games": "Games",
  "stats.wins": "Wins",
  "stats.losses": "Losses",
  "stats.winRate": "Win rate",
  "stats.currentStreak": "Current",
  "stats.bestStreak": "Best streak",
  "stats.bestTimes": "BEST TIMES & AVERAGES",
  "stats.avgGuesses": "Avg {n} guesses",
  "stats.winsCount": "{n} wins",
  "stats.noWinsYet": "No wins yet at this length.",
  "stats.totalGuesses": "Total guesses",
  "stats.avgGuessesAll": "Avg guesses",

  "result.youLost": "So close!",
  "result.opponentWon": "{name} cracked it first",
  "result.defeat": "Defeat",
  "result.newAchievements": "NEW UNLOCKS",
  "result.achievementsUnlocked": "{count} Achievements Unlocked",
  "result.viewAchievements": "View",

  "punishment.button": "Punishment",
  "punishment.opening": "Opening pack…",
  "punishment.drawnBy": "Drawn by {name}",
  "punishment.accept": "Accept Punishment",
  "punishment.refuse": "Refuse",
  "punishment.refused": "Direct Elimination",
  "punishment.refusedBody": "Refusing the card means you're eliminated.",
  "punishment.alreadyUsed": "Punishment already used",
  "punishment.errorTitle": "Can't open right now",
  "punishment.notWinnerBody": "Only the winner can draw the punishment card.",
  "punishment.notWonBody": "The match hasn't ended yet.",
  "punishment.close": "Close",
  "punishment.watching": "Watching the punishment reveal…",
  "punishment.pickTarget": "Choose who gets punished",
  "punishment.pickTargetBody": "Pick one opponent. The card is then revealed to everyone.",
  "punishment.targetLabel": "Target: {name}",
  "punishment.waitingDecision": "Waiting for {name} to decide…",
  "punishment.accepted": "Accepted the punishment",
  "punishment.acceptedBody": "{name} accepted the punishment.",
  "punishment.refusedShort": "Refused punishment — Direct elimination",
  "punishment.invalidTargetBody": "That target isn't valid anymore.",
  "punishment.notAllowedBody": "Punishments are only available in 3+ player sessions.",
  "punishment.card.directElimination.title": "Direct Elimination",
  "punishment.card.directElimination.body": "The player is removed immediately.",
  "punishment.card.vote.title": "Vote",
  "punishment.card.vote.body":
    "Players vote on whether the punished player should be eliminated or allowed to stay.",
  "punishment.card.anotherChance.title": "Another Chance",
  "punishment.card.anotherChance.body": "The player is forgiven and gets to play another round.",
  "punishment.card.chooseAnother.title": "Choose Another Player",
  "punishment.card.chooseAnother.body": "Choose another player to receive the punishment instead of you.",
  "punishment.pickAnother": "Pass to another player",
  "punishment.pickAnotherBody": "Pick a different opponent to take the punishment. You can't pick yourself or the winner.",
  "punishment.passToPlayer": "Pass to {name}",
  "punishment.continue": "Continue",
  "punishment.forgivenTitle": "Forgiven",
  "punishment.drawNewCard": "Draw new card",
  "punishment.redirectWaiting": "Waiting for {name} to draw a new card…",
  "punishment.redirectYourTurn": "Your turn — draw a new card for {name}",
  "punishment.waitingRedirectSelection": "Waiting for another player selection",
  "punishment.forgivenBody": "{name} is forgiven and plays another round.",

  "welcome.title": "Welcome to Number Hunting",
  "welcome.subtitle": "Pick a nickname so we can show it next to your scores. You can change it anytime in Settings.",
  "welcome.nickname": "NICKNAME",
  "welcome.nicknamePh": "Your nickname",
  "welcome.hint": "We picked a random one for you — keep it, or type your own.",
  "welcome.continue": "Continue",
  "welcome.identityPreview": "YOUR IDENTITY",
  "welcome.nicknameRequired": "Please enter a nickname to continue.",
  "welcome.languageLabel": "LANGUAGE",
  "welcome.openSettings": "Settings",
  // (Arabic strings for these two keys live in the `ar` table below.)
  "keypad.backspace": "Backspace",
  "keypad.clear": "Clear",

  "ach.title": "Achievements",
  "ach.progress": "PROGRESS",
  "ach.empty": "No badges yet. Win a game to unlock your first.",
  "ach.unlocked": "ACHIEVEMENT UNLOCKED",
  "ach.unlockedOn": "Unlocked {date}",
  "ach.first_win.title": "First Hunt",
  "ach.first_win.desc": "Win your very first game.",
  "ach.online_win.title": "Trash Talker",
  "ach.online_win.desc": "Win a multiplayer round.",
  "ach.streak_5.title": "On Fire",
  "ach.streak_5.desc": "Win 5 games in a row.",
  "ach.streak_10.title": "Unstoppable",
  "ach.streak_10.desc": "Win 10 games in a row.",
  "ach.wins_25.title": "Veteran",
  "ach.wins_25.desc": "Win 25 games in total.",
  "ach.wins_100.title": "Master Hunter",
  "ach.wins_100.desc": "Win 100 games in total.",
  "ach.fast_2.title": "Quick Draw",
  "ach.fast_2.desc": "Crack a 2-digit number in under 15 seconds.",
  "ach.fast_3.title": "Sharp Mind",
  "ach.fast_3.desc": "Crack a 3-digit number in under 30 seconds.",
  "ach.fast_4.title": "Genius",
  "ach.fast_4.desc": "Crack a 4-digit number in under 60 seconds.",
  "ach.sniper_3.title": "Sniper",
  "ach.sniper_3.desc": "Solve a 3-digit round in 5 guesses or fewer.",
  "ach.sniper_4.title": "Eagle Eye",
  "ach.sniper_4.desc": "Solve a 4-digit round in 8 guesses or fewer.",
  "ach.tier.bronze": "Bronze",
  "ach.tier.silver": "Silver",
  "ach.tier.gold": "Gold",
  "ach.tier.diamond": "Diamond",
  "ach.tier.legendary": "Legendary",
  "ach.first_solo.title": "Stepping In",
  "ach.first_solo.desc": "Play your first solo game.",
  "ach.wins_3.title": "Getting Warm",
  "ach.wins_3.desc": "Win 3 games in total.",
  "ach.online_wins_3.title": "Crowd Pleaser",
  "ach.online_wins_3.desc": "Win 3 multiplayer rounds.",
  "ach.plays_5.title": "Apprentice",
  "ach.plays_5.desc": "Play 5 games in total.",
  "ach.win_2digit.title": "Two of a Kind",
  "ach.win_2digit.desc": "Win a 2-digit round.",
  "ach.win_3digit.title": "Three-Track Mind",
  "ach.win_3digit.desc": "Win a 3-digit round.",
  "ach.guesses_50.title": "Number Cruncher",
  "ach.guesses_50.desc": "Make 50 total guesses.",
  "ach.solo_5.title": "Lone Hunter",
  "ach.solo_5.desc": "Play 5 solo games.",
  "ach.streak_3.title": "Hat Trick",
  "ach.streak_3.desc": "Win 3 games in a row.",
  "ach.wins_10.title": "Decathlete",
  "ach.wins_10.desc": "Win 10 games in total.",
  "ach.online_wins_10.title": "Arena Regular",
  "ach.online_wins_10.desc": "Win 10 multiplayer rounds.",
  "ach.win_4digit.title": "Long Code",
  "ach.win_4digit.desc": "Solve a 4-digit number.",
  "ach.fast_3_60.title": "Brisk Solver",
  "ach.fast_3_60.desc": "Crack a 3-digit number in under 60 seconds.",
  "ach.guesses_100.title": "Centurion of Guesses",
  "ach.guesses_100.desc": "Make 100 total guesses.",
  "ach.plays_20.title": "Regular",
  "ach.plays_20.desc": "Play 20 games in total.",
  "ach.random_used_1.title": "Blind Date",
  "ach.random_used_1.desc": "Use Random Match for the first time.",
  "ach.punish_used_1.title": "Judge, Jury",
  "ach.punish_used_1.desc": "Use the punishment feature once.",
  "ach.punish_received_1.title": "Took the Heat",
  "ach.punish_received_1.desc": "Receive a punishment for the first time.",
  "ach.online_wins_25.title": "Arena Veteran",
  "ach.online_wins_25.desc": "Win 25 multiplayer rounds.",
  "ach.fast_2_5.title": "Lightning Fingers",
  "ach.fast_2_5.desc": "Crack a 2-digit number in under 5 seconds.",
  "ach.fast_3_15.title": "Mind Reader",
  "ach.fast_3_15.desc": "Crack a 3-digit number in under 15 seconds.",
  "ach.random_used_5.title": "Roulette",
  "ach.random_used_5.desc": "Use Random Match 5 times.",
  "ach.random_win.title": "Stranger Danger",
  "ach.random_win.desc": "Win a Random Match round.",
  "ach.plays_50.title": "Dedicated",
  "ach.plays_50.desc": "Play 50 games in total.",
  "ach.guesses_500.title": "Half a Thousand",
  "ach.guesses_500.desc": "Make 500 total guesses.",
  "ach.all_digits.title": "Triple Threat",
  "ach.all_digits.desc": "Win at 2-, 3-, and 4-digit difficulty.",
  "ach.wins_50.title": "Half-Century",
  "ach.wins_50.desc": "Win 50 games in total.",
  "ach.online_wins_50.title": "Arena Champion",
  "ach.online_wins_50.desc": "Win 50 multiplayer rounds.",
  "ach.fast_4_30.title": "Blink and Solve",
  "ach.fast_4_30.desc": "Crack a 4-digit number in under 30 seconds.",
  "ach.sniper_4_5.title": "Perfect Shot",
  "ach.sniper_4_5.desc": "Solve a 4-digit round in 5 guesses or fewer.",
  "ach.plays_100.title": "Centurion",
  "ach.plays_100.desc": "Play 100 games in total.",
  "ach.guesses_1000.title": "Guess Machine",
  "ach.guesses_1000.desc": "Make 1,000 total guesses.",
  "ach.wins_4plus.title": "Lions' Share",
  "ach.wins_4plus.desc": "Win a round against 4 or more opponents.",
  "ach.random_wins_5.title": "Bracket Buster",
  "ach.random_wins_5.desc": "Win 5 Random Match rounds.",
  "ach.punish_given_5.title": "Repeat Offender",
  "ach.punish_given_5.desc": "Hand out 5 punishments.",
  "ach.online_wins_100.title": "Arena Legend",
  "ach.online_wins_100.desc": "Win 100 multiplayer rounds.",
  "ach.streak_15.title": "Untouchable",
  "ach.streak_15.desc": "Win 15 games in a row.",
  "ach.fast_4_15.title": "Speed of Thought",
  "ach.fast_4_15.desc": "Crack a 4-digit number in under 15 seconds.",
  "ach.trifecta_25.title": "Trifecta Master",
  "ach.trifecta_25.desc": "Win 25 games at every digit count.",

  "misc.noGuesses": "No guesses yet",
  "misc.player1": "Player 1",
  "misc.player2": "Player 2",
  "misc.host": "host",
  "misc.guest": "guest",
  "misc.goBack": "Go back",

  "session.over": "Session Over",
  "session.winner": "{name} wins the session!",
  "session.youWon": "You won the session!",
  "session.eliminated": "{name} was eliminated",
  "session.youEliminated": "You were eliminated. You can still watch and react.",
  "session.round": "Round {n}",

  "vote.title": "Should {name} be eliminated?",
  "vote.eliminate": "Eliminate",
  "vote.stay": "Stay",
  "vote.waiting": "Waiting for the rest to vote…",
  "vote.live": "{voted} of {total} voted",
  "vote.tieBreakTitle": "Tie — your call",
  "vote.tieBreakBody": "As the winner you decide: eliminate {name} or let them stay?",
  "vote.waitingTieBreak": "Tie — waiting for {name} to decide.",
  "vote.resultEliminate": "Voted out",
  "vote.resultStay": "Stays in",
  "vote.youVoted": "Your vote is in.",

  "spectator.banner": "You're eliminated — spectator only",
};

const ar: Record<TranslationKey, string> = {
  "common.cancel": "إلغاء",
  "common.reset": "إعادة تعيين",
  "common.save": "حفظ",
  "common.saved": "تم الحفظ",
  "common.ok": "حسناً",
  "common.back": "رجوع",

  "home.title": "صيد الأرقام",
  "home.subtitle": "اكتشف الرقم المخفي\nبأسرع ما يمكن",
  "home.solo": "فردي",
  "home.multiplayer": "متعدد اللاعبين",
  "home.records": "السجلات",
  "home.howto": "طريقة اللعب",
  "home.achievements": "الإنجازات",
  "home.profile": "الملف الشخصي",
  "home.store": "المتجر",
  "store.title": "المتجر",
  "store.intro": "ادعم صيد الأرقام واستمتع بتجربة خالية من الإعلانات.",

  "mode.title": "اختر الوضع",
  "mode.solo": "فردي",
  "mode.soloDesc": "تسابق مع الوقت. اكسر أفضل وقت لك.",
  "mode.multiplayer": "متعدد اللاعبين",
  "mode.mpDesc": "أنشئ غرفة أو انضم إليها. العب مع صديق.",

  "diff.title": "اختر مستوى الصعوبة",
  "diff.lead": "ما طول الرقم المخفي؟",
  "diff.label": "{n} خانات",
  "diff.label2": "خانتان",
  "diff.label3": "ثلاث خانات",
  "diff.label4": "أربع خانات",
  "diff.2desc": "إحماء سريع",
  "diff.3desc": "متوازن",
  "diff.4desc": "تحدٍ حقيقي",

  "solo.title": "{n} خانات · فردي",
  "solo.hidden": "الرقم المخفي",
  "solo.history": "السجل",

  "lobby.title": "متعدد اللاعبين",
  "lobby.create": "إنشاء غرفة",
  "lobby.createDesc": "اختر مستوى الصعوبة، احصل على رمز، وشاركه مع صديق.",
  "lobby.createBtn": "إنشاء الغرفة",
  "lobby.join": "الانضمام إلى غرفة",
  "lobby.joinDesc": "أدخل الرمز المكون من 5 أحرف من المضيف.",
  "lobby.joinBtn": "انضم للغرفة",
  "lobby.codePh": "ABC123",
  "lobby.invalidCode": "رمز غير صالح",
  "lobby.invalidCodeMsg": "يرجى إدخال رمز غرفة صالح.",
  "lobby.playingAs": "تلعب باسم",
  "lobby.joinFull": "الغرفة ممتلئة",
  "lobby.joinFullMsg": "لا يمكن لهذه الغرفة استقبال المزيد من اللاعبين.",
  "lobby.joinStarted": "اللعبة بدأت بالفعل",
  "lobby.joinStartedMsg": "هذه الغرفة بدأت اللعبة بالفعل — جرّب رمزاً آخر.",
  "lobby.random": "لعب عشوائي",
  "lobby.randomDesc": "ابحث عن خصم تلقائيًا",
  "lobby.randomBtn": "ابحث عن خصم",
  "lobby.searching": "جاري البحث عن خصم…",
  "lobby.searchingDesc": "انتظر قليلاً — ستبدأ اللعبة فور انضمام لاعب آخر.",
  "lobby.cancelSearch": "إلغاء البحث",
  "lobby.randomErrorTitle": "تعذّر بدء البحث",
  "lobby.randomErrorInRoom": "أنت بالفعل داخل غرفة. غادرها قبل البحث عن لعب عشوائي.",
  "lobby.randomErrorNoName": "اضبط اسمك في شاشة الترحيب قبل البحث.",
  "create.title": "إنشاء غرفة",
  "create.lead": "كم عدد اللاعبين في الغرفة؟",
  "create.players": "{n} لاعبين",
  "create.playersShort": "لاعبون",
  "create.summary": "غرفة لعدد {n} لاعبين",
  "create.hint": "ينضم اللاعبون باستخدام رمز الغرفة. تبدأ اللعبة عند اكتمال الغرفة واختيار عدد الخانات.",
  "create.btn": "إنشاء الغرفة",
  "create.creating": "جاري الإنشاء…",
  "create.errorTitle": "تعذّر إنشاء الغرفة",
  "create.errorMsg": "لم نتمكن من الوصول إلى الخادم. تحقق من اتصالك وحاول مجدداً.",
  "lobby.notFound": "الغرفة غير موجودة",
  "lobby.notFoundMsg": "تأكد من الرمز مع المضيف.",
  "lobby.note":
    "يتسابق اللاعبان لتخمين رقم مخفي يختاره الخادم. أول من يصيبه يفوز.",

  "room.title": "الغرفة {code}",
  "room.waitingOpponent": "بانتظار انضمام الخصم…",
  "room.race": "السباق! خمّن الرقم المخفي المكون من {n} خانات",
  "room.youHost": "أنت · المضيف",
  "room.youGuest": "أنت · الضيف",
  "room.opponentGuesses": "{name}: {n} تخمينات",
  "room.shareCode": "شارك هذا الرمز",
  "room.shareHint": "تبدأ اللعبة فور انضمام صديقك.",
  "room.yourGuesses": "تخميناتك",
  "room.notFound": "الغرفة غير موجودة",
  "room.returningLobby": "العودة إلى الردهة.",
  "room.closedTitle": "أُغلقت الغرفة",
  "room.closedMsg": "غادر اللاعب الآخر الغرفة.",
  "room.you": "أنت",
  "room.opponent": "الخصم",
  "room.waitingForJoin": "بانتظار الخصم…",
  "room.leave": "مغادرة الغرفة",
  "room.connectErrorTitle": "تعذّر الاتصال",
  "room.connectErrorMsg": "لم نتمكن من الوصول إلى الغرفة. تحقق من اتصالك وحاول مجدداً.",
  "room.sendErrorTitle": "لم يُرسل التخمين",
  "room.sendErrorMsg": "حدث ما يمنع إرسال التخمين. حاول مرة أخرى.",
  "room.full": "الغرفة ممتلئة!",
  "room.waitingMore": "بانتظار انضمام المزيد من اللاعبين…",
  "room.waitingHost": "بانتظار بدء المضيف للعبة…",
  "room.playersCount": "{n} / {m} لاعبين",
  "room.players": "اللاعبون",
  "room.youSuffix": "(أنت)",
  "room.hostLabel": "المضيف",
  "room.emptySlot": "بانتظار لاعب…",
  "room.pickDigits": "اختر عدد الخانات لبدء اللعبة",
  "room.cantStartYet": "الغرفة لم تكتمل بعد.",
  "room.digitsShort": "خانات",
  "room.unknownWinner": "أحد اللاعبين",
  "room.yourTurn": "دورك",
  "room.waitingTurn": "انتظر دورك",
  "room.playersTurn": "دور {name}",
  "room.notYourTurn": "انتظر دورك",
  "game.errorTitle": "تعذّر إرسال التخمين",
  "game.errorMsg": "لم نتمكن من معالجة هذا التخمين. حاول مرة أخرى.",

  "result.solo": "النتيجة الفردية",
  "result.online": "انتهت الجولة",
  "result.youGotIt": "أحسنت!",
  "result.someoneWon": "فاز {name}!",
  "result.newRecord": "رقم قياسي جديد!",
  "result.hidden": "الرقم المخفي",
  "result.time": "الوقت",
  "result.guesses": "التخمينات",
  "result.digits": "الخانات",
  "result.playAgain": "العب مرة أخرى",
  "result.viewRecords": "عرض السجلات",
  "result.home": "الرئيسية",
  "result.rematch": "مباراة جديدة",
  "result.leaveRoom": "مغادرة الغرفة",
  "result.playRandomAgain": "العب عشوائيًا مرة أخرى",

  "records.title": "السجلات",
  "records.label": "{n} خانات",
  "records.guesses": "{n} تخمينات",
  "records.empty": "لا يوجد سجل بعد — العب لتسجيل واحد",
  "records.reset": "إعادة تعيين كل السجلات",
  "records.resetTitle": "إعادة تعيين كل السجلات؟",
  "records.resetMsg": "سيؤدي هذا إلى مسح جميع أفضل أوقاتك.",
  "records.soloSection": "أوقات الفردي",
  "records.onlineSection": "أوقات الأونلاين",
  "records.onlineLifetime": "إحصائيات الأونلاين التراكمية",
  "records.soloHint": "أفضل جولاتك الفردية حسب طول الرقم.",
  "records.onlineHint": "أفضل انتصاراتك أونلاين حسب طول الرقم.",
  "profile.title": "الملف الشخصي",
  "profile.identity": "الهوية",
  "profile.onlineStats": "إحصاءات الأونلاين",
  "profile.bestSoloTimes": "أفضل أوقات الفردي",
  "profile.bestOnlineTimes": "أفضل أوقات الأونلاين",
  "profile.noTime": "—",
  "profile.viewFullRecords": "عرض جميع السجلات",

  "settings.title": "الإعدادات",
  "settings.profile": "الملف الشخصي",
  "settings.playerName": "اسم اللاعب",
  "settings.playerPh": "اسمك",
  "settings.serial": "الرقم التسلسلي",
  "settings.appearance": "المظهر",
  "settings.theme": "السمة",
  "settings.themeSystem": "النظام",
  "settings.themeLight": "فاتح",
  "settings.themeDark": "داكن",
  "settings.language": "اللغة",
  "settings.gameplay": "اللعب",
  "settings.note": "يتم حفظ الإعدادات تلقائياً — التغييرات تُطبَّق فوراً.",
  "settings.danger": "البيانات",
  "settings.data": "البيانات",
  "settings.reactions": "ردود الفعل أثناء اللعبة",
  "settings.reactionsOnA11y": "ردود الفعل مفعّلة",
  "settings.reactionsOffA11y": "ردود الفعل متوقفة",
  "iap.section": "المتجر",
  "iap.removeAdsTitle": "إزالة الإعلانات نهائياً",
  "iap.removeAdsBody": "عملية شراء لمرة واحدة. تزيل جميع لافتات الإعلانات والإعلانات البينية وإعلانات المكافآت في التطبيق.",
  "iap.buyCta": "شراء {price}",
  "iap.purchased": "✓ تم إزالة الإعلانات — شكراً لدعمك!",
  "iap.processing": "جارٍ المعالجة…",

  "reactions.openLabel": "أرسل رد فعل",
  "reactions.panelTitle": "أرسل رد فعل",
  "reactions.emojiSection": "إيموجي",
  "reactions.textSection": "ردود سريعة",

  "howto.title": "كيف تلعب؟",
  "howto.goal": "هدف اللعبة",
  "howto.goalText": "قم بتخمين الرقم الصحيح قبل باقي اللاعبين.",

  "howto.gameplay.title": "طريقة اللعب",
  "howto.gameplay.b1": "يقوم النظام باختيار رقم مخفي.",
  "howto.gameplay.b2": "كل لاعب يحاول تخمين الرقم أثناء دوره.",
  "howto.gameplay.b3":
    "بعد كل محاولة ستحصل على تلميحات تساعدك للوصول إلى الرقم الصحيح.",

  "howto.hints.title": "التلميحات",
  "howto.hints.intro": "بعد كتابة الرقم سيظهر لك:",
  "howto.hints.low": "منخفض",
  "howto.hints.high": "مرتفع",
  "howto.hints.tooLow": "منخفض جداً",
  "howto.hints.tooHigh": "مرتفع جداً",

  "howto.hints.rulesTitle": "شرح التلميحات",
  "howto.hints.d2":
    "في خانتين: إذا كان الفرق ١٠ أو أقل → مرتفع / منخفض. وإذا كان أكبر من ١٠ → مرتفع جداً / منخفض جداً.",
  "howto.hints.d3":
    "في ثلاث خانات: إذا كان الفرق ٥٠ أو أقل → مرتفع / منخفض. وإذا كان أكبر من ٥٠ → مرتفع جداً / منخفض جداً.",
  "howto.hints.d4":
    "في أربع خانات: إذا كان الفرق ٢٠٠ أو أقل → مرتفع / منخفض. وإذا كان أكبر من ٢٠٠ → مرتفع جداً / منخفض جداً.",
  "howto.hints.correctCount":
    "اللعبة توضح لك أيضاً كم رقم صحيح موجود داخل تخمينك، لكنها لا توضح أماكن الأرقام الصحيحة — عليك اكتشاف الترتيب بنفسك.",

  "howto.example.title": "مثال",
  "howto.example.correctLabel": "الرقم الصحيح",
  "howto.example.guessLabel": "تخمينك",
  "howto.example.feedbackLabel": "النتيجة",
  "howto.example.feedbackBody":
    "مرتفع أو منخفض حسب الرقم، ويوضح أن لديك رقمين صحيحين.",
  "howto.example.note":
    "لكن الأرقام الصحيحة ليست في أماكنها الصحيحة. عليك اكتشاف الترتيب الصحيح بنفسك.",

  "howto.win.title": "طريقة الفوز",
  "howto.win.body": "أول لاعب يكتب الرقم الصحيح بالكامل يفوز بالجولة.",

  "howto.solo": "اللعب الفردي",
  "howto.solo.b1": "تلعب ضد النظام.",
  "howto.solo.b2": "لا يوجد حد للمحاولات.",
  "howto.solo.b3": "حاول تحقيق أفضل وقت.",

  "howto.mp": "الأون لاين",
  "howto.mp.b1": "تلعب ضد لاعبين حقيقيين.",
  "howto.mp.b2": "اللعب يكون بالأدوار.",
  "howto.mp.b3": "لا يمكنك التخمين إلا عندما يأتي دورك.",

  "howto.pun.section": "العقوبات",
  "howto.pun.intro": "العقوبات تظهر فقط إذا كان عدد اللاعبين ٣ أو أكثر.",
  "howto.pun.byCount": "نسبة ظهور العقوبات",
  "howto.pun.count3":
    "٣ لاعبين: خروج نهائي ٣٣.٣٪، سماح ٣٣.٣٪، اختيار لاعب آخر للعقاب ٣٣.٣٪",
  "howto.pun.count4":
    "٤ لاعبين أو أكثر: خروج نهائي ٢٥٪، سماح ٢٥٪، تصويت ٢٥٪، اختيار لاعب آخر للعقاب ٢٥٪",
  "howto.pun.cardsHeader": "شرح العقوبات",
  "howto.pun.directElim.title": "خروج نهائي",
  "howto.pun.directElim.body": "خروج اللاعب مباشرة.",
  "howto.pun.forgive.title": "سماح",
  "howto.pun.forgive.body": "تتم مسامحة اللاعب وتبدأ الجولة التالية.",
  "howto.pun.vote.title": "تصويت",
  "howto.pun.vote.body":
    "يقوم اللاعبون بالتصويت على خروج اللاعب المعاقَب أو بقائه.",
  "howto.pun.chooseAnother.title": "اختيار لاعب آخر للعقاب",
  "howto.pun.chooseAnother.body":
    "اللاعب المعاقَب يختار لاعبًا آخر ليأخذ العقاب بدلًا منه، ثم يضغط زر العقاب لإظهار عقاب جديد.",

  "howto.pun.selection.title": "طريقة اختيار العقوبة",
  "howto.pun.selection.b1":
    "بعد نهاية الجولة، الفائز هو من يختار اللاعب الذي سيتم معاقبته.",
  "howto.pun.selection.b2": "ثم يتم سحب عقوبة عشوائية لهذا اللاعب.",

  "howto.pun.redirect.title": "ملاحظة",
  "howto.pun.redirect.body":
    "إذا ظهر عقاب اختيار لاعب آخر للعقاب، ثم اختار اللاعب المعاقَب لاعبًا آخر، فلن يظهر هذا العقاب مرة أخرى في السحب الثاني.",
  "howto.pun.odds2.title": "نسبة السحب الثاني",
  "howto.pun.odds2.count3": "٣ لاعبين: خروج نهائي ٥٠٪، سماح ٥٠٪",
  "howto.pun.odds2.count4":
    "٤ لاعبين أو أكثر: خروج نهائي ٣٣.٣٪، سماح ٣٣.٣٪، تصويت ٣٣.٣٪",

  "howto.important.title": "معلومات مهمة",
  "howto.important.b1": "اللعب العشوائي لا يحتوي على عقوبات.",
  "howto.important.b2": "الجولات التالية تبدأ تلقائيًا.",
  "howto.important.b3": "يمكنك إرسال رأكشنات أثناء اللعب.",

  "fb.correct": "صحيح!",
  "fb.tooHigh": "مرتفع جداً",
  "fb.tooLow": "منخفض جداً",
  "fb.high": "مرتفع",
  "fb.low": "منخفض",
  "fb.makeFirst": "ابدأ بأول تخمين",
  "fb.correctDigit": "{n} رقم صحيح",
  "fb.correctDigits": "{n} أرقام صحيحة",

  "stats.overview": "إحصائيات شاملة",
  "stats.empty": "أنهِ مباراة لبدء تتبع إحصائياتك.",
  "stats.games": "المباريات",
  "stats.wins": "الانتصارات",
  "stats.losses": "الهزائم",
  "stats.winRate": "نسبة الفوز",
  "stats.currentStreak": "الحالية",
  "stats.bestStreak": "أفضل سلسلة",
  "stats.bestTimes": "أفضل الأوقات والمعدلات",
  "stats.avgGuesses": "متوسط {n} تخمينات",
  "stats.winsCount": "{n} انتصارات",
  "stats.noWinsYet": "لا توجد انتصارات بعد في هذا الطول.",
  "stats.totalGuesses": "إجمالي التخمينات",
  "stats.avgGuessesAll": "متوسط التخمينات",

  "result.youLost": "كان وشيكاً!",
  "result.opponentWon": "{name} كشفه أولاً",
  "result.defeat": "هزيمة",
  "result.newAchievements": "إنجازات جديدة",
  "result.achievementsUnlocked": "{count} إنجازات مفتوحة",
  "result.viewAchievements": "عرض",

  "punishment.button": "عقاب",
  "punishment.opening": "جاري فتح البطاقة…",
  "punishment.drawnBy": "سحبها {name}",
  "punishment.accept": "أقبل العقاب",
  "punishment.refuse": "أرفض",
  "punishment.refused": "خروج مباشر",
  "punishment.refusedBody": "رفض البطاقة يعني خروجك من اللعبة.",
  "punishment.alreadyUsed": "تم استخدام العقاب",
  "punishment.errorTitle": "تعذّر الفتح الآن",
  "punishment.notWinnerBody": "الفائز فقط يمكنه سحب بطاقة العقاب.",
  "punishment.notWonBody": "لم تنتهِ المباراة بعد.",
  "punishment.close": "إغلاق",
  "punishment.watching": "بانتظار كشف العقاب…",
  "punishment.pickTarget": "اختر من سيُعاقب",
  "punishment.pickTargetBody": "اختر لاعباً خاسراً واحداً، ثم تُكشف البطاقة للجميع.",
  "punishment.targetLabel": "المستهدف: {name}",
  "punishment.waitingDecision": "بانتظار قرار {name}…",
  "punishment.accepted": "قبل العقاب",
  "punishment.acceptedBody": "{name} قبل العقاب.",
  "punishment.refusedShort": "رفض العقاب — خروج مباشر",
  "punishment.invalidTargetBody": "الهدف المحدد لم يعد متاحاً.",
  "punishment.notAllowedBody": "العقابات تتوفر فقط في الجلسات التي تحتوي على 3 لاعبين أو أكثر.",
  "punishment.card.directElimination.title": "خروج مباشر",
  "punishment.card.directElimination.body": "خروج اللاعب مباشرة.",
  "punishment.card.vote.title": "تصويت",
  "punishment.card.vote.body": "يقوم اللاعبون بالتصويت على خروج اللاعب المعاقَب أو بقائه.",
  "punishment.card.anotherChance.title": "فرصة أخرى",
  "punishment.card.anotherChance.body": "تتم مسامحة اللاعب ويلعب جولة أخرى.",
  "punishment.card.chooseAnother.title": "اختار لاعب غيرك",
  "punishment.card.chooseAnother.body": "اختر لاعباً آخر غيرك ليأخذ العقاب بدلاً منك.",
  "punishment.pickAnother": "مرّر العقاب للاعب آخر",
  "punishment.pickAnotherBody": "اختر لاعباً آخر ليأخذ العقاب بدلاً منك. لا يمكنك اختيار نفسك أو الفائز.",
  "punishment.passToPlayer": "مرّر إلى {name}",
  "punishment.continue": "متابعة",
  "punishment.forgivenTitle": "مُسامَح",
  "punishment.drawNewCard": "اسحب بطاقة جديدة",
  "punishment.redirectWaiting": "بانتظار {name} لسحب بطاقة جديدة…",
  "punishment.redirectYourTurn": "دورك — اسحب بطاقة جديدة لـ {name}",
  "punishment.waitingRedirectSelection": "ينتظر اختيار لاعب آخر",
  "punishment.forgivenBody": "{name} تمت مسامحته ويلعب جولة أخرى.",

  "welcome.title": "أهلاً بك في صيد الأرقام",
  "welcome.subtitle": "اختر اسماً مستعاراً ليظهر بجانب نتائجك. يمكنك تغييره لاحقاً من الإعدادات.",
  "welcome.nickname": "الاسم المستعار",
  "welcome.nicknamePh": "اسمك المستعار",
  "welcome.hint": "اخترنا لك اسماً عشوائياً — احتفظ به أو اكتب اسمك.",
  "welcome.continue": "متابعة",
  "welcome.identityPreview": "هويتك",
  "welcome.nicknameRequired": "الرجاء إدخال اسم مستعار للمتابعة.",
  "welcome.languageLabel": "اللغة",
  "welcome.openSettings": "الإعدادات",
  "keypad.backspace": "مسح حرف",
  "keypad.clear": "مسح الكل",

  "ach.title": "الإنجازات",
  "ach.progress": "التقدّم",
  "ach.empty": "لا توجد إنجازات بعد. اربح مباراة لفتح أول إنجاز.",
  "ach.unlocked": "إنجاز جديد",
  "ach.unlockedOn": "فُتح في {date}",
  "ach.first_win.title": "أول صيد",
  "ach.first_win.desc": "اربح أول مباراة لك.",
  "ach.online_win.title": "متحدّي اللاعبين",
  "ach.online_win.desc": "اربح جولة متعدد اللاعبين.",
  "ach.streak_5.title": "مشتعل",
  "ach.streak_5.desc": "اربح 5 مباريات متتالية.",
  "ach.streak_10.title": "لا يُوقَف",
  "ach.streak_10.desc": "اربح 10 مباريات متتالية.",
  "ach.wins_25.title": "محنّك",
  "ach.wins_25.desc": "اربح 25 مباراة في المجموع.",
  "ach.wins_100.title": "صيّاد محترف",
  "ach.wins_100.desc": "اربح 100 مباراة في المجموع.",
  "ach.fast_2.title": "سحب سريع",
  "ach.fast_2.desc": "اكشف رقماً من خانتين في أقل من 15 ثانية.",
  "ach.fast_3.title": "ذهن حاد",
  "ach.fast_3.desc": "اكشف رقماً من 3 خانات في أقل من 30 ثانية.",
  "ach.fast_4.title": "عبقري",
  "ach.fast_4.desc": "اكشف رقماً من 4 خانات في أقل من 60 ثانية.",
  "ach.sniper_3.title": "قنّاص",
  "ach.sniper_3.desc": "حلّ جولة من 3 خانات بـ 5 تخمينات أو أقل.",
  "ach.sniper_4.title": "عين النسر",
  "ach.sniper_4.desc": "حلّ جولة من 4 خانات بـ 8 تخمينات أو أقل.",
  "ach.tier.bronze": "برونزي",
  "ach.tier.silver": "فضي",
  "ach.tier.gold": "ذهبي",
  "ach.tier.diamond": "ألماسي",
  "ach.tier.legendary": "أسطوري",
  "ach.first_solo.title": "البداية",
  "ach.first_solo.desc": "العب أول مباراة فردية.",
  "ach.wins_3.title": "تبدأ الحرارة",
  "ach.wins_3.desc": "اربح 3 مباريات في المجموع.",
  "ach.online_wins_3.title": "محبوب الجمهور",
  "ach.online_wins_3.desc": "اربح 3 جولات متعدد اللاعبين.",
  "ach.plays_5.title": "مبتدئ",
  "ach.plays_5.desc": "العب 5 مباريات في المجموع.",
  "ach.win_2digit.title": "اثنان من نوعهما",
  "ach.win_2digit.desc": "اربح جولة من خانتين.",
  "ach.win_3digit.title": "عقل ثلاثي",
  "ach.win_3digit.desc": "اربح جولة من 3 خانات.",
  "ach.guesses_50.title": "آلة التخمين",
  "ach.guesses_50.desc": "خمّن 50 مرة في المجموع.",
  "ach.solo_5.title": "صياد منفرد",
  "ach.solo_5.desc": "العب 5 مباريات فردية.",
  "ach.streak_3.title": "ثلاثية",
  "ach.streak_3.desc": "اربح 3 مباريات متتالية.",
  "ach.wins_10.title": "عشرة من عشرة",
  "ach.wins_10.desc": "اربح 10 مباريات في المجموع.",
  "ach.online_wins_10.title": "ضيف دائم",
  "ach.online_wins_10.desc": "اربح 10 جولات متعدد اللاعبين.",
  "ach.win_4digit.title": "الرمز الطويل",
  "ach.win_4digit.desc": "حلّ رقماً من 4 خانات.",
  "ach.fast_3_60.title": "حلّال سريع",
  "ach.fast_3_60.desc": "اكشف رقماً من 3 خانات في أقل من 60 ثانية.",
  "ach.guesses_100.title": "مئوي التخمين",
  "ach.guesses_100.desc": "خمّن 100 مرة في المجموع.",
  "ach.plays_20.title": "زبون منتظم",
  "ach.plays_20.desc": "العب 20 مباراة في المجموع.",
  "ach.random_used_1.title": "موعد مفاجئ",
  "ach.random_used_1.desc": "استخدم البحث العشوائي لأول مرة.",
  "ach.punish_used_1.title": "قاضٍ وحاكم",
  "ach.punish_used_1.desc": "استخدم ميزة العقوبة مرة واحدة.",
  "ach.punish_received_1.title": "تحملت العقوبة",
  "ach.punish_received_1.desc": "احصل على عقوبة لأول مرة.",
  "ach.online_wins_25.title": "محنّك الساحة",
  "ach.online_wins_25.desc": "اربح 25 جولة متعدد اللاعبين.",
  "ach.fast_2_5.title": "أصابع البرق",
  "ach.fast_2_5.desc": "اكشف رقماً من خانتين في أقل من 5 ثوانٍ.",
  "ach.fast_3_15.title": "قارئ الأفكار",
  "ach.fast_3_15.desc": "اكشف رقماً من 3 خانات في أقل من 15 ثانية.",
  "ach.random_used_5.title": "روليت",
  "ach.random_used_5.desc": "استخدم البحث العشوائي 5 مرات.",
  "ach.random_win.title": "غريب خطير",
  "ach.random_win.desc": "اربح جولة بحث عشوائي.",
  "ach.plays_50.title": "ملتزم",
  "ach.plays_50.desc": "العب 50 مباراة في المجموع.",
  "ach.guesses_500.title": "نصف ألف",
  "ach.guesses_500.desc": "خمّن 500 مرة في المجموع.",
  "ach.all_digits.title": "ثلاثي التهديد",
  "ach.all_digits.desc": "اربح في صعوبات 2 و3 و4 خانات.",
  "ach.wins_50.title": "نصف قرن",
  "ach.wins_50.desc": "اربح 50 مباراة في المجموع.",
  "ach.online_wins_50.title": "بطل الساحة",
  "ach.online_wins_50.desc": "اربح 50 جولة متعدد اللاعبين.",
  "ach.fast_4_30.title": "لمح وحلّ",
  "ach.fast_4_30.desc": "اكشف رقماً من 4 خانات في أقل من 30 ثانية.",
  "ach.sniper_4_5.title": "إطلاقة مثالية",
  "ach.sniper_4_5.desc": "حلّ جولة من 4 خانات بـ 5 تخمينات أو أقل.",
  "ach.plays_100.title": "المئوي",
  "ach.plays_100.desc": "العب 100 مباراة في المجموع.",
  "ach.guesses_1000.title": "آلة التخمين",
  "ach.guesses_1000.desc": "خمّن 1,000 مرة في المجموع.",
  "ach.wins_4plus.title": "نصيب الأسد",
  "ach.wins_4plus.desc": "اربح جولة ضد 4 خصوم أو أكثر.",
  "ach.random_wins_5.title": "كاسر الأقواس",
  "ach.random_wins_5.desc": "اربح 5 جولات بحث عشوائي.",
  "ach.punish_given_5.title": "معاقب متكرر",
  "ach.punish_given_5.desc": "وزّع 5 عقوبات.",
  "ach.online_wins_100.title": "أسطورة الساحة",
  "ach.online_wins_100.desc": "اربح 100 جولة متعدد اللاعبين.",
  "ach.streak_15.title": "لا يُمَس",
  "ach.streak_15.desc": "اربح 15 مباراة متتالية.",
  "ach.fast_4_15.title": "سرعة الفكر",
  "ach.fast_4_15.desc": "اكشف رقماً من 4 خانات في أقل من 15 ثانية.",
  "ach.trifecta_25.title": "سيد الثلاثية",
  "ach.trifecta_25.desc": "اربح 25 مباراة في كل عدد خانات.",

  "misc.noGuesses": "لا توجد تخمينات بعد",
  "misc.player1": "اللاعب 1",
  "misc.player2": "اللاعب 2",
  "misc.host": "المضيف",
  "misc.guest": "الضيف",
  "misc.goBack": "رجوع",

  "session.over": "انتهت الجلسة",
  "session.winner": "{name} يفوز بالجلسة!",
  "session.youWon": "لقد فزت بالجلسة!",
  "session.eliminated": "تم إقصاء {name}",
  "session.youEliminated": "تم إقصاؤك. لا يزال بإمكانك المشاهدة والتفاعل.",
  "session.round": "الجولة {n}",

  "vote.title": "هل يجب إقصاء {name}؟",
  "vote.eliminate": "خروج",
  "vote.stay": "بقاء",
  "vote.waiting": "بانتظار تصويت البقية…",
  "vote.live": "{voted} من {total} صوّتوا",
  "vote.tieBreakTitle": "تعادل — القرار لك",
  "vote.tieBreakBody": "بصفتك الفائز، أنت تقرر: إقصاء {name} أم إبقاؤه؟",
  "vote.waitingTieBreak": "تعادل — بانتظار قرار {name}.",
  "vote.resultEliminate": "تم الإقصاء",
  "vote.resultStay": "يبقى",
  "vote.youVoted": "تم تسجيل صوتك.",

  "spectator.banner": "تم إقصاؤك — مشاهد فقط",
};

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  ar,
};

/** Simple {placeholder} interpolation. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v == null ? `{${k}}` : String(v);
  });
}

/** Languages where the script flows right-to-left. */
export const RTL_LANGUAGES: ReadonlySet<Language> = new Set(["ar"]);
