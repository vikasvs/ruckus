import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, palette, radii, typography } from '@/theme';

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
      <Text style={[styles.buttonText, isActive && styles.activeText]}>
        {type === 'rucked' ? 'Rucked Up' : 'Ricked Up'}
      </Text>
      {cooldownSeconds > 0 && (
        <View style={styles.cooldownOverlay}>
          <Text style={[styles.cooldownText, isActive && styles.activeText]}>
            {formatCooldown(cooldownSeconds)}
          </Text>
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
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surface,
  },
  ruckedButton: {
    // Parallel charcoal/dark style — not the old red
    backgroundColor: palette.neutral[800],
  },
  rickedButton: {
    // Parallel blue accent
    backgroundColor: palette.feedback.info.base,
  },
  activeButton: {
    borderWidth: 3,
    borderColor: colors.accentActive,
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.subheading,
    fontWeight: '600',
  },
  activeText: {
    // keep white on active
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
