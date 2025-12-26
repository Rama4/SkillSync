import React, {useState, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback} from 'react-native';
import {Text} from 'react-native';

interface MenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ThreeDotMenuProps {
  items: MenuItem[];
}

const ThreeDotMenu: React.FC<ThreeDotMenuProps> = ({items}) => {
  const [visible, setVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({top: 0, right: 0});
  const buttonRef = useRef<View>(null);

  const handlePress = () => {
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setMenuPosition({
        top: pageY + height,
        right: 10,
      });
      setVisible(true);
    });
  };

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity style={styles.menuButton} onPress={handlePress}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="none" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.menuContainer, {top: menuPosition.top, right: menuPosition.right}]}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, index < items.length - 1 && styles.menuItemBorder]}
                  onPress={() => {
                    setVisible(false);
                    // Delay the action slightly to allow menu to close
                    setTimeout(() => item.onPress(), 100);
                  }}>
                  <Text style={[styles.menuItemText, item.destructive && styles.menuItemTextDestructive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a1a1aa',
  },
  modalOverlay: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    minWidth: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  menuItemText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  menuItemTextDestructive: {
    color: '#ef4444',
  },
});

export default ThreeDotMenu;
