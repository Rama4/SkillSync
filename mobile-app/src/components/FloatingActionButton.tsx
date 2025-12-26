import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle, Text} from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ReactNode;
  iconText?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  style?: ViewStyle;
  disabled?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  iconText = '🎤',
  position = 'bottom-right',
  style,
  disabled = false,
}) => {
  const positionStyle = getPositionStyle(position);

  return (
    <TouchableOpacity
      style={[styles.fab, positionStyle, style, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}>
      {icon || <Text style={{color: 'white', fontSize: 24, fontWeight: 'bold'}}>{iconText}</Text>}
    </TouchableOpacity>
  );
};

function getPositionStyle(position: FloatingActionButtonProps['position']): ViewStyle {
  const baseStyle: ViewStyle = {
    position: 'absolute',
  };

  switch (position) {
    case 'bottom-right':
      return {...baseStyle, bottom: 20, right: 20};
    case 'bottom-left':
      return {...baseStyle, bottom: 20, left: 20};
    case 'top-right':
      return {...baseStyle, top: 20, right: 20};
    case 'top-left':
      return {...baseStyle, top: 20, left: 20};
    default:
      return {...baseStyle, bottom: 20, right: 20};
  }
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default FloatingActionButton;
