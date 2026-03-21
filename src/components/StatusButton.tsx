import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, radii, typography } from '@/theme';

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
        isActive && (type === 'rucked' ? styles.ruckedActive : styles.rickedActive),
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
    height: 88,
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
  ruckedActive: {
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
  rickedActive: {
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.subheading,
    fontWeight: '600',
  },
  cooldownOverlay: {
    position: 'absolute',
    bottom: 8,
  },
  cooldownText: {
    color: colors.textInverse,
    ...typography.caption,
    fontWeight: '600',
  },
});
