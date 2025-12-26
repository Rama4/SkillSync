import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Note} from '../../../lib/types';
import AudioPlayer from '@/components/AudioPlayer';
import {formatUpdatedAt} from '@/utils/noteUtils';
import ThreeDotMenu from '@/components/ThreeDotMenu';

interface NoteItemProps {
  note: Note;
  topicId: string;
  lessonId: string;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onDeleteAudio: (noteId: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({note, onEdit, onDelete, onDeleteAudio}: NoteItemProps) => {
  const menuItems = [
    {
      label: 'Edit',
      onPress: () => onEdit(note),
    },
    ...(note.audioFile
      ? [
          {
            label: 'Delete Audio',
            onPress: () => onDeleteAudio(note.id),
            destructive: true,
          },
        ]
      : []),
    {
      label: 'Delete',
      onPress: () => onDelete(note.id),
      destructive: true,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.content} onPress={() => onEdit(note)} activeOpacity={0.7}>
          <Text style={styles.title}>{note.title}</Text>
          {note?.markdown?.length > 0 && (
            <Text style={styles.preview} numberOfLines={2}>
              {note.markdown}
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.menuWrapper}>
          <ThreeDotMenu items={menuItems} />
        </View>
      </View>

      {note.audioFile && (
        <View style={styles.audioSection}>
          <AudioPlayer
            filePath={note.audioFile}
            onError={error => {
              console.error('Audio player error:', error);
              Alert.alert('Playback Error', error);
            }}
            onDelete={() => onDeleteAudio(note.id)}
            style={styles.audioPlayer}
          />
        </View>
      )}
      <Text style={styles.date}>{formatUpdatedAt(note.updatedAt)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
    padding: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 6,
  },
  preview: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
    marginBottom: 6,
  },
  date: {
    fontSize: 11,
    color: '#6b7280',
  },
  menuWrapper: {
    paddingTop: 8,
    paddingRight: 8,
  },
  audioSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: 4,
  },
  audioPlayer: {
    marginBottom: 0,
  },
});

export default NoteItem;
