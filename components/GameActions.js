import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Modal,
  Alert 
} from 'react-native';

const GameActions = ({ 
  selectedCards, 
  onTrail, 
  onCapture, 
  onBuild, 
  onClearSelection,
  gameState,
  landscape = false
}) => {
  const [buildModalVisible, setBuildModalVisible] = useState(false);
  const [buildValue, setBuildValue] = useState('');

  const handCard = selectedCards.find(c => c.source === 'hand');
  const tableCards = selectedCards.filter(c => c.source === 'table');

  const canTrail = handCard && tableCards.length === 0;
  const canCapture = handCard && tableCards.length > 0;
  const canBuild = handCard && tableCards.length >= 0; // Can build with just hand card or hand + table cards

  const handleBuild = () => {
    setBuildModalVisible(true);
  };

  const executeBuild = () => {
    const value = parseInt(buildValue);
    if (isNaN(value) || value < 1 || value > 14) {
      Alert.alert('Invalid Build Value', 'Please enter a number between 1 and 14');
      return;
    }

    onBuild(value);
    setBuildModalVisible(false);
    setBuildValue('');
  };

  const getSelectedCardsText = () => {
    if (selectedCards.length === 0) return 'No cards selected';
    
    const handCards = selectedCards.filter(c => c.source === 'hand');
    const tableCards = selectedCards.filter(c => c.source === 'table');
    
    let text = '';
    if (handCards.length > 0) {
      text += `Hand: ${handCards.map(c => `${c.rank}${c.suit}`).join(', ')}`;
    }
    if (tableCards.length > 0) {
      if (text) text += ' | ';
      text += `Table: ${tableCards.map(c => `${c.rank}${c.suit}`).join(', ')}`;
    }
    
    return text;
  };

  return (
    <View style={[styles.container, landscape && styles.landscapeContainer]}>
      {/* Selection Info */}
      <View style={styles.selectionInfo}>
        <Text style={[styles.selectionText, landscape && styles.landscapeText]}>
          {getSelectedCardsText()}
        </Text>
        {selectedCards.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={onClearSelection}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionsContainer, landscape && styles.landscapeActions]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.trailButton, !canTrail && styles.disabledButton, landscape && styles.landscapeButton]}
          onPress={onTrail}
          disabled={!canTrail}
        >
          <Text style={[styles.actionButtonText, !canTrail && styles.disabledText, landscape && styles.landscapeButtonText]}>
            Trail
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.captureButton, !canCapture && styles.disabledButton, landscape && styles.landscapeButton]}
          onPress={onCapture}
          disabled={!canCapture}
        >
          <Text style={[styles.actionButtonText, !canCapture && styles.disabledText, landscape && styles.landscapeButtonText]}>
            Capture
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.buildButton, !canBuild && styles.disabledButton, landscape && styles.landscapeButton]}
          onPress={handleBuild}
          disabled={!canBuild}
        >
          <Text style={[styles.actionButtonText, !canBuild && styles.disabledText, landscape && styles.landscapeButtonText]}>
            Build
          </Text>
        </TouchableOpacity>
      </View>

      {/* Build Value Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={buildModalVisible}
        onRequestClose={() => setBuildModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Build</Text>
            
            <Text style={styles.modalText}>
              Enter the target value for your build:
            </Text>
            
            <TextInput
              style={styles.buildInput}
              value={buildValue}
              onChangeText={setBuildValue}
              placeholder="Enter value (1-14)"
              keyboardType="numeric"
              maxLength={2}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setBuildModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={executeBuild}
              >
                <Text style={styles.confirmButtonText}>Create Build</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          • Trail: Play a card to the table
        </Text>
        <Text style={styles.helpText}>
          • Capture: Take table cards with matching hand card
        </Text>
        <Text style={styles.helpText}>
          • Build: Combine cards for future capture
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#37474F',
    padding: 15,
    margin: 10,
    borderRadius: 10,
  },
  landscapeContainer: {
    margin: 5,
    padding: 10,
    flex: 1,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#546E7A',
  },
  selectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  landscapeText: {
    fontSize: 10,
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  landscapeActions: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  landscapeButton: {
    marginVertical: 5,
    paddingVertical: 15,
    minWidth: '100%',
  },
  trailButton: {
    backgroundColor: '#2196F3',
  },
  captureButton: {
    backgroundColor: '#4CAF50',
  },
  buildButton: {
    backgroundColor: '#FF9800',
  },
  disabledButton: {
    backgroundColor: '#616161',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  landscapeButtonText: {
    fontSize: 16,
  },
  disabledText: {
    color: '#BDBDBD',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  buildInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  helpContainer: {
    borderTopWidth: 1,
    borderTopColor: '#546E7A',
    paddingTop: 10,
  },
  helpText: {
    color: '#B0BEC5',
    fontSize: 11,
    marginVertical: 1,
  },
});

export default GameActions;