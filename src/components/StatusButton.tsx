import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface StatusButtonProps {
  type: 'rucked' | 'ricked';
  isActive: boolean;
  isDisabled: boolean;
  cooldownSeconds: number;
  onPress: () => void;
}

export default function StatusButton({
  type,
  isActive,
  isDisabled,
  cooldownSeconds,
  onPress,
}: StatusButtonProps) {
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        type === 'rucked' ? styles.ruckedButton : styles.rickedButton,
        isActive && styles.activeButton,
        isDisabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <Text style={styles.buttonText}>
        {type === 'rucked' ? 'Rucked Up' : 'Ricked Up'}
      </Text>
      {cooldownSeconds > 0 && (
        <View style={styles.cooldownOverlay}>
          <Text style={styles.cooldownText}>{formatCooldown(cooldownSeconds)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: 120,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ruckedButton: {
    backgroundColor: '#FF4458',
  },
  rickedButton: {
    backgroundColor: '#9C27B0',
  },
  activeButton: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cooldownOverlay: {
    position: 'absolute',
    bottom: 10,
  },
  cooldownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
