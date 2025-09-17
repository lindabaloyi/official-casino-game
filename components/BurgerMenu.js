import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet 
} from 'react-native';

const BurgerMenu = ({ onRestart, onEndGame }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleRestart = () => {
    setIsMenuOpen(false);
    onRestart();
  };

  const handleEndGame = () => {
    setIsMenuOpen(false);
    onEndGame();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Burger Icon */}
      <TouchableOpacity 
        style={styles.burgerIcon} 
        onPress={toggleMenu}
        activeOpacity={0.7}
      >
        <View style={styles.burgerLine} />
        <View style={styles.burgerLine} />
        <View style={styles.burgerLine} />
      </TouchableOpacity>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.overlayTouchable} 
            onPress={() => setIsMenuOpen(false)}
            activeOpacity={1}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleRestart}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>🔄 Restart Game</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleEndGame}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>🚪 End Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  burgerIcon: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 1000,
    backgroundColor: '#2d5736', // Casino green background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd700', // Gold border
    padding: 12,
    width: 50,
    height: 50,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  burgerLine: {
    width: 20,
    height: 3,
    backgroundColor: '#ffd700', // Gold lines
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuContainer: {
    position: 'absolute',
    top: 75,
    left: 15,
    backgroundColor: '#2d5736', // Casino green background
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd700', // Gold border
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700', // Gold text
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#ffd700',
    marginHorizontal: 10,
    opacity: 0.3,
  },
});

export default BurgerMenu;