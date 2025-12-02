import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {Note} from '../types';
import AudioPlayer from './AudioPlayer';

interface NoteItemProps {
  note: Note;
  topicId: string;
  lessonId: string;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onDeleteAudio: (noteId: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  topicId,
  lessonId,
  onEdit,
  onDelete,
  onDeleteAudio,
}) => {

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteAudio = () => {
    onDeleteAudio(note.id);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.content} onPress={() => onEdit(note)}>
        <Text style={styles.title}>{note.title}</Text>
        <Text style={styles.preview} numberOfLines={2}>
          {note.markdown || 'No content'}
        </Text>
        <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
      </TouchableOpacity>

      {note.audioFile && (
        <View style={styles.audioSection}>
          <AudioPlayer 
            filePath={note.audioFile}
            onError={(error) => {
              console.error('Audio player error:', error);
              Alert.alert('Playback Error', error);
            }}
            style={styles.audioPlayer}
          />
          <TouchableOpacity style={styles.deleteAudioButton} onPress={handleDeleteAudio}>
            <Text style={styles.deleteAudioButtonText}>🗑 Delete Audio</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={() => onEdit(note)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(note.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  preview: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
  audioSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  audioPlayer: {
    marginBottom: 8,
  },
  deleteAudioButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'center',
  },
  deleteAudioButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333333',
  },
  editButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NoteItem;