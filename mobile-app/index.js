/**
 * @format
 */

import {AppRegistry} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Background audio service for lesson narration (lock-screen / headset controls).
TrackPlayer.registerPlaybackService(() => require('./src/services/trackPlayerService'));
