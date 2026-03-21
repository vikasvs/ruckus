import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface ConfigErrorScreenProps {
  missingKeys: string[];
}

export default function ConfigErrorScreen({ missingKeys }: ConfigErrorScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Configuration Required</Text>
        <Text style={styles.subtitle}>
          The app cannot start because required public environment variables are missing.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Missing keys</Text>
          {missingKeys.map((key) => (
            <Text key={key} style={styles.keyItem}>
              • {key}
            </Text>
          ))}
        </View>

        <Text style={styles.instructions}>
          Add these keys to your environment and rebuild the app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#BBBBBB',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    color: '#FF8A80',
    fontSize: 16,
    fontWeight: '700',
  },
  keyItem: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  instructions: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
