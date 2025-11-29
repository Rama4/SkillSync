/**
 * SkillSync Mobile App - Basic Working Version
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

function App(): React.JSX.Element {
  const [message, setMessage] = React.useState('Welcome to SkillSync!');
  const [counter, setCounter] = React.useState(0);

  const handlePress = () => {
    setCounter(prev => prev + 1);
    setMessage(`App is working! Tapped ${counter + 1} times 🎉`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📚 SkillSync</Text>
            <Text style={styles.subtitle}>Mobile Learning Platform</Text>
          </View>

          {/* Message Card */}
          <View style={styles.card}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Test Button */}
          <TouchableOpacity style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>Test App</Text>
          </TouchableOpacity>

          {/* Status */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>✅ Working Features:</Text>
            <Text style={styles.statusText}>
              • Basic React Native app running{'\n'}
              • TypeScript support{'\n'}
              • Dark theme styling{'\n'}
              • Touch interactions{'\n'}
              • State management
            </Text>
          </View>

          {/* Next Steps */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Ready to Add:</Text>
            <Text style={styles.infoText}>
              • ⏳ React Navigation{'\n'}
              • ⏳ SQLite database{'\n'}
              • ⏳ Tailwind CSS{'\n'}
              • ⏳ Markdown rendering{'\n'}
              • ⏳ Flashcard UI{'\n'}
              • ⏳ GitHub data sync
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
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
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  message: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#059669',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
});

export default App;