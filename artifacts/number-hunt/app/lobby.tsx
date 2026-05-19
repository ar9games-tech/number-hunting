import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useT } from "@/src/i18n/useT";
import {
  cancelRandomQueue,
  getRoomMeta,
  joinRandomQueue,
  onRandomMatchFound,
  onRandomQueueError,
} from "@/src/net/socketPlaceholder";
import {
  playMatchFound,
  playRandomSearching,
  stopRandomSearching,
} from "@/src/services/soundManager";
import {
  formatPlayerIdentity,
  recordRandomMatchStarted,
  setPendingRandomMatch,
} from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";

export default function MultiplayerLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, ready } = useSettings();
  const { t, isRTL } = useT();
  const [code, setCode] = useState("");
  const bottomPad = (Platform.OS === "web" ? webBottomInset() : insets.bottom) + 24;
  const wd = isRTL ? "rtl" : "ltr";

  const [joining, setJoining] = useState(false);
  // Random matchmaking: modal stays open while we're queued. The same
  // flag also gates the Find Opponent button so a stray double-tap can't
  // enqueue twice.
  const [searching, setSearching] = useState(false);
  // Guard so a randomMatchFound event from a previous (stale) attempt
  // can't navigate us into a room we already left.
  const searchingRef = useRef(false);

  // Online play requires a saved identity — never prompt for a nickname
  // inside the multiplayer flow. Send the user to welcome if it's missing.
  const needsProfile =
    ready && (!settings.hasOnboarded || !settings.playerName.trim());
  useEffect(() => {
    if (needsProfile) {
      router.replace("/welcome");
    }
  }, [needsProfile]);

  const identity = formatPlayerIdentity(settings.playerName, settings.playerSerial);

  // Subscribe to random-match events while mounted. The match-found
  // handler ALWAYS navigates — the server is authoritative, so if it
  // paired us (even in the tiny window between our cancel-tap and the
  // server reading that message), the room exists and we belong in it.
  // The error handler still uses the ref so stale "alreadyQueued"
  // chatter from a previous attempt can't surprise the user.
  useEffect(() => {
    const offFound = onRandomMatchFound(({ code }) => {
      searchingRef.current = false;
      setSearching(false);
      // Cut the search ambience and play the "match found" cue before
      // navigating, so the audio transition lands with the screen.
      stopRandomSearching();
      playMatchFound(settings.soundOn);
      // Mark this upcoming game as a random match so the result screen can
      // attribute a win to the random-match queue (random_win achievement).
      // Set-and-forget: the flag is consumed exactly once on recordWin.
      void setPendingRandomMatch().catch(() => {});
      router.replace({ pathname: "/room", params: { code } });
    });
    const offErr = onRandomQueueError((reason) => {
      if (!searchingRef.current) return;
      const msg =
        reason === "inRoom"
          ? t("lobby.randomErrorInRoom")
          : reason === "noName"
            ? t("lobby.randomErrorNoName")
            : // "alreadyQueued" means the server already has us — keep
              // the modal open and ignore.
              null;
      if (msg) {
        searchingRef.current = false;
        setSearching(false);
        stopRandomSearching();
        Alert.alert(t("lobby.randomErrorTitle"), msg);
      }
    });
    return () => {
      offFound();
      offErr();
    };
  }, [t, settings.soundOn]);

  // If the user navigates away while still queued, pull them back out
  // so we don't strand the server with a stale entry.
  useEffect(() => {
    return () => {
      if (searchingRef.current) {
        searchingRef.current = false;
        cancelRandomQueue();
      }
      // Always stop the search loop on unmount — guards against the
      // sound bleeding into the next screen if navigation happens
      // through some path that doesn't tear down state cleanly.
      stopRandomSearching();
    };
  }, []);

  const handleRandomMatch = () => {
    if (searchingRef.current) return;
    if (!identity) {
      Alert.alert(t("lobby.randomErrorTitle"), t("lobby.randomErrorNoName"));
      return;
    }
    searchingRef.current = true;
    setSearching(true);
    // Start the looping "searching for opponent" ambience; it gets
    // stopped on match-found, cancel, error, or unmount.
    playRandomSearching(settings.soundOn);
    // Bump the random-match-used counter so the "Use Random Match N times"
    // achievements can unlock even if matchmaking is cancelled before a
    // game starts. Non-blocking; failure is non-fatal.
    void recordRandomMatchStarted().catch(() => {});
    joinRandomQueue(identity);
  };

  const handleCancelSearch = () => {
    if (!searchingRef.current) return;
    searchingRef.current = false;
    setSearching(false);
    stopRandomSearching();
    cancelRandomQueue();
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert(t("lobby.invalidCode"), t("lobby.invalidCodeMsg"));
      return;
    }
    setJoining(true);
    try {
      // Probe the room first so we can give a precise error (full / already
      // playing / not found) before the user is dropped into the room.
      const meta = await getRoomMeta(trimmed);
      if (!meta) {
        Alert.alert(t("lobby.notFound"), t("lobby.notFoundMsg"));
        return;
      }
      if (meta.status !== "waiting") {
        Alert.alert(t("lobby.joinStarted"), t("lobby.joinStartedMsg"));
        return;
      }
      if (meta.playerCount >= meta.maxPlayers) {
        Alert.alert(t("lobby.joinFull"), t("lobby.joinFullMsg"));
        return;
      }
      router.push({
        pathname: "/room",
        params: { code: trimmed },
      });
    } catch {
      Alert.alert(t("lobby.notFound"), t("lobby.notFoundMsg"));
    } finally {
      setJoining(false);
    }
  };

  if (needsProfile || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("lobby.title")} />
      {/* ScrollView so all three cards (Create / Join / Random Match)
          remain reachable on short phones — without it the bottom card
          gets clipped behind the home indicator / nav bar. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: bottomPad + 40, flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Show the player's saved identity so they know which name will
            appear to the opponent — no prompt, no edit field here. */}
        <View style={[styles.identityBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <View style={[styles.identityDot, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.identityLabel, { color: colors.mutedForeground, writingDirection: wd }]}>
              {t("lobby.playingAs")}
            </Text>
            <Text style={[styles.identityName, { color: colors.foreground }]} numberOfLines={1}>
              {identity}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="plus-circle" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
            {t("lobby.create")}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("lobby.createDesc")}
          </Text>
          <Button
            title={t("lobby.createBtn")}
            fullWidth
            onPress={() => router.push("/create-room")}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="log-in" size={24} color={colors.accent} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
            {t("lobby.join")}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("lobby.joinDesc")}
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder={t("lobby.codePh")}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
          <Button
            title={joining ? t("lobby.joinBtn") + "…" : t("lobby.joinBtn")}
            fullWidth
            variant="secondary"
            disabled={joining}
            onPress={() => {
              void handleJoin();
            }}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="shuffle" size={24} color={colors.success} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}>
            {t("lobby.random")}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}>
            {t("lobby.randomDesc")}
          </Text>
          <Button
            title={t("lobby.randomBtn")}
            fullWidth
            variant="secondary"
            disabled={searching}
            onPress={handleRandomMatch}
          />
        </View>

        <Text style={[styles.note, { color: colors.mutedForeground, writingDirection: wd, marginTop: 8 }]}>
          {t("lobby.note")}
        </Text>
      </ScrollView>

      {/* Searching modal — stays up until either a match is found (auto
          navigates to /room) or the user taps Cancel Search. */}
      <Modal
        visible={searching}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSearch}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                styles.modalTitle,
                { color: colors.foreground, writingDirection: wd },
              ]}
            >
              {t("lobby.searching")}
            </Text>
            <Text
              style={[
                styles.modalBody,
                { color: colors.mutedForeground, writingDirection: wd },
              ]}
            >
              {t("lobby.searchingDesc")}
            </Text>
            <Button
              title={t("lobby.cancelSearch")}
              fullWidth
              variant="ghost"
              onPress={handleCancelSearch}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  identityBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  identityDot: { width: 8, height: 8, borderRadius: 4 },
  identityLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  identityName: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  card: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 10 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  input: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 6, textAlign: "center",
  },
  note: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 18, paddingHorizontal: 12,
  },
  modalBackdrop: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%", maxWidth: 360, borderWidth: 1, borderRadius: 20,
    padding: 24, alignItems: "center", gap: 14,
  },
  modalTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 4,
  },
  modalBody: {
    fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19,
  },
});
