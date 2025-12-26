import React, {useCallback, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator} from 'react-native';

interface CreateTopicModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateTopic: (title: string) => Promise<void>;
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  visible,
  onClose,
  onCreateTopic,
}: CreateTopicModalProps) => {
  const [topicName, setTopicName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreate = useCallback(async () => {
    const trimmedName = topicName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a topic name');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateTopic(trimmedName);
      setTopicName('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create topic');
    } finally {
      setIsCreating(false);
    }
  }, [topicName, onCreateTopic, onClose]);

  const handleCancel = useCallback(() => {
    setTopicName('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Create New Topic</Text>
          <Text style={styles.subtitle}>Enter a name for your new topic</Text>

          <TextInput
            style={styles.input}
            value={topicName}
            onChangeText={setTopicName}
            placeholder="Topic name"
            placeholderTextColor="#6b7280"
            autoFocus
            editable={!isCreating}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel} disabled={isCreating}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton, isCreating && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={isCreating}>
              {isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'white',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  createButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateTopicModal;
