// Note utils
export function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
}

// Audio recorder utils
function padStringWithZeros(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const displayMins = Math.floor(mins % 60);
  const displaySecs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${padStringWithZeros(hours)}:${padStringWithZeros(displayMins)}:${padStringWithZeros(displaySecs)}`;
  } else if (displayMins > 0) {
    return `${padStringWithZeros(displayMins)}:${padStringWithZeros(displaySecs)}`;
  } else {
    return `${padStringWithZeros(displaySecs)}s`;
  }
}

export function getTempAudioFileName(): string {
  return `Voice Note - ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function getAudioPlayerUrl(topicId: string, lessonId: string, noteId: string): string {
  return `/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}/audio`;
}
