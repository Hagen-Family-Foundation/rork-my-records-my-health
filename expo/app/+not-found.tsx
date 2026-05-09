import { Stack, router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';

export default function NotFoundScreen() {
  const copy = usePhraseSet({
    title: 'Oops!',
    message: "This screen doesn't exist.",
    goHome: 'Go to home screen!',
  });

  return (
    <View style={styles.wrapper}>
      <Stack.Screen options={{ title: copy.title }} />
      <View style={styles.container}>
        <Text style={styles.title}>{copy.message}</Text>
        <TouchableOpacity style={styles.link} onPress={() => router.replace('/')}>
          <Text style={styles.linkText}>{copy.goHome}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
