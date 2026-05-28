import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsProvider, useSettings } from "@/src/contexts/SettingsContext";
import { initializeAds } from "@/src/services/adManager";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { effectiveScheme } = useSettings();
  return (
    <>
      <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="mode" />
        <Stack.Screen name="difficulty" />
        <Stack.Screen name="solo" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="room" />
        <Stack.Screen name="result" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="how-to-play" />
        {/* Developer-only surface for QA-ing AdMob on a real device.
            Gated behind __DEV__ so it's compiled out of production /
            TestFlight release builds — release users can never reach
            this screen even by typing the URL because the route isn't
            registered. The screen file itself can stay; React Native's
            Metro release build strips __DEV__ branches. */}
        {__DEV__ ? <Stack.Screen name="ad-test" /> : null}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize AdMob once at app boot. The native implementation hydrates
  // the adsRemoved entitlement cache and warms an interstitial; the web
  // stub is a no-op so the Replit preview is unaffected. Wrapped in a
  // try/catch via the manager itself — never blocks the UI.
  useEffect(() => {
    void initializeAds();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SettingsProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
