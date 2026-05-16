import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

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
  update: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState<boolean>(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await getSettings();
      if (mounted) {
        setSettings(loaded);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(next);
    },
    [settings],
  );

  const effectiveScheme: "light" | "dark" = useMemo(() => {
    if (settings.themeMode === "system") return (systemScheme ?? "light") as "light" | "dark";
    return settings.themeMode;
  }, [settings.themeMode, systemScheme]);

  const value = useMemo(
    () => ({ settings, ready, effectiveScheme, update }),
    [settings, ready, effectiveScheme, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
