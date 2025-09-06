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
  calculateCardSum,
  removeCardFromHand,
  removeCardsFromTable,
  sortCardsByRank,
  generateBuildId,
  isValidBuildType,
  findOpponentMatchingCards,
  countIdenticalCardsInHand,
  createCaptureStack
} from './card-operations.js';

// Optimized algorithms
export {
  findCombinationsDP,
  findBaseBuilds,
  canPartitionIntoSums
} from './algorithms.js';

// Validation logic
export {
  validateBuild,
  validateTrail,
  validateAddToBuild,
  validateAddToOpponentBuild,
  validateTemporaryStackBuild
} from './validation.js';



export {
  handleTrail,
  handleBuild,
  handleCapture,
  handleBaseBuild,
  handleAddToOwnBuild,
  handleCreateBuildFromStack,
  handleAddToBuild,
  handleTemporalBuild,
  handleAddToOpponentBuild,
  startNextRound,
  handleSweep,
  calculateScores,
  endGame,
  handleCreateStagingStack,
  handleReinforceBuildWithStack,
  handleAddToStagingStack,
  handleDisbandStagingStack,
  handleCancelStagingStack
} from './game-actions.js';
