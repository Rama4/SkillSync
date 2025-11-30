import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [counter, setCounter] = React.useState(0);

  const handlePress = () => {
    setCounter(prev => prev + 1);
  };

  const goToSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📚 SkillSync</Text>
          <Text style={styles.subtitle}>Home Screen</Text>
        </View>

        {/* Counter Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Counter: {counter}</Text>
          <TouchableOpacity style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>Tap Me!</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Navigation Working</Text>
          <Text style={styles.cardText}>
            React Navigation is set up and working properly
          </Text>
          <TouchableOpacity style={styles.navButton} onPress={goToSettings}>
            <Text style={styles.buttonText}>Go to Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>✅ Working Features:</Text>
          <Text style={styles.statusText}>
            • Basic React Native app{'\n'}
            • React Navigation{'\n'}
            • Multiple screens{'\n'}
            • TypeScript support{'\n'}
            • Dark theme styling
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
    marginBottom: 8,
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
  navButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
});

export default HomeScreen;
