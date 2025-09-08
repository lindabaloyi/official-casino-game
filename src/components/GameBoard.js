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
    <TableCards cards={tableCards} onDropOnCard={onDropOnCard} currentPlayer={currentPlayer} onCancelStack={onCancelStack} onConfirmStack={onConfirmStack} />
  </section>
));

const PlayerHandsSection = React.memo(({ playerHands, currentPlayer }) => (
  <section
    className="player-hands-section"
    aria-label="Player Hands"
  >
    {playerHands.map((hand, index) => (
      <div
        key={index}
        className={`player-area ${currentPlayer === index ? 'current-player-area' : 'opponent-area'}`}>
        <h3>
          Player {index + 1}
        </h3>
        <PlayerHand
          player={index}
          cards={hand}
          isCurrent={currentPlayer === index}
        />
      </div>
    ))}
  </section>
));

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

function GameBoard({ onRestart }) {
  const {
    gameState,
    modalInfo,
    handleTrailCard,
    handleDropOnCard,
    handleModalAction,
    setModalInfo,
    handleStageOpponentCardAction,
    handleCancelStagingStackAction,
    handleConfirmStagingStackAction,
  } = useGameActions();

  const { showInfo } = useNotifications();

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
  }, [gameState.round]); // Remove showRoundTransition from dependencies

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
      <StatusSection round={gameState.round} />
      <div className="game-area">
        <CapturedCardsSection playerCaptures={gameState.playerCaptures} currentPlayer={gameState.currentPlayer} />
        <TableCardsSection
          tableCards={gameState.tableCards}
          onDropOnCard={handleDropOnCard}
          currentPlayer={gameState.currentPlayer}
          onCancelStack={handleCancelStagingStackAction}
          onConfirmStack={handleConfirmStagingStackAction}
        />
      </div>
      <PlayerHandsSection
        playerHands={gameState.playerHands}
        currentPlayer={gameState.currentPlayer}
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

      {gameState.gameOver && (
        <GameOverSection
          winner={gameState.winner}
          scoreDetails={gameState.scoreDetails}
          onRestart={onRestart}
        />
      )}
    </main>
  );
}

export default React.memo(GameBoard);
