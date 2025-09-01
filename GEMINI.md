# Gemini Developer Guide: Casino Card Game

This guide provides a comprehensive overview of the Casino card game's architecture, components, and game logic. It is intended to help developers understand the codebase and contribute to the project consistently.

## 1. Game Overview

**Game:** Casino
**Objective:** To score points by capturing cards from the table.
**Players:** 2
**Rounds:** 2

### Scoring Rules:

*   **Most Cards:** 3 points
*   **Big Casino (10 of Diamonds):** 2 points
*   **Little Casino (2 of Spades):** 1 point
*   **Aces:** 1 point each

## 2. Core Game Logic (`src/src/components/game-logic.js`)

This file is the heart of the game, containing all the rules and state management functions.

### Key Functions:

*   `initializeGame()`: Sets up the initial game state, including a shuffled deck, player hands, and an empty table.
*   `handleTrail(gameState, card)`: Manages the "trail" action, where a player adds a card to the table.
*   `handleBuild(gameState, playerCard, tableCardsInBuild, buildValue)`: Creates a new build on the table.
*   `handleAddToBuild(gameState, playerCard, tableCard, buildToAddTo)`: Adds a card to an existing build.
*   `handleCapture(gameState, selectedCard, selectedTableCards)`: Manages the "capture" action, where a player takes cards from the table.
*   `findValidCaptures(selectedCard, tableCards)`: Determines all possible captures a player can make with a selected card.
*   `findValidBuilds(selectedCard, tableCards)`: Determines all possible builds a player can create with a selected card.
*   `calculateScores(playerCaptures)`: Calculates the final scores at the end of a round.
*   `isRoundOver(gameState)`: Checks if the current round has ended.
*   `isGameOver(gameState)`: Checks if the entire game has ended.

### Game State Object:

The `gameState` object is the single source of truth for the game's state. It has the following structure:

```javascript
{
  deck: Array<Card>,
  playerHands: Array<Array<Card>>,
  tableCards: Array<Card | Build>,
  playerCaptures: Array<Array<Array<Card>>>,
  currentPlayer: 0 | 1,
  round: 1 | 2,
  scores: Array<number>,
  gameOver: boolean,
  winner: 0 | 1 | null,
}
```

*   **`deck`**: An array of card objects remaining in the deck.
*   **`playerHands`**: A 2D array representing the cards in each player's hand.
*   **`tableCards`**: An array of cards and build objects currently on the table.
*   **`playerCaptures`**: A 3D array storing the groups of cards captured by each player.
*   **`currentPlayer`**: The index of the player whose turn it is.
*   **`round`**: The current round number.
*   **`scores`**: An array containing the scores for each player.
*   **`gameOver`**: A boolean indicating if the game has ended.
*   **`winner`**: The index of the winning player, or `null` if there is no winner yet.

### Card and Build Objects:

*   **Card Object:**
    ```javascript
    {
      suit: '♠' | '♥' | '♦' | '♣',
      rank: 'A' | '2' | ... | '10',
      value: number
    }
    ```
*   **Build Object:**
    ```javascript
    {
      buildId: string,
      type: 'build',
      cards: Array<Card>,
      value: number,
      owner: 0 | 1
    }
    ```

## 3. React Components

The UI is built with React and organized into several components.

### Main Components:

*   **`App.js`**: The root component that sets up the Drag and Drop context and renders the `GameBoard`.
*   **`GameBoard.js`**: The primary container for the entire game interface. It uses the `useGameActions` hook to manage state and renders all other game components.

### Game-Specific Components:

*   **`PlayerHand.js`**: Displays the cards in a player's hand.
*   **`TableCards.js`**: Renders the loose cards and builds on the table.
*   **`CapturedCards.js`**: Shows the cards each player has captured.
*   **`Card.js`**: A simple component to display a single card.
*   **`DraggableCard.js`**: A wrapper around `Card.js` that makes cards draggable.
*   **`CardStack.js`**: A component that can represent a stack of cards, used for builds and captured cards.
*   **`ActionModal.js`**: A modal that appears when a player's move has multiple possible outcomes (e.g., capture or build).

### Custom Hooks:

*   **`useGameState.js`**: A hook that encapsulates the game's state and provides action dispatchers (`trailCard`, `build`, `capture`, etc.).
*   **`useGameActions.js`**: A more specialized hook used by `GameBoard.js` to handle complex user interactions and modal logic. It integrates with `game-logic.js` to update the game state.

## 4. Development Guidelines

To ensure consistency and maintainability, please follow these guidelines when adding new features or modifying existing code.

### State Management:

*   **Immutable State:** All state updates must be immutable. Do not mutate the `gameState` object directly. Instead, create a new object with the updated values. The existing logic in `game-logic.js` already follows this pattern.
*   **Single Source of Truth:** The `gameState` object should remain the single source of truth for all game-related data.

### Component Design:

*   **Functional Components and Hooks:** Use functional components and hooks for all new UI components.
*   **Component Reusability:** Create reusable components whenever possible. For example, the `Card` component is used in multiple places.
*   **CSS Modules:** Use CSS modules for styling to avoid class name collisions. Create a corresponding `.css` file for each component.

### Game Logic:

*   **Centralized Logic:** All game rules and logic should reside in `game-logic.js`. Avoid implementing game logic directly in React components.
*   **Pure Functions:** The functions in `game-logic.js` should be pure functions as much as possible. They should take the current game state and any necessary parameters and return a new game state.
*   **Logging:** Use the `logGameState` function in `game-logic.js` to log the game state after each move during development. This is helpful for debugging.

### Adding New Features:

1.  **Update Game Logic:** Start by adding or modifying the necessary functions in `game-logic.js`.
2.  **Update Hooks:** If needed, update the `useGameState` or `useGameActions` hooks to expose the new functionality to the UI.
3.  **Update Components:** Modify the relevant React components to incorporate the new feature.
4.  **Write Tests:** Add unit tests for the new game logic and integration tests for the new UI components.

By following these guidelines, we can ensure that the Casino card game project remains well-structured, easy to understand, and maintainable.

The GitHub repository for this project is https://github.com/lindabaloyi/official-casino-game