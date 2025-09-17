import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import CapturedCards from './CapturedCards';
import ActionModal from './ActionModal';
import ErrorModal from './ErrorModal';
import BurgerMenu from './BurgerMenu';

// Import the original game logic hook
import { useGameActions } from './useGameActions';

// Status Section Component - exactly like web version
const StatusSection = React.memo(({ round }) => (
  <View style={styles.statusSection}>
    <Text style={styles.statusText}>Round: {round}</Text>
  </View>
));

// Opponent Captured Cards Section - Only opponent, minimal styling
const OpponentCapturedSection = React.memo(({ playerCaptures, currentPlayer, onCardPress = () => {}, onDragStart, onDragEnd, onDragMove }) => {
  const opponentIndex = 1 - currentPlayer;
  const capturedGroups = playerCaptures[opponentIndex] || [];
  const allCapturedCards = capturedGroups.flat();
  const hasCards = allCapturedCards.length > 0;

  return (
    <View style={styles.opponentCapturedList}>
      <CapturedCards
        captures={capturedGroups}
        playerIndex={opponentIndex}
        hasCards={hasCards}
        topCard={hasCards ? allCapturedCards[allCapturedCards.length - 1] : null}
        isOpponent={true}
        onCardPress={onCardPress}
        isMinimal={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
      />
    </View>
  );
});

// Active Player Captured Cards - Next to player hand
const PlayerCapturedSection = React.memo(({ playerCaptures, currentPlayer, onCardPress = () => {} }) => {
  const capturedGroups = playerCaptures[currentPlayer] || [];
  const allCapturedCards = capturedGroups.flat();
  const hasCards = allCapturedCards.length > 0;

  return (
    <View style={styles.playerCapturedArea}>
      <CapturedCards
        captures={capturedGroups}
        playerIndex={currentPlayer}
        hasCards={hasCards}
        topCard={hasCards ? allCapturedCards[allCapturedCards.length - 1] : null}
        isOpponent={false}
        onCardPress={onCardPress}
        isMinimal={false}
      />
    </View>
  );
});

// Table Cards Section - exactly like web version
const TableCardsSection = React.memo(({ 
  tableCards, 
  onDropOnCard, 
  currentPlayer, 
  onCancelStack, 
  onConfirmStack,
  onCardPress = () => {},
  onDragStart,
  onDragEnd,
  onDragMove,
  isDragging = false
}) => (
  <View style={styles.tableCardsSection}>
    <TableCards 
      cards={tableCards} 
      onDropOnCard={onDropOnCard} 
      currentPlayer={currentPlayer} 
      onCancelStack={onCancelStack} 
      onConfirmStack={onConfirmStack}
      onCardPress={onCardPress}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      isDragging={isDragging}
    />
  </View>
));

// Player Hands Section - Show active player hand with their captures on the right
const PlayerHandsSection = React.memo(({ playerHands, currentPlayer, onDragStart, onDragEnd, onDragMove, playerCaptures, onCardPress = () => {} }) => (
  <View style={styles.playerHandsSection}>
    <View style={styles.playerHandArea}>
      <PlayerHand
        player={currentPlayer}
        cards={playerHands[currentPlayer]}
        isCurrent={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
      />
    </View>
    <PlayerCapturedSection 
      playerCaptures={playerCaptures}
      currentPlayer={currentPlayer}
      onCardPress={onCardPress}
    />
  </View>
));

// Game Over Section - exactly like web version
const GameOverSection = React.memo(({ winner, scoreDetails, onRestart }) => {
  if (!scoreDetails) {
    return (
      <View style={styles.gameOverSection}>
        <Text style={styles.gameOverTitle}>Game Over</Text>
        <Text style={styles.gameOverText}>Calculating scores...</Text>
      </View>
    );
  }

  const renderPlayerScores = (playerIndex) => {
    const details = scoreDetails[playerIndex];
    return (
      <View key={playerIndex} style={styles.playerScoreColumn}>
        <Text style={styles.playerScoreTitle}>Player {playerIndex + 1}</Text>
        <View style={styles.pointsTally}>
          <Text style={styles.pointsLabel}>Points</Text>
          <Text style={styles.totalScore}>{details.total}</Text>
        </View>
        <View style={styles.scoreBreakdown}>
          <Text style={styles.scoreItem}>Cards ({details.cardCount}): {details.mostCards} pt</Text>
          <Text style={styles.scoreItem}>Spades ({details.spadeCount}): {details.mostSpades} pts</Text>
          <Text style={styles.scoreItem}>Aces: {details.aces} pts</Text>
          {details.bigCasino > 0 && <Text style={styles.scoreItem}>Big Casino (10♦): {details.bigCasino} pts</Text>}
          {details.littleCasino > 0 && <Text style={styles.scoreItem}>Little Casino (2♠): {details.littleCasino} pts</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.gameOverSection}>
      <Text style={styles.gameOverTitle}>Game Over</Text>
      <View style={styles.finalScoresContainer}>
        {renderPlayerScores(0)}
        {renderPlayerScores(1)}
      </View>
      <Text style={styles.winnerDeclaration}>
        {winner !== null ? `Winner: Player ${winner + 1}` : "It's a Tie!"}
      </Text>
      <TouchableOpacity
        style={styles.playAgainButton}
        onPress={onRestart}
      >
        <Text style={styles.playAgainButtonText}>Play Again</Text>
      </TouchableOpacity>
    </View>
  );
});

function GameBoard({ onRestart }) {
  const {
    gameState,
    modalInfo,
    errorModal,
    handleTrailCard,
    handleDropOnCard,
    handleModalAction,
    setModalInfo,
    handleStageOpponentCardAction,
    handleCancelStagingStackAction,
    handleConfirmStagingStackAction,
    closeErrorModal,
  } = useGameActions();

  // Mobile-specific state for drag interactions
  const [draggedCard, setDraggedCard] = useState(null);
  const [dropZones, setDropZones] = useState({});
  
  // Track dragging state for UI optimization
  const isDragging = !!draggedCard;

  // State for round transition animation
  const [showRoundTransition, setShowRoundTransition] = React.useState(false);

  // Effect to show round transition animation when round changes to 2
  React.useEffect(() => {
    if (gameState.round === 2 && !showRoundTransition) {
      setShowRoundTransition(true);
      const timer = setTimeout(() => {
        setShowRoundTransition(false);
      }, 4000); // Show animation for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState.round]);

  // Keyboard navigation handler (adapted for mobile)
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && modalInfo) {
      setModalInfo(null);
    }
  }, [modalInfo, setModalInfo]);

  // Drag handlers - restore original drag mechanics
  const handleDragStart = useCallback((card) => {
    setDraggedCard(card);
  }, []);

  const handleDragMove = useCallback((card, position) => {
    // TODO: Add drop zone highlighting logic if needed
  }, []);

  const handleDragEnd = useCallback((draggedItem, dropPosition) => {
    // Check if drop was handled by a component drop zone
    // Component-based drops will set a flag to prevent trail logic
    if (dropPosition.handled) {
      // Reset drag state only
      setDraggedCard(null);
      return;
    }
    
    // Only trail if card came from hand, not from temp stacks
    if (draggedItem.source === 'hand') {
      handleTrailCard(draggedItem.card, gameState.currentPlayer, dropPosition);
    }
    
    // Reset drag state
    setDraggedCard(null);
  }, [gameState.currentPlayer, handleTrailCard]);

  // Handle ending the game
  const handleEndGame = useCallback(() => {
    // Use the modal system to trigger end game action
    const endGameAction = {
      type: 'end_game',
      payload: {} // No payload needed for end game
    };
    handleModalAction(endGameAction);
  }, [handleModalAction]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      
      {/* Burger Menu */}
      <BurgerMenu onRestart={onRestart} onEndGame={handleEndGame} />
      
      <View style={styles.gameContainer}>
        <StatusSection round={gameState.round} />
        
        <View style={styles.mainGameArea}>
          <TableCardsSection
            tableCards={gameState.tableCards}
            onDropOnCard={handleDropOnCard}
            currentPlayer={gameState.currentPlayer}
            onCancelStack={handleCancelStagingStackAction}
            onConfirmStack={handleConfirmStagingStackAction}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            isDragging={isDragging}
          />
          
          <OpponentCapturedSection 
            playerCaptures={gameState.playerCaptures} 
            currentPlayer={gameState.currentPlayer}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
          />
        </View>
        
        {/* Active Player Indicator */}
        <View style={[styles.activePlayerIndicator, { backgroundColor: gameState.currentPlayer === 0 ? '#FF5722' : '#2196F3' }]}>
          <Text style={styles.activePlayerText}>
            P{gameState.currentPlayer + 1}
          </Text>
        </View>
        
        <PlayerHandsSection
          playerHands={gameState.playerHands}
          currentPlayer={gameState.currentPlayer}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragMove={handleDragMove}
          playerCaptures={gameState.playerCaptures}
        />

        {/* Drag indicator */}

        {modalInfo && (
          <ActionModal
            modalInfo={modalInfo}
            onAction={handleModalAction}
            onCancel={() => setModalInfo(null)}
          />
        )}

        {showRoundTransition && (
          <View style={styles.roundTransition}>
            <Text style={styles.roundTransitionTitle}>Round 2</Text>
            <Text style={styles.roundTransitionText}>Table cards carried over from Round 1</Text>
          </View>
        )}

        {gameState.gameOver && (
          <GameOverSection
            winner={gameState.winner}
            scoreDetails={gameState.scoreDetails}
            onRestart={onRestart}
          />
        )}

        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={closeErrorModal}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  gameContainer: {
    flex: 1,
  },
  statusSection: {
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mainGameArea: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tableCardsSection: {
    flex: 3,
    paddingRight: 8,
  },
  opponentCapturedList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 80,
    padding: 4,
  },
  activePlayerIndicator: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
    marginVertical: 4,
  },
  activePlayerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playerHandsSection: {
    flexDirection: 'row',
    paddingVertical: 2,
    alignItems: 'center',
  },
  playerHandArea: {
    flex: 1,
  },
  playerCapturedArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingLeft: 8,
  },
  playerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  selectedCardIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#37474F',
    padding: 15,
    margin: 10,
    borderRadius: 10,
  },
  selectedCardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearSelectionButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearSelectionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  roundTransition: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  roundTransitionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  roundTransitionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  gameOverSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  gameOverText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  finalScoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  playerScoreColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  playerScoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  pointsTally: {
    alignItems: 'center',
    marginBottom: 15,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  totalScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scoreBreakdown: {
    alignItems: 'flex-start',
  },
  scoreItem: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  winnerDeclaration: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default React.memo(GameBoard);