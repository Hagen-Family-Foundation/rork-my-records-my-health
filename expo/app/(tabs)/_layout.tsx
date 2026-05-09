import { Tabs } from "expo-router";
import { ShieldAlert, FolderOpen, Share2, Settings, Heart } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Platform } from "react-native";

import Colors from "@/constants/colors";
import { useLocalization } from "@/providers/LocalizationProvider";

function EmergencyTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.15, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [pulseAnim, glowAnim]);

  return (
    <View style={emergencyIconStyles.wrapper}>
      <Animated.View
        style={[
          emergencyIconStyles.glowRing,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <ShieldAlert color={focused ? '#DC2626' : '#EF4444'} size={size} />
    </View>
  );
}

const emergencyIconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: 40,
    height: 32,
  },
  glowRing: {
    position: 'absolute' as const,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
  },
});

export default function TabLayout() {
  const { t } = useLocalization();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === 'ios' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          } : {
            elevation: 8,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="(records)"
        options={{
          title: t('tabs.records'),
          tabBarIcon: ({ color, size }) => <FolderOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: t('tabs.emergency'),
          tabBarIcon: ({ size, focused }) => (
            <EmergencyTabIcon color="#DC2626" size={size} focused={focused} />
          ),
          tabBarActiveTintColor: '#DC2626',
          tabBarInactiveTintColor: '#EF4444',
          tabBarLabelStyle: {
            fontWeight: '800' as const,
            letterSpacing: 0.5,
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: t('tabs.share'),
          tabBarIcon: ({ color, size }) => <Share2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
