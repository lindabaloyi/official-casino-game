import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from './Card';
import CardStack from './CardStack';
import { calculateCardSum, rankValue } from '../game-logic/card-operations.js';

const BuildStack = memo(({ build, onDropStack, onCardPress = () => {} }) => {
  const memoizedOnDropStack = useCallback(
    (draggedItem) => onDropStack(draggedItem, { type: 'build', buildId: build.buildId }),
    [onDropStack, build.buildId]
  );

  return (
    <View style={styles.build}>
      <CardStack
        stackId={build.buildId}
        cards={build.cards}
        onDropStack={memoizedOnDropStack}
        buildValue={build.value}
        isBuild={true}
      />
      <View style={styles.buildOwnerTag}>
        <Text style={styles.buildOwnerText}>P{build.owner + 1}</Text>
      </View>
    </View>
  );
});

const TempStack = memo(({ 
  stack, 
  onDropOnCard, 
  currentPlayer, 
  onCancelStack, 
  onConfirmStack,
  onCardPress = () => {},
  onDragStart,
  onDragEnd,
  onDragMove
}) => {
  const memoizedOnDropStack = (draggedItem) => 
    onDropOnCard(draggedItem, { type: 'temporary_stack', stackId: stack.stackId });
  
  // DYNAMIC VALUE: Detect SET MODE vs SUM MODE for correct display
  const stackRanks = stack.cards.map(c => c.rank);
  const isSetMode = new Set(stackRanks).size === 1; // All cards same rank
  
  const stackValue = isSetMode 
    ? rankValue(stackRanks[0])  // SET MODE: show rank value (9 for [9,9])
    : calculateCardSum(stack.cards); // SUM MODE: show sum (9 for [3,6])

  return (
    <View style={styles.build}>
      <TouchableOpacity 
        style={styles.cancelStackButton} 
        onPress={() => onCancelStack(stack)}
      >
        <Text style={styles.cancelStackText}>×</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.confirmStackButton} 
        onPress={() => onConfirmStack(stack)}
      >
        <Text style={styles.confirmStackText}>✓</Text>
      </TouchableOpacity>
      <CardStack
        stackId={stack.stackId}
        cards={stack.cards}
        onDropStack={memoizedOnDropStack}
        isBuild={true}
        buildValue={stackValue}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
        dragSource="temporary_stack"
      />
      <View style={styles.tempStackIndicator}>
        <Text style={styles.tempStackText}>Staging</Text>
      </View>
    </View>
  );
});

const LooseCard = ({ card, onDropOnCard, currentPlayer, onCardPress = () => {}, onDragStart, onDragEnd, onDragMove }) => {
  return (
    <View style={styles.looseCardContainer}>
      <CardStack
        stackId={`loose-stack-${card.rank}-${card.suit}`}
        cards={[card]}
        onDropStack={(draggedItem) => 
          onDropOnCard(draggedItem, { type: 'loose', cardId: `${card.rank}-${card.suit}`, rank: card.rank, suit: card.suit })
        }
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
        dragSource="table"
      />
    </View>
  );
};

const TableCards = ({ 
  cards, 
  onDropOnCard, 
  currentPlayer, 
  onCancelStack, 
  onConfirmStack,
  onCardPress = () => {},
  onDragStart,
  onDragEnd,
  onDragMove,
  isDragging = false
}) => {
  const memoizedOnDropOnCard = useCallback(onDropOnCard, [onDropOnCard]);

  return (
    <View style={styles.tableCards}>
      {/* FIXED: Stable card positioning without ScrollView interference */}
      <View style={styles.cardsContainer}>
        {cards.length === 0 ? (
          <View style={styles.emptyTable}>
            <Text style={styles.emptyText}>No cards on table</Text>
          </View>
        ) : (
          cards.map((item, index) => {
            if (item.type === 'build') {
              return (
                <BuildStack 
                  key={item.buildId || index} 
                  build={item} 
                  onDropStack={memoizedOnDropOnCard}
                  onCardPress={onCardPress}
                />
              );
            }
            if (item.type === 'temporary_stack') {
              return (
                <TempStack 
                  key={item.stackId || index} 
                  stack={item} 
                  onDropOnCard={memoizedOnDropOnCard} 
                  currentPlayer={currentPlayer} 
                  onCancelStack={onCancelStack} 
                  onConfirmStack={onConfirmStack}
                  onCardPress={onCardPress}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragMove={onDragMove}
                />
              );
            }
            // Default to rendering a loose card
            return (
              <LooseCard 
                key={`loose-${item.rank}-${item.suit}` || index} 
                card={item} 
                onDropOnCard={memoizedOnDropOnCard} 
                currentPlayer={currentPlayer}
                onCardPress={onCardPress}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragMove={onDragMove}
              />
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tableCards: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    padding: 10,
    flex: 1,
  },
  cardsContainer: {
    minHeight: 180,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    // FIXED: Removed flex, flexWrap, and justifyContent to prevent card jumping
    // Cards now have stable positions in horizontal scroll
  },
  emptyTable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    minWidth: 200,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
  },
  build: {
    position: 'relative',
    margin: 8,
  },
  buildOwnerTag: {
    position: 'absolute',
    top: -5,   // 📏 CLOSER: Match proximity of other icons (-5px instead of -10px)
    left: -5,  // 📏 CLOSER: Match proximity of other icons (-5px instead of -10px)
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buildOwnerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cancelStackButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#F44336',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cancelStackText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmStackButton: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  confirmStackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tempStackIndicator: {
    position: 'absolute',
    bottom: -15,
    left: 0,
    right: 0,
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  tempStackText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  looseCardContainer: {
    margin: 4,
  },
});

export default memo(TableCards);