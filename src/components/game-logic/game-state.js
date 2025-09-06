/**
 * Game State Module
 * Handles game state initialization, management, and core state operations
 */

import { rankValue } from './card-operations.js';

/**
 * Shuffles the deck of cards using Fisher-Yates algorithm.
 * @param {Array} deck - The deck to shuffle.
 * @returns {Array} The shuffled deck.
 */
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Initializes the game state, including shuffling the deck and dealing cards.
 * @returns {object} The initial game state.
 */
export const initializeGame = () => {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];

  // Create deck
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: rankValue(rank)
      });
    }
  }

  // Shuffle and deal
  deck = shuffleDeck(deck);
  const playerHands = [[], []];

  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop());
    playerHands[1].push(deck.pop());
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
};

/**
 * Creates an immutable copy of the game state with updated properties.
 * @param {object} gameState - The current game state.
 * @param {object} updates - The properties to update.
 * @returns {object} The new game state.
 */
export const updateGameState = (gameState, updates) => {
  return {
    ...gameState,
    ...updates,
  };
};

/**
 * Advances to the next player's turn.
 * @param {object} gameState - The current game state.
 * @returns {object} The updated game state.
 */
export const nextPlayer = (gameState) => {
  return updateGameState(gameState, {
    currentPlayer: (gameState.currentPlayer + 1) % 2
  });
};



/**
 * Logs the current state of the game for debugging purposes.
 * @param {string} moveDescription - A description of the move that just occurred.
 * @param {object} gameState - The game state to log.
 */
export const logGameState = (moveDescription, gameState) => {
  // Using console.group for better readability
  console.group(`%cMove: ${moveDescription}`, 'color: blue; font-weight: bold;');

  console.log('Table Cards:', gameState.tableCards.map(c =>
    c.type === 'build' ? `Build(${c.value})` : `${c.rank}${c.suit}`
  ));

  console.log('Player 1 Hand:', gameState.playerHands[0].map(c => `${c.rank}${c.suit}`));
  console.log('Player 2 Hand:', gameState.playerHands[1].map(c => `${c.rank}${c.suit}`));

  console.log('Player 1 Captures:', gameState.playerCaptures[0].length);
  console.log('Player 2 Captures:', gameState.playerCaptures[1].length);

  console.log(`Next turn: Player ${gameState.currentPlayer + 1}`);
  console.groupEnd();
};