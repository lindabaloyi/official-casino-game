/**
 * Game Logic Index
 * Main entry point for the modularized game logic system
 * Exports all functions for backward compatibility
 */

// Core game state management
export {
  initializeGame,
  shuffleDeck,
  updateGameState,
  nextPlayer,
  logGameState
} from './game-state.js';

// Card operations and utilities
export {
  rankValue,
  getCardId,
  removeCardFromHand,
  removeCardsFromTable,
  sortCardsByRank,
  calculateCardSum,
  generateBuildId,
  isValidBuildType
} from './card-operations.js';

// Optimized algorithms
export {
  findCombinationsDP,
  findBaseBuilds
} from './algorithms.js';

// Validation logic
export {
  validateBuild,
  validateTrail,
  validateAddToBuild
} from './validation.js';



export {
  handleTrail,
  handleBuild,
  handleCapture,
  handleBaseBuild,
  handleAddToBuild
} from './game-actions.js';
