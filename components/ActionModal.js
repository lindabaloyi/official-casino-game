import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput
} from 'react-native';

const ActionModal = ({ modalInfo, onAction, onCancel }) => {
  const [buildValue, setBuildValue] = useState('');
  
  if (!modalInfo) return null;

  const { type, draggedCard, targetCard, actions } = modalInfo;

  const handleActionPress = (action) => {
    if (action.type === 'create_build' && !buildValue) {
      // For build actions, we might need a value input
      return;
    }
    onAction(action);
  };

  const renderHeader = () => {
    let title = '';
    let description = '';

    switch (type) {
      case 'capture':
        title = 'Capture Cards';
        description = `Capture ${targetCard?.rank}${targetCard?.suit} with ${draggedCard?.rank}${draggedCard?.suit}`;
        break;
      case 'build':
        title = 'Create Build';
        description = `Build with ${draggedCard?.rank}${draggedCard?.suit} and ${targetCard?.rank}${targetCard?.suit}`;
        break;
      case 'trail':
        title = 'Trail Card';
        description = `Trail ${draggedCard?.rank}${draggedCard?.suit} to table`;
        break;
      default:
        title = 'Select Action';
        description = '';
    }

    return (
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    );
  };

  const renderActions = () => {
    if (!actions || actions.length === 0) {
      return (
        <View style={styles.noActions}>
          <Text style={styles.noActionsText}>No valid actions available</Text>
        </View>
      );
    }

    return actions.map((action, index) => (
      <TouchableOpacity
        key={index}
        style={styles.actionButton}
        onPress={() => handleActionPress(action)}
      >
        <Text style={styles.actionButtonText}>{action.label}</Text>
      </TouchableOpacity>
    ));
  };

  const renderBuildValueInput = () => {
    if (type !== 'build') return null;

    return (
      <View style={styles.buildValueContainer}>
        <Text style={styles.buildValueLabel}>Build Value (1-14):</Text>
        <TextInput
          style={styles.buildValueInput}
          value={buildValue}
          onChangeText={setBuildValue}
          keyboardType="numeric"
          placeholder="Enter value"
          placeholderTextColor="#999"
        />
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{modalInfo.title || 'Select Action'}</Text>
          <Text style={styles.message}>{modalInfo.message || ''}</Text>
          
          {renderBuildValueInput()}
          
          <View style={styles.actionsContainer}>
            {renderActions()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#2d5736', // Casino green background
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffd700', // Gold border
    padding: 20,
    minWidth: 280,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700', // Gold text
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buildValueContainer: {
    marginBottom: 15,
  },
  buildValueLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '600',
  },
  buildValueInput: {
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#3a6b42',
    color: '#ffffff',
  },
  actionsContainer: {
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#ffd700', // Gold button
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionButtonText: {
    color: '#2d5736', // Dark green text
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noActions: {
    alignItems: 'center',
  },
  noActionsText: {
    color: '#ffffff',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ActionModal;