import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../../lib/mobile_types';
import {syncService, SyncStatus} from '../services/syncService';
import {databaseService} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({navigation}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    syncService.getSyncStatus(),
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [topicsCount, setTopicsCount] = useState(0);

  useEffect(() => {
    loadSyncInfo();

    // Subscribe to sync status changes
    const unsubscribe = syncService.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  const loadSyncInfo = async () => {
    try {
      const lastSync = await databaseService.getLastSyncTimestamp();
      setLastSyncTime(lastSync);

      const topics = await databaseService.getAllTopics();
      setTopicsCount(topics.length);
    } catch (error) {
      console.error('Failed to load sync info:', error);
    }
  };

  const handleSyncData = async () => {
    try {
      await syncService.syncAllData();
      await loadSyncInfo();
      Alert.alert('Success', 'Content loaded successfully from local files!');
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert(
        'Load Failed',
        'Failed to load content. Please ensure your files are in Download/SkillSync/data/ folder (or the app will use its external directory) and try again.',
      );
    }
  };

  const handleCheckUpdates = async () => {
    try {
      const updateInfo = await syncService.checkForUpdates();
      if (updateInfo.hasUpdates) {
        const updatedNames = updateInfo.updatedTopics
          .map(t => t.title)
          .join(', ');
        const newNames = updateInfo.newTopics.map(t => t.title).join(', ');

        let message = '';
        if (updateInfo.newTopics.length > 0) {
          message += `New topics: ${newNames}\n\n`;
        }
        if (updateInfo.updatedTopics.length > 0) {
          message += `Updated topics: ${updatedNames}\n\n`;
        }
        if (updateInfo.indexUpdated) {
          message += 'Topics index has been updated.\n\n';
        }
        message += 'Would you like to sync now?';

        Alert.alert('Updates Available', message, [
          {text: 'Later', style: 'cancel'},
          {text: 'Sync Now', onPress: handleSyncData},
        ]);
      } else {
        Alert.alert('No Updates', 'All content is up to date!');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      Alert.alert(
        'Error',
        'Failed to check for updates. Please ensure your files are accessible in Download/SkillSync/data/ folder.',
      );
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all downloaded content. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearAllData();
              await loadSyncInfo();
              Alert.alert('Success', 'All data cleared successfully!');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ],
    );
  };

  const showInfo = () => {
    Alert.alert(
      'SkillSync Mobile',
      'Version 1.0.0 MVP\n\nOffline-first learning platform built with React Native.\n\n✅ SQLite Database\n✅ Markdown Rendering\n✅ Offline Sync\n✅ Flashcard UI',
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>Manage your learning content</Text>
        </View>

        {/* Local Content Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📁 Local Content</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Topics Downloaded:</Text>
            <Text style={styles.infoValue}>{topicsCount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Load:</Text>
            <Text style={styles.infoValue}>{formatDate(lastSyncTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Source Path:</Text>
            <Text style={styles.infoValue}>
              Download/SkillSync/data/ (or app external)
            </Text>
          </View>

          {syncStatus.isLoading && (
            <View style={styles.syncProgress}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.syncProgressText}>
                Loading... ({syncStatus.progress.current}/
                {syncStatus.progress.total})
              </Text>
            </View>
          )}

          {syncStatus.error && (
            <Text style={styles.errorText}>{syncStatus.error}</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                syncStatus.isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSyncData}
              disabled={syncStatus.isLoading}>
              <Text style={styles.buttonText}>📁 Load All Content</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                syncStatus.isLoading && styles.buttonDisabled,
              ]}
              onPress={handleCheckUpdates}
              disabled={syncStatus.isLoading}>
              <Text style={styles.buttonText}>🔍 Check for Updates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗄️ Data Management</Text>
          <Text style={styles.cardText}>
            Manage your downloaded content and app data.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearData}>
            <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0 MVP</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Framework:</Text>
            <Text style={styles.infoValue}>React Native</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage:</Text>
            <Text style={styles.infoValueSuccess}>
              SQLite (Offline-first) ✅
            </Text>
          </View>
          <TouchableOpacity style={styles.infoButton} onPress={showInfo}>
            <Text style={styles.buttonText}>📱 About SkillSync</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  cardText: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    flex: 1,
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
  syncProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  syncProgressText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
  },
  secondaryButton: {
    backgroundColor: '#059669',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  infoButton: {
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;
