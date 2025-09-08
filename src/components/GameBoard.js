import React, { useCallback } from 'react';
import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import { useDrop, useDrag } from 'react-dnd';
import './styles/GameBoard.css';
import CardStack from './CardStack';
import { useGameActions } from './useGameActions';
import ActionModal from './ActionModal';
import { useNotifications } from './styles/NotificationSystem';

const ItemTypes = {
  CARD: 'card',
};

const StatusSection = React.memo(({ round }) => (
  <section
    className="status-section"
    aria-label="Game Status"
    role="status"
  >
    <p>Round: {round}</p>
  </section>
));

const CapturedCardsSection = React.memo(({ playerCaptures, currentPlayer }) => {
  // Handle undefined playerCaptures (for online mode before game starts)
  if (!playerCaptures) {
    return (
      <section
        className="captured-cards-positioned"
        aria-label="Captured Cards"
      >
        {[0, 1].map(playerIndex => (
          <div key={playerIndex} className="captured-cards">
            <h3>Player {playerIndex + 1} Captures</h3>
            <div className="cards-container empty"><p>No Cards.</p></div>
          </div>
        ))}
      </section>
    );
  }

  // Always render opponent first, then current player for strategic visibility.
  const displayOrder = [1 - currentPlayer, currentPlayer];

  return (
    <section
      className="captured-cards-positioned"
      aria-label="Captured Cards"
    >
      {displayOrder.map(playerIndex => {
        const capturedGroups = playerCaptures[playerIndex] || [];
        const allCapturedCards = capturedGroups.flat();
        const hasCards = allCapturedCards.length > 0;
        const isOpponent = playerIndex !== currentPlayer;
        const topCard = hasCards ? allCapturedCards[allCapturedCards.length - 1] : null;

        const [{ isDragging }, drag] = useDrag(() => ({
          type: ItemTypes.CARD,
          item: { card: topCard, player: currentPlayer, source: 'opponentCapture' },
          canDrag: () => hasCards && isOpponent,
          collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
          }),
        }), [topCard, currentPlayer, hasCards, isOpponent]);

        return (
          <div key={playerIndex} className="captured-cards" ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: (hasCards && isOpponent) ? 'grab' : 'default' }}>
            <h3>Player {playerIndex + 1} Captures</h3>
            {hasCards ? (<CardStack cards={allCapturedCards} isBuild={true} />) : (<div className="cards-container empty"><p>No Cards.</p></div>)}
          </div>
        );
      })}
    </section>
  );
});

const TableCardsSection = React.memo(({ tableCards, onDropOnCard, currentPlayer, onCancelStack, onConfirmStack }) => (
  <section
    className="table-cards-section"
    aria-label="Table Cards"
    role="main"
  >
    <TableCards
      cards={Array.isArray(tableCards) ? tableCards : []}
      onDropOnCard={onDropOnCard}
      currentPlayer={currentPlayer}
      onCancelStack={onCancelStack}
      onConfirmStack={onConfirmStack}
    />
  </section>
));

const PlayerHandsSection = React.memo(({ playerHands, currentPlayer, gameMode, currentPlayerId, players }) => {
  const hands = Array.isArray(playerHands) ? playerHands : [[], []];
  // Always render the current player first, then the opponent.
  const displayOrder = [currentPlayer, 1 - currentPlayer];

  return (
    <section className="player-hands-section" aria-label="Player Hands">
      {displayOrder.map((playerIndex, i) => {
        const hand = hands[playerIndex] || [];
        const isTurn = playerIndex === currentPlayer;

        let playerLabel = `Player ${playerIndex + 1}`;
        if (gameMode === 'online' && Array.isArray(players) && players[playerIndex]) {
          playerLabel = players[playerIndex].username || `Player ${playerIndex + 1}`;
        }

        // The first player in the order is the one whose turn it is.
        const isFirstRendered = i === 0;

        return (
          <div
            key={playerIndex}
            className={`player-area ${isTurn ? 'current-player-area' : 'opponent-area'}`}>
            <h3>{playerLabel}</h3>
            {/* In online mode, the second rendered player is the opponent and gets a placeholder. */}
            {gameMode === 'online' && !isFirstRendered ? (
              <div className="opponent-hand-placeholder">
                <div className="card-back-placeholder">
                  <span>Opponent's Hand</span>
                </div>
              </div>
            ) : (
              <PlayerHand
                player={playerIndex}
                cards={hand}
                isCurrent={isTurn}
                gameMode={gameMode}
              />
            )}
          </div>
        );
      })}
    </section>
  );
});

const GameOverSection = React.memo(({ winner, scoreDetails, onRestart }) => {
  if (!scoreDetails) {
    return (
      <div className="game-over-section">
        <h2 id="game-over-title">Game Over</h2>
        <p>Calculating scores...</p>
      </div>
    );
  }

  const renderPlayerScores = (playerIndex) => {
    const details = scoreDetails[playerIndex];
    return (
      <div className="player-score-column">
        <h3>Player {playerIndex + 1}</h3>
        <div className="points-tally">
          <p className="points-label">Points</p>
          <p className="total-score">{details.total}</p>
        </div>
        <ul className="score-breakdown">
          <li>Cards ({details.cardCount}): <span>{details.mostCards} pt</span></li>
          <li>Spades ({details.spadeCount}): <span>{details.mostSpades} pts</span></li>
          <li>Aces: <span>{details.aces} pts</span></li>
          {details.bigCasino > 0 && <li>Big Casino (10♦): <span>{details.bigCasino} pts</span></li>}
          {details.littleCasino > 0 && <li>Little Casino (2♠): <span>{details.littleCasino} pts</span></li>}
        </ul>
      </div>
    );
  };

  return (
    <div className="game-over-section" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <h2 id="game-over-title">Game Over</h2>
      <div className="final-scores-container">
        {renderPlayerScores(0)}
        {renderPlayerScores(1)}
      </div>
      <div className="winner-declaration">
        {winner !== null ? `Winner: Player ${winner + 1}` : "It's a Tie!"}
      </div>
      <button
        onClick={onRestart}
        autoFocus
        aria-label="Start new game"
      >
        Play Again
      </button>
    </div>
  );
});

function GameBoard({ onRestart, gameMode, currentPlayerId, gameState: externalGameState }) {
  const {
    gameState: localGameState,
    modalInfo,
    handleTrailCard,
    handleDropOnCard,
    handleModalAction,
    setModalInfo,
    handleStageOpponentCardAction,
    handleCancelStagingStackAction,
    handleConfirmStagingStackAction,
  } = useGameActions();

  // Use external game state for online mode, local for offline
  const gameState = gameMode === 'online' ? externalGameState : localGameState;

  // Normalize the playerHands structure, as it differs between local and online state
  const normalizedPlayerHands = React.useMemo(() => {
    if (!gameState) return [[], []];
    if (gameMode === 'online' && Array.isArray(gameState.players)) {
      // Online state: { players: [{ hand: [...] }, ...] }
      return gameState.players.map(p => p.hand || []);
    }
    if (Array.isArray(gameState.playerHands)) {
      // Local state: { playerHands: [[...], [...]] }
      return gameState.playerHands;
    }
    return [[], []];
  }, [gameState, gameMode]);

  // Provide defaults for missing properties in online mode
  const safeGameState = {
    ...gameState,
    playerHands: normalizedPlayerHands,
    tableCards: gameState?.tableCards || [],
    playerCaptures: gameState?.playerCaptures || [[], []],
    currentPlayer: gameState?.currentPlayer ?? 0,
    round: gameState?.round ?? 1,
    gameOver: gameState?.gameOver ?? false
  };

  const { showInfo } = useNotifications();

  // State for round transition animation
  const [showRoundTransition, setShowRoundTransition] = React.useState(false);

  // Effect to show round transition animation when round changes to 2
  React.useEffect(() => {
    if (safeGameState.round === 2 && !showRoundTransition) {
      setShowRoundTransition(true);
      const timer = setTimeout(() => {
        setShowRoundTransition(false);
      }, 4000); // Show animation for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [safeGameState.round]);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.CARD,
      drop: (item, monitor) => {
        if (monitor.didDrop()) {
          return;
        }
        if (item.source === 'opponentCapture') {
          handleStageOpponentCardAction(item);
        } else if (item.source === 'hand') {
          handleTrailCard(item.card, item.player);
        } else {
          console.warn(`Card dropped on board from unhandled source: ${item.source}`);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [handleTrailCard, handleStageOpponentCardAction]
  );

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && modalInfo) {
      setModalInfo(null);
    }
  }, [modalInfo, setModalInfo]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main
      ref={drop}
      className="game-board"
      role="application"
      aria-label="Casino Card Game"
      tabIndex="-1"
    >
      <StatusSection round={safeGameState.round} />
      <div className="game-area">
        <CapturedCardsSection playerCaptures={safeGameState.playerCaptures} currentPlayer={safeGameState.currentPlayer} />
        <TableCardsSection
          tableCards={safeGameState.tableCards}
          onDropOnCard={handleDropOnCard}
          currentPlayer={safeGameState.currentPlayer}
          onCancelStack={handleCancelStagingStackAction}
          onConfirmStack={handleConfirmStagingStackAction}
        />
      </div>
      <PlayerHandsSection
        playerHands={safeGameState.playerHands}
        currentPlayer={safeGameState.currentPlayer}
        gameMode={gameMode}
        currentPlayerId={currentPlayerId}
        players={safeGameState.players}
      />

      {modalInfo && (
        <div className="modal-overlay" aria-hidden="false">
          <ActionModal
            modalInfo={modalInfo}
            onAction={handleModalAction}
            onCancel={() => setModalInfo(null)}
          />
        </div>
      )}

      {showRoundTransition && (
        <div className="round-transition">
          <h2>Round 2</h2>
          <p>Table cards carried over from Round 1</p>
        </div>
      )}

      {safeGameState.gameOver && (
        <GameOverSection
          winner={safeGameState.winner}
          scoreDetails={safeGameState.scoreDetails}
          onRestart={onRestart}
        />
      )}
    </main>
  );
}

export default React.memo(GameBoard);
