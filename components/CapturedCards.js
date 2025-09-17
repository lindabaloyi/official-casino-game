import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CardStack from './CardStack';

const CapturedCards = memo(({ 
  captures, 
  playerIndex, 
  hasCards, 
  topCard, 
  isOpponent,
  onCardPress = () => {},
  isMinimal = false,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer
}) => {
  const allCapturedCards = captures.flat();

  const handlePress = () => {
    if (hasCards && isOpponent && onCardPress && typeof onCardPress === 'function') {
      onCardPress(topCard, 'opponentCapture');
    }
  };

  if (isMinimal) {
    return (
      <TouchableOpacity 
        style={hasCards ? styles.minimalCaptures : styles.emptyMinimalCaptures}
        onPress={handlePress}
        activeOpacity={isOpponent && hasCards ? 0.7 : 1}
        disabled={!isOpponent || !hasCards}
      >
        {hasCards ? (
          <CardStack 
            cards={allCapturedCards} 
            isBuild={true}
            stackId={`captures-${playerIndex}`}
            draggable={isOpponent}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            currentPlayer={currentPlayer}
            dragSource="opponentCapture"
          />
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={hasCards ? styles.captures : styles.emptyCaptures}
      onPress={handlePress}
      activeOpacity={isOpponent && hasCards ? 0.7 : 1}
      disabled={!isOpponent || !hasCards}
    >
      {hasCards ? (
        <CardStack 
          cards={allCapturedCards} 
          isBuild={true}
          stackId={`captures-${playerIndex}`}
          draggable={isOpponent}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragMove={onDragMove}
          currentPlayer={currentPlayer}
          dragSource="captured"
        />
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  captures: {
    alignItems: 'center',
    padding: 4,
  },
  emptyCaptures: {
    width: 50,
    height: 70,
    borderWidth: 2,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 8,
    margin: 2,
  },
  minimalCaptures: {
    alignItems: 'center',
    padding: 2,
  },
  emptyMinimalCaptures: {
    width: 40,
    height: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 6,
    margin: 2,
  },
});

export default CapturedCards;