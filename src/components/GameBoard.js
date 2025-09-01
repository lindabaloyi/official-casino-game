import React, { useCallback } from 'react';
import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import { useDrop } from 'react-dnd';
import './GameBoard.css';
import CapturedCards from './CapturedCards';
import { useGameActions } from './useGameActions';
import ActionModal from './ActionModal';

const ItemTypes = {
  CARD: 'card',
};

const StatusSection = React.memo(({ round }) => (
  <div className="status-section">
    <p>Round: {round}</p>
  </div>
));

const CapturedCardsSection = React.memo(({ playerCaptures }) => (
  <div className="captured-cards-positioned">
    {playerCaptures.map((capturedCards, index) => (
      <CapturedCards key={index} player={index} cards={capturedCards} />
    ))}
  </div>
));

const TableCardsSection = React.memo(({ tableCards, onDropOnCard }) => (
  <div className="table-cards-section">
    <TableCards cards={tableCards} onDropOnCard={onDropOnCard} />
  </div>
));

const PlayerHandsSection = React.memo(({ playerHands, currentPlayer }) => (
  <div className="player-hands-section">
    {playerHands.map((hand, index) => (
      <PlayerHand
        key={index}
        player={index}
        cards={hand}
        isCurrent={currentPlayer === index}
      />
    ))}
  </div>
));

const GameOverSection = React.memo(({ winner, onRestart }) => (
  <div className="game-over-section">
    <h2>Game Over</h2>
    <p>Winner: Player {winner + 1}</p>
    <button onClick={onRestart}>Play Again</button>
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

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ItemTypes.CARD,
      drop: (item, monitor) => {
        if (monitor.didDrop()) {
          return;
        }
        handleTrailCard(item.card, item.player);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [handleTrailCard]
  );

  const isActive = isOver && canDrop;

  return (
    <div ref={drop} className={`game-board ${isActive ? 'active-drop' : ''}`}>
      <StatusSection round={gameState.round} />
      <CapturedCardsSection playerCaptures={gameState.playerCaptures} />
      <TableCardsSection
        tableCards={gameState.tableCards}
        onDropOnCard={handleDropOnCard}
      />
      <PlayerHandsSection
        playerHands={gameState.playerHands}
        currentPlayer={gameState.currentPlayer}
      />
      <ActionModal
        modalInfo={modalInfo}
        onAction={handleModalAction}
        onCancel={() => setModalInfo(null)}
      />
      {gameState.gameOver && (
        <GameOverSection winner={gameState.winner} onRestart={onRestart} />
      )}
    </div>
  );
}

export default React.memo(GameBoard);
