// Centralized translation table. Add a key here and it becomes available
// everywhere via useT(). To add a new language, add another entry to
// `translations` with the same key set.

export type Language = "en" | "ar";

export type TranslationKey =
  // Common
  | "common.cancel"
  | "common.reset"
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
  | "settings.resetProfile"
  | "settings.resetProfileMsg"
  | "settings.appearance"
  | "settings.theme"
  | "settings.themeSystem"
  | "settings.themeLight"
  | "settings.themeDark"
  | "settings.language"
  | "settings.gameplay"
  | "settings.allowLeading"
  | "settings.haptics"
  | "settings.sound"
  | "settings.note"
  | "settings.resetAll"
  | "settings.resetAllConfirm"
  | "settings.rtlNote"
  | "settings.resetRecords"
  | "settings.resetRecordsMsg"
  | "settings.danger"
  | "settings.data"
  // How to Play
  | "howto.title"
  | "howto.goal"
  | "howto.goalText"
  | "howto.feedback"
  | "howto.feedbackText"
  | "howto.examples"
  | "howto.solo"
  | "howto.soloText"
  | "howto.mp"
  | "howto.mpText"
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
  // Achievements screen
  | "ach.title"
  | "ach.progress"
  | "ach.empty"
  | "ach.unlocked"
  | "ach.unlockedOn"
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
  // Misc
  | "misc.noGuesses"
  | "misc.player1"
  | "misc.player2"
  | "misc.host"
  | "misc.guest"
  | "misc.goBack";

const en: Record<TranslationKey, string> = {
  "common.cancel": "Cancel",
  "common.reset": "Reset",
  "common.ok": "OK",
  "common.back": "Back",

  "home.title": "Number Hunt",
  "home.subtitle": "Crack the hidden number\nas fast as you can",
  "home.solo": "Solo",
  "home.multiplayer": "Multiplayer",
  "home.records": "Records",
  "home.howto": "How to Play",
  "home.achievements": "Achievements",
  "home.profile": "Profile",

  "mode.title": "Choose Mode",
  "mode.solo": "Solo",
  "mode.soloDesc": "Race the clock. Beat your best time.",
  "mode.multiplayer": "Multiplayer",
  "mode.mpDesc": "Create or join a room. Play with a friend.",

  "diff.title": "Choose Difficulty",
  "diff.lead": "How long should the hidden number be?",
  "diff.label": "{n}-digit",
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
  "settings.resetProfile": "Reset profile",
  "settings.resetProfileMsg": "Clears your nickname and serial. Your stats and records stay. You'll pick a new nickname next.",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.themeSystem": "System",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.language": "Language",
  "settings.gameplay": "Gameplay",
  "settings.allowLeading": "Allow leading zero",
  "settings.haptics": "Haptic feedback",
  "settings.sound": "Sound effects",
  "settings.note":
    "Sound is a placeholder for a future update. Settings save automatically.",
  "settings.resetAll": "Reset all settings",
  "settings.resetAllConfirm": "This will restore all preferences to their defaults.",
  "settings.rtlNote":
    "Tip: switching language updates the layout direction immediately on web. On a real device, a full app reload may be required for native RTL.",
  "settings.resetRecords": "Reset records",
  "settings.resetRecordsMsg": "Erases best times and online lifetime stats. Your profile and unlocked achievements stay.",
  "settings.danger": "Data",
  "settings.data": "Data",

  "howto.title": "How to Play",
  "howto.goal": "The goal",
  "howto.goalText":
    "A hidden number is chosen with the length you select (2, 3, or 4 digits). Crack it in as few guesses — and as fast — as you can.",
  "howto.feedback": "Feedback",
  "howto.feedbackText":
    "Each guess is rated by how far it is from the hidden number:\n\n• Within range → \"Low\" or \"High\"\n• Far away → \"Too Low\" or \"Too High\"\n• Exact match → \"Correct!\"\n\nRange depends on difficulty: 2-digit ±10, 3-digit ±50, 4-digit ±200. For 3 and 4-digit modes you'll also see how many of your digits appear in the hidden number — but never which ones or where.",
  "howto.examples": "Examples",
  "howto.solo": "Solo Mode",
  "howto.soloText":
    "A timer starts as soon as the round begins. There is no guess limit — beat your best time and earn a record.",
  "howto.mp": "Multiplayer Mode",
  "howto.mpText":
    "Create a room and share the code. Once your friend joins, both of you race privately to guess the same server-chosen number. You only see your own guesses and feedback — the first to crack it wins.",

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

  "welcome.title": "Welcome to Number Hunt",
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

  "misc.noGuesses": "No guesses yet",
  "misc.player1": "Player 1",
  "misc.player2": "Player 2",
  "misc.host": "host",
  "misc.guest": "guest",
  "misc.goBack": "Go back",
};

const ar: Record<TranslationKey, string> = {
  "common.cancel": "إلغاء",
  "common.reset": "إعادة تعيين",
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

  "mode.title": "اختر الوضع",
  "mode.solo": "فردي",
  "mode.soloDesc": "تسابق مع الوقت. اكسر أفضل وقت لك.",
  "mode.multiplayer": "متعدد اللاعبين",
  "mode.mpDesc": "أنشئ غرفة أو انضم إليها. العب مع صديق.",

  "diff.title": "اختر مستوى الصعوبة",
  "diff.lead": "ما طول الرقم المخفي؟",
  "diff.label": "{n} خانات",
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
  "settings.resetProfile": "إعادة تعيين الملف الشخصي",
  "settings.resetProfileMsg": "يمسح اسمك ورقمك التسلسلي. تبقى إحصائياتك وسجلاتك. ستختار اسماً جديداً بعدها.",
  "settings.appearance": "المظهر",
  "settings.theme": "السمة",
  "settings.themeSystem": "النظام",
  "settings.themeLight": "فاتح",
  "settings.themeDark": "داكن",
  "settings.language": "اللغة",
  "settings.gameplay": "اللعب",
  "settings.allowLeading": "السماح بصفر في البداية",
  "settings.haptics": "اهتزاز اللمس",
  "settings.sound": "المؤثرات الصوتية",
  "settings.note": "الصوت محجوز لتحديث مستقبلي. يتم حفظ الإعدادات تلقائياً.",
  "settings.resetAll": "إعادة تعيين كل الإعدادات",
  "settings.resetAllConfirm": "سيؤدي هذا إلى استعادة جميع التفضيلات إلى قيمها الافتراضية.",
  "settings.rtlNote":
    "ملاحظة: يتم تغيير اتجاه التخطيط فوراً على الويب. على الجهاز الفعلي، قد يلزم إعادة تشغيل التطبيق لتطبيق RTL بالكامل.",
  "settings.resetRecords": "إعادة تعيين السجلات",
  "settings.resetRecordsMsg": "يمسح أفضل الأوقات وإحصائيات الأونلاين التراكمية. يبقى ملفك الشخصي وإنجازاتك.",
  "settings.danger": "البيانات",
  "settings.data": "البيانات",

  "howto.title": "طريقة اللعب",
  "howto.goal": "الهدف",
  "howto.goalText":
    "يتم اختيار رقم مخفي بالطول الذي تختاره (2 أو 3 أو 4 خانات). حاول كشفه بأقل عدد من التخمينات وبأسرع وقت ممكن.",
  "howto.feedback": "التغذية الراجعة",
  "howto.feedbackText":
    "يتم تقييم كل تخمين بحسب مدى بعده عن الرقم المخفي:\n\n• ضمن النطاق → \"منخفض\" أو \"مرتفع\"\n• بعيد جداً → \"منخفض جداً\" أو \"مرتفع جداً\"\n• مطابقة تامة → \"صحيح!\"\n\nالنطاق يعتمد على الصعوبة: خانتان ±10، ثلاث ±50، أربع ±200. في وضعَي 3 و4 خانات، يظهر أيضاً عدد الأرقام الصحيحة دون مواقعها.",
  "howto.examples": "أمثلة",
  "howto.solo": "الوضع الفردي",
  "howto.soloText":
    "يبدأ العداد بمجرد بدء الجولة. لا يوجد حد للتخمينات — اكسر أفضل وقت لك واحصل على سجل.",
  "howto.mp": "وضع متعدد اللاعبين",
  "howto.mpText":
    "أنشئ غرفة وشارك الرمز. عندما ينضم صديقك، يتسابق كل منكما بشكل خاص لتخمين الرقم نفسه الذي يختاره الخادم. ترى فقط تخميناتك وتغذيتك الراجعة — والأسرع في كشفه يفوز.",

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

  "misc.noGuesses": "لا توجد تخمينات بعد",
  "misc.player1": "اللاعب 1",
  "misc.player2": "اللاعب 2",
  "misc.host": "المضيف",
  "misc.guest": "الضيف",
  "misc.goBack": "رجوع",
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
