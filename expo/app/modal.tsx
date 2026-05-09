import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/components/ScaledText';
import Colors from '@/constants/colors';
import { usePhraseSet } from '@/localization/runtime';

export default function ModalScreen() {
  const copy = usePhraseSet({
    title: 'Modal',
    description: 'This is an example modal with proper fade animation. You can edit it in app/modal.tsx.',
    close: 'Close',
  });

  return (
    <Modal animationType="fade" transparent={true} visible={true} onRequestClose={() => router.back()}>
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.description}>{copy.description}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>{copy.close}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
    color: Colors.text,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
  },
  closeButtonText: {
    color: Colors.white,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
