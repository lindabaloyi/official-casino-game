// Add logging to validate actions
import { useState, useEffect } from 'react';
import { initializeGame, calculateScores, isRoundOver, isGameOver } from './game-logic';

const useGameActions = () => {
  const [gameState, setGameState] = useState(initializeGame());

  useEffect(() => {
    console.log('Initial Game State:', gameState);
  }, []);

  const trailCard = gameState.tableCards[gameState.tableCards.length - 1];

  const build = (card) => {
    console.log('Build Action:', card);
    // Build logic here
  };

  const addToBuild = (card) => {
    console.log('Add to Build Action:', card);
    // Add to build logic here
  };

  const capture = (playerIndex, cards) => {
    console.log('Capture Action:', playerIndex, cards);
    // Capture logic here
  };

  return { gameState, trailCard, build, addToBuild, capture };
};

export default useGameActions;