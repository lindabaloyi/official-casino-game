import { useState } from 'react';
import {
  initializeGame,
  handleTrail,
  handleBuild,
  handleAddToBuild,
  handleCapture,
  findValidCaptures,
  findValidBuilds,
} from './game-logic';

/**
 * Custom hook to manage game state and provide handlers for game actions.
 */
const useGameState = () => {
  const [gameState, setGameState] = useState(() => initializeGame());

  /**
   * Handler to trail a card.
   * @param {object} card - The card to trail.
   */
  const trailCard = (card) => {
    const newState = handleTrail(gameState, card);
    if (newState !== gameState) {
      setGameState(newState);
    }
  };

  /**
   * Handler to create a build.
   * @param {object} playerCard - The card played from the hand.
   * @param {Array} tableCardsInBuild - The cards from the table to include in the build.
   * @param {number} buildValue - The target value of the build.
   */
  const build = (playerCard, tableCardsInBuild, buildValue) => {
    const newState = handleBuild(gameState, playerCard, tableCardsInBuild, buildValue);
    if (newState !== gameState) {
      setGameState(newState);
    }
  };

  /**
   * Handler to add cards to an existing build.
   * @param {object} playerCard - The card played from the hand.
   * @param {object} tableCard - The loose card from the table to add to the build.
   * @param {object} buildToAddTo - The build object being modified.
   */
  const addToBuild = (playerCard, tableCard, buildToAddTo) => {
    const newState = handleAddToBuild(gameState, playerCard, tableCard, buildToAddTo);
    if (newState !== gameState) {
      setGameState(newState);
    }
  };

  /**
   * Handler to capture cards from the table.
   * @param {object} selectedCard - The card selected from the player's hand.
   * @param {Array} selectedTableCards - The cards selected from the table to capture.
   */
  const capture = (selectedCard, selectedTableCards) => {
    const newState = handleCapture(gameState, selectedCard, selectedTableCards);
    if (newState !== gameState) {
      setGameState(newState);
    }
  };

  /**
   * Finds valid captures for a selected card.
   * @param {object} selectedCard - The card selected from the player's hand.
   * @returns {Array} Array of valid captures.
   */
  const getValidCaptures = (selectedCard) => {
    return findValidCaptures(selectedCard, gameState.tableCards);
  };

  /**
   * Finds valid builds for a selected card.
   * @param {object} selectedCard - The card selected from the player's hand.
   * @returns {Array} Array of valid builds.
   */
  const getValidBuilds = (selectedCard) => {
    return findValidBuilds(selectedCard, gameState.tableCards);
  };

  /**
   * Drag and drop handlers with validation and appropriate game logic calls.
   * @param {DragEvent} event - The drop event.
   * @param {string} dropTarget - The target where the card is dropped ('table', 'build', 'capture', etc.).
   * @param {object} options - Additional options depending on drop target.
   */
  const onDragStart = (event, card) => {
    event.dataTransfer.setData('card', JSON.stringify(card));
  };

  const onDrop = (event, dropTarget, options = {}) => {
    event.preventDefault();
    const cardData = event.dataTransfer.getData('card');
    if (!cardData) return;
    const card = JSON.parse(cardData);

    switch (dropTarget) {
      case 'table':
        // Trail card to table
        trailCard(card);
        break;
      case 'build':
        // Add to existing build
        if (options.build && options.tableCard) {
          addToBuild(card, options.tableCard, options.build);
        }
        break;
      case 'capture':
        // Capture cards from table
        if (options.selectedTableCards) {
          capture(card, options.selectedTableCards);
        }
        break;
      case 'newBuild':
        // Create a new build
        if (options.tableCardsInBuild && typeof options.buildValue === 'number') {
          build(card, options.tableCardsInBuild, options.buildValue);
        }
        break;
      default:
        console.warn(`Unhandled drop target: ${dropTarget}`);
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  return {
    gameState,
    trailCard,
    build,
    addToBuild,
    capture,
    getValidCaptures,
    getValidBuilds,
    onDragStart,
    onDrop,
    onDragOver,
  };
};

export default useGameState;