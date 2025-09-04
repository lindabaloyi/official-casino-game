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

const CapturedCardsSection = React.memo(({ playerCaptures, currentPlayer }) => (
  <section
    className="captured-cards-positioned"
    aria-label="Captured Cards"
  >
    {playerCaptures.map((capturedGroups, index) => {
      const allCapturedCards = (capturedGroups || []).flat();
      const hasCards = allCapturedCards.length > 0;
      const isOpponent = index !== currentPlayer;
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
        <div key={index} className="captured-cards" ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: (hasCards && isOpponent) ? 'grab' : 'default' }}>
          <h3>Player {index + 1} Captures</h3>
          {hasCards ? (
            <CardStack
              cards={allCapturedCards}
              isBuild={true} // This ensures only the top card is visible
            />
          ) : (
            <div className="cards-container empty"><p>No Cards.</p></div>
          )}
        </div>
      );
    })}
  </section>
));

const TableCardsSection = React.memo(({ tableCards, onDropOnCard }) => (
  <section
    className="table-cards-section"
    aria-label="Table Cards"
    role="main"
  >
    <TableCards cards={tableCards} onDropOnCard={onDropOnCard} />
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

const GameOverSection = React.memo(({ winner, onRestart }) => (
  <div
    className="game-over-section"
    role="dialog"
    aria-modal="true"
    aria-labelledby="game-over-title"
  >
    <h2 id="game-over-title">Game Over</h2>
    <p>Winner: Player {winner + 1}</p>
    <button
      onClick={onRestart}
      autoFocus
      aria-label="Start new game"
    >
      Play Again
    </button>
  </div>
));

function GameBoard({ onRestart }) {
  const {
    gameState,
    modalInfo,
    handleTrailCard,
    handleDropOnCard,
    handleModalAction,
    setModalInfo,
  } = useGameActions();

  const { showInfo } = useNotifications();

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.CARD,
      drop: (item, monitor) => {
        if (monitor.didDrop()) {
          return;
        }
        console.log(`Trail drop - Player: ${item.player}, Card: ${item.card.rank}`);
        handleTrailCard(item.card, item.player);
        // Note: handleTrailCard now handles state updates internally
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [handleTrailCard, showInfo]
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

      {gameState.gameOver && (
        <GameOverSection winner={gameState.winner} onRestart={onRestart} />
      )}
    </main>
  );
}

export default React.memo(GameBoard);
