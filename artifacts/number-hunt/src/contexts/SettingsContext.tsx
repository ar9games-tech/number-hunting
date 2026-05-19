import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { I18nManager, Platform, useColorScheme } from "react-native";

import { setSoundEnabled } from "@/src/services/soundManager";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type Settings,
} from "@/src/storage/storage";

type SettingsContextValue = {
  settings: Settings;
  ready: boolean;
  effectiveScheme: "light" | "dark";
  isRTL: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  resetAll: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState<boolean>(false);
  const systemScheme = useColorScheme();

  // Load persisted settings
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await getSettings();
      if (mounted) {
        setSettings(loaded);
        setReady(true);
        // Prime the sound manager's cached mute flag from disk before
        // anything tries to play.
        setSoundEnabled(loaded.soundOn);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Keep the sound manager's cached mute flag in sync with every
  // change to the persisted setting. The manager also stops any
  // currently-playing audio on a true→false transition.
  useEffect(() => {
    setSoundEnabled(settings.soundOn);
  }, [settings.soundOn]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(next);
    },
    [settings],
  );

  const resetAll = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
  }, []);

  const effectiveScheme: "light" | "dark" = useMemo(() => {
    if (settings.themeMode === "system") {
      return (systemScheme ?? "light") as "light" | "dark";
    }
    return settings.themeMode;
  }, [settings.themeMode, systemScheme]);

  const isRTL = settings.language === "ar";

  // Apply layout direction on web instantly. On native, I18nManager.forceRTL
  // requires a full app reload to take effect — we set it so that next
  // launch picks up the new direction.
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
        document.documentElement.setAttribute("lang", settings.language);
      }
    } else {
      try {
        I18nManager.allowRTL(isRTL);
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.forceRTL(isRTL);
        }
      } catch {
        // I18nManager may be unavailable in some test environments.
      }
    }
  }, [isRTL, settings.language]);

  const value = useMemo(
    () => ({ settings, ready, effectiveScheme, isRTL, update, resetAll }),
    [settings, ready, effectiveScheme, isRTL, update, resetAll],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Consumer hook. Throws if used outside the provider. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

/**
 * Safe variant for components rendered outside the provider tree
 * (e.g. ErrorBoundary fallback). Returns sensible defaults.
 */
export function useSettingsOrDefault(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (ctx) return ctx;
  return {
    settings: DEFAULT_SETTINGS,
    ready: false,
    effectiveScheme: "light",
    isRTL: false,
    update: async () => {},
    resetAll: async () => {},
  };
}
