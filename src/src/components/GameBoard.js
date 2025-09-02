// Add logging to validate game state
import React, { useEffect } from 'react';
import { useGameActions, useGameState } from './useGameActions';
import TableCards from './TableCards';
import PlayerHand from './PlayerHand';
import CapturedCards from './CapturedCards';

const GameBoard = () => {
  const { gameState, trailCard, build, addToBuild, capture } = useGameActions();
  const { currentPlayer, playerHands, tableCards, playerCaptures, round, gameOver, winner } = useGameState();

  useEffect(() => {
    console.log('Game State:', gameState);
  }, [gameState]);

  // Rest of the component code
  return (
    <div>
      <TableCards tableCards={tableCards} trailCard={trailCard} build={build} addToBuild={addToBuild} />
      <PlayerHand playerHand={playerHands[currentPlayer]} capture={capture} />
      <CapturedCards playerCaptures={playerCaptures} />
    </div>
  );
};

export default GameBoard;