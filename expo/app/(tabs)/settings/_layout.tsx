import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";
import { useLocalization } from "@/providers/LocalizationProvider";

export default function SettingsLayout() {
  const { t } = useLocalization();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.text, fontWeight: "600" as const },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('tabs.settings') }} />
    </Stack>
  );
}
