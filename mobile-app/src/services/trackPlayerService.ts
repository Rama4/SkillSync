import TrackPlayer, {Event} from 'react-native-track-player';

/**
 * Background playback service. Registered in index.js via
 * TrackPlayer.registerPlaybackService. Handles remote (lock-screen / headset /
 * Bluetooth) control events while the app is backgrounded or killed.
 */
module.exports = async function trackPlayerService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {}),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, ({position}) => TrackPlayer.seekTo(position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({interval}) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(pos + (interval ?? 15));
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({interval}) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, pos - (interval ?? 15)));
  });
};
