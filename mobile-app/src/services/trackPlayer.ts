import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  type Track,
} from 'react-native-track-player';

let isSetup = false;

/**
 * Initialise TrackPlayer once. Enables background playback plus lock-screen /
 * notification controls so lesson narration behaves like a real podcast player.
 */
export async function setupTrackPlayer(): Promise<boolean> {
  if (isSetup) return true;
  try {
    await TrackPlayer.setupPlayer({
      // Keep a small buffer so seeking long narrations stays responsive.
      minBuffer: 15,
      maxBuffer: 50,
      backBuffer: 30,
    });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
      progressUpdateEventInterval: 1,
    });
    await TrackPlayer.setRepeatMode(RepeatMode.Off);
    isSetup = true;
    return true;
  } catch (error) {
    // setupPlayer throws if it has already been initialised; treat that as success.
    console.warn('TrackPlayer setup:', error);
    isSetup = true;
    return true;
  }
}

/**
 * Replace the current queue with a single lesson narration track and start it.
 */
export async function loadLessonTrack(track: Track): Promise<void> {
  await setupTrackPlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add(track);
}

export {TrackPlayer, Event, Capability};
