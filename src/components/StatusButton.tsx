import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, palette, radii } from '@/theme';

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
    height: 100,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ruckedButton: {
    backgroundColor: colors.ruckedFill,
  },
  rickedButton: {
    backgroundColor: colors.rickedFill,
  },
  activeButton: {
    borderWidth: 3,
    borderColor: colors.borderActive,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '500',
  },
  cooldownOverlay: {
    position: 'absolute',
    bottom: 10,
  },
  cooldownText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '500',
  },
});
