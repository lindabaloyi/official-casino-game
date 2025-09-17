import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableCard from './DraggableCard';

const PlayerHand = memo(({ 
  player, 
  cards, 
  isCurrent, 
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer
}) => {
  return (
    <View style={styles.playerHand}>
      {cards.map((card, index) => {
        return (
          <DraggableCard
            key={`${card.rank}-${card.suit}`}
            card={card}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            disabled={!isCurrent}
            draggable={isCurrent}
            size="normal"
            currentPlayer={currentPlayer}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  playerHand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
});

export default PlayerHand;