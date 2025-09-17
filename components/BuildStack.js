import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from './Card';

const BuildStack = ({ build, onPress, selected = false }) => {
  const getOwnerColor = (owner) => {
    return owner === 0 ? '#FF5722' : '#2196F3';
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { borderColor: getOwnerColor(build.owner) },
        selected && styles.selected
      ]}
      onPress={() => onPress && onPress(build)}
    >
      <Text style={styles.buildLabel}>
        Build {build.value}
      </Text>
      
      <Text style={[
        styles.ownerLabel,
        { color: getOwnerColor(build.owner) }
      ]}>
        Player {build.owner + 1}
      </Text>
      
      <View style={styles.cardsContainer}>
        {build.cards.map((card, index) => (
          <Card
            key={`${card.rank}${card.suit}-${index}`}
            card={card}
            size="small"
            disabled={true}
          />
        ))}
      </View>
      
      <Text style={styles.cardCount}>
        {build.cards.length} cards
      </Text>
      
      {build.isExtendable && (
        <Text style={styles.extendableLabel}>
          Extendable
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 3,
    padding: 8,
    margin: 4,
    alignItems: 'center',
    minWidth: 80,
  },
  selected: {
    backgroundColor: '#FFE0B2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buildLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 2,
  },
  ownerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 4,
  },
  cardCount: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  extendableLabel: {
    fontSize: 8,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default BuildStack;