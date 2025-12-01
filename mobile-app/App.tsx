/**
 * SkillSync Mobile App - With React Navigation
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TopicScreen from './src/screens/TopicScreen';
import LessonScreen from './src/screens/LessonScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {RootStackParamList} from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1a1a1a',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: '#0a0a0a',
            },
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'SkillSync',
            }}
          />
          <Stack.Screen
            name="Topic"
            component={TopicScreen}
            options={({route}) => ({
              title: route.params.topicTitle,
            })}
          />
          <Stack.Screen
            name="Lesson"
            component={LessonScreen}
            options={({route}) => ({
              title: route.params.lessonTitle,
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default App;
