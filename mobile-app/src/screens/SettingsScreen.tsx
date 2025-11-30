import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from './HomeScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({navigation}) => {
  const showInfo = () => {
    Alert.alert(
      'SkillSync Mobile',
      'Version 1.0.0\n\nOffline-first learning platform built with React Native.',
    );
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>Configuration & Info</Text>
        </View>

        {/* Navigation Test */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Navigation Test</Text>
          <Text style={styles.cardText}>
            You successfully navigated to the Settings screen!
          </Text>
          <TouchableOpacity style={styles.button} onPress={goBack}>
            <Text style={styles.buttonText}>← Go Back to Home</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Framework</Text>
            <Text style={styles.infoValue}>React Native</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Navigation</Text>
            <Text style={styles.infoValueSuccess}>Working ✅</Text>
          </View>
          <TouchableOpacity style={styles.infoButton} onPress={showInfo}>
            <Text style={styles.buttonText}>Show App Info</Text>
          </TouchableOpacity>
        </View>

        {/* Next Steps */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ready to Add Next:</Text>
          <Text style={styles.nextStepsText}>
            • ⏳ SQLite database{'\n'}
            • ⏳ Tailwind CSS{'\n'}
            • ⏳ Markdown rendering{'\n'}
            • ⏳ Flashcard UI{'\n'}
            • ⏳ GitHub data sync
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  infoValueSuccess: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  nextStepsText: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
});

export default SettingsScreen;
