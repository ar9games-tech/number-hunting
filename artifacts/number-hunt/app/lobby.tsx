import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
  formatPlayerIdentity,
  recordRandomMatchStarted,
  setPendingRandomMatch,
} from "@/src/storage/storage";
import { webBottomInset } from "@/src/theme/theme";

/**
 * Small reusable card used by the lobby for Create / Join / Random Match.
 * The icon + title + subtitle sit in a single horizontal header so the
 * card stays vertically short — every byte of vertical space matters
 * here because the spec requires all three cards to be visible without
 * scrolling on small phones.
 */
function LobbyCard({
  icon,
  iconColor,
  title,
  subtitle,
  wd,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  wd: "ltr" | "rtl";
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text
            style={[styles.cardTitle, { color: colors.foreground, writingDirection: wd }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.cardSub, { color: colors.mutedForeground, writingDirection: wd }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

export default function MultiplayerLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, ready } = useSettings();
  const { t, isRTL } = useT();
  // `autoRandom=1` is set when the user picks "Play Random Again" on
  // the result screen — auto-trigger matchmaking once the lobby mounts
  // so they don't have to tap Find Opponent themselves.
  const { autoRandom } = useLocalSearchParams<{ autoRandom?: string }>();
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
        Alert.alert(t("lobby.randomErrorTitle"), msg);
      }
    });
    return () => {
      offFound();
      offErr();
    };
  }, [t]);

  // If the user navigates away while still queued, pull them back out
  // so we don't strand the server with a stale entry.
  useEffect(() => {
    return () => {
      if (searchingRef.current) {
        searchingRef.current = false;
        cancelRandomQueue();
      }
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
    // Bump the random-match-used counter so the "Use Random Match N times"
    // achievements can unlock even if matchmaking is cancelled before a
    // game starts. Non-blocking; failure is non-fatal.
    void recordRandomMatchStarted().catch(() => {});
    joinRandomQueue(identity);
  };

  // Auto-start matchmaking once when arriving from "Play Random Again".
  // Guarded by a ref so a re-render (e.g. theme/settings refresh) can't
  // re-fire it, and we clear the URL param after consuming so back-nav
  // doesn't re-trigger.
  const autoRandomFiredRef = useRef(false);
  useEffect(() => {
    if (!ready || needsProfile) return;
    if (autoRandom !== "1") return;
    if (autoRandomFiredRef.current) return;
    if (searchingRef.current) return;
    autoRandomFiredRef.current = true;
    router.setParams({ autoRandom: undefined });
    handleRandomMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, needsProfile, autoRandom]);

  const handleCancelSearch = () => {
    if (!searchingRef.current) return;
    searchingRef.current = false;
    setSearching(false);
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

        {/* Compact three-card layout: each card has a small horizontal
            header (icon + title + subtitle) above its action so all
            three — Create / Join / Random Match — fit above the fold on
            small phones (e.g. iPhone SE 320x568). The ScrollView is
            still present as a safety net for the tiniest devices and
            when font-scaling is enabled. */}
        <LobbyCard
          icon="plus-circle"
          iconColor={colors.primary}
          title={t("lobby.create")}
          subtitle={t("lobby.createDesc")}
          wd={wd}
        >
          <Button
            title={t("lobby.createBtn")}
            fullWidth
            onPress={() => router.push("/create-room")}
          />
        </LobbyCard>

        <LobbyCard
          icon="log-in"
          iconColor={colors.accent}
          title={t("lobby.join")}
          subtitle={t("lobby.joinDesc")}
          wd={wd}
        >
          <View style={styles.joinRow}>
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
              variant="secondary"
              disabled={joining}
              onPress={() => {
                void handleJoin();
              }}
            />
          </View>
        </LobbyCard>

        <LobbyCard
          icon="shuffle"
          iconColor={colors.success}
          title={t("lobby.random")}
          subtitle={t("lobby.randomDesc")}
          wd={wd}
        >
          <Button
            title={t("lobby.randomBtn")}
            fullWidth
            variant="secondary"
            disabled={searching}
            onPress={handleRandomMatch}
          />
        </LobbyCard>

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
  container: { paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  identityBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  identityDot: { width: 8, height: 8, borderRadius: 4 },
  identityLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  identityName: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 1 },
  // Tight padding + small icon wrap so all three cards comfortably fit
  // above the fold on the smallest supported phones.
  card: { padding: 14, borderRadius: 18, borderWidth: 1, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardHeaderText: { flex: 1, flexShrink: 1 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 1 },
  // Code input + Join button live on one row so the Join card stays
  // short — this is what was previously pushing Random Match below
  // the fold on small phones.
  joinRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 4, textAlign: "center",
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
