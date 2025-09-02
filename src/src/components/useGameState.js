// Add logging to validate state transitions
import { useState, useEffect } from 'react';
import { initializeGame, calculateScores, isRoundOver, isGameOver } from './game-logic';

const useGameState = () => {
  const [gameState, setGameState] = useState(initializeGame());

  useEffect(() => {
    console.log('Initial Game State:', gameState);
  }, []);

  useEffect(() => {
    console.log('Updated Game State:', gameState);
  }, [gameState]);

  const currentPlayer = gameState.currentPlayer;
  const playerHands = gameState.playerHands;
  const tableCards = gameState.tableCards;
  const playerCaptures = gameState.playerCaptures;
  const round = gameState.round;
  const gameOver = isGameOver(gameState);
  const winner = gameOver ? calculateScores(gameState) : null;

  return { currentPlayer, playerHands, tableCards, playerCaptures, round, gameOver, winner };
};

export default useGameState;