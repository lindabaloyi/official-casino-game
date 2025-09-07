# Gemini Developer Guide: Casino Card Game

This guide provides a comprehensive overview of the Casino card game's architecture, components, and game logic. It is intended to help developers understand the codebase and contribute to the project consistently.

> **Note:** This project is undergoing a significant refactoring to improve modularity, performance, and user experience. This guide reflects the **target architecture** that all new development should align with.

## 1. Game Overview

**Game:** Casino
**Objective:** To score points by capturing cards from the table.
**Players:** 2
**Rounds:** 2

### Scoring Rules:

*   **Cards:** 2 points for capturing the most cards . 1 point each are awarded for a tie.
*   **Spades:** 2 points for capturing the most spades. 2 points each are awarded for a tie.
*   **Big Casino (10 of Diamonds):** 2 points
*   **Little Casino (2 of Spades):** 1 point
*   **Aces:** 1 point for each Ace captured.

## 2. Advanced Gameplay Mechanics

All player actions are performed directly on the game table through a flexible drag-and-drop system. This system is unified under a **"Staging First"** model: players assemble their move in a temporary **Staging Stack** and then confirm it. This gives players full control and makes the game flow more intuitive.

### 2.1 The Staging Stack

Instead of actions happening instantly, almost all moves are first assembled in a `Staging Stack`. This allows for complex, multi-card plays without the turn ending prematurely.

*   **Creating a Stack:** A player can start a `Staging Stack` by dragging cards onto each other from various sources:
    *   A card from their hand onto a loose table card.
    *   A loose table card onto another loose table card.
    *   A card from the opponent's capture pile onto a loose card or an existing `Staging Stack`.
*   **Real-time Validation:** If a player already owns a build, the game provides real-time feedback. If they try to add a card to the stack that makes it an invalid combination for their build, the move is instantly rejected, and the card snaps back to its origin.
*   **Confirm/Cancel:** While a `Staging Stack` is active, the player will see **Confirm (✓)** and **Cancel (X)** buttons.
    *   **Confirm:** Finalizes the move. The game analyzes the stack for all valid outcomes (captures or builds).
        *   If there is only **one** valid move, it is executed automatically.
        *   If there are **multiple** valid moves, a modal appears for the player to choose.
        *   If there are **zero** valid moves, the stack is disbanded, all cards are returned to their original sources (hand, table, or opponent's pile), and the turn ends as a penalty.
    *   **Cancel:** Aborts the move. The stack disbands, and all cards return to their original positions with no penalty. The player's turn continues.

### 2.2 Building

Building allows players to combine cards on the table into a single unit with a specific value, which can be captured later. **A player can only own one build at a time.**

#### Creating a New Build
A player creates a new build using the `Staging Stack`.
1.  **Assemble:** Combine one card from your hand with one or more loose table cards in a `Staging Stack`.
2.  **Confirm:** Click the **Confirm (✓)** button.
3.  **Validate:** The game runs two checks: you must not already own a permanent build, and you must have a card in your remaining hand that can capture the new build's value.
4.  **Ambiguous Moves:** If the stack could form multiple valid builds (e.g., a `[5, 3, 2]` stack could be a build of `5` or `10`), a modal will appear, prompting you to choose your intended action.

#### Modifying Existing Builds
A player can add cards to any build on the table (their own or an opponent's). A build can be extended until it contains a maximum of 5 cards.

*   **Adding to Your Own Build:** Assemble a `Staging Stack` of cards that reinforces your build (e.g., a `[9, 1]` stack to add to your build of 10). Drag the stack onto your build. The cards will merge, and your turn continues.
*   **Stealing an Opponent's Build:**
    *   **Simple Steal:** Drag a card from your hand onto an opponent's build. If the move is unambiguous and valid (e.g., dropping a `2` on their build of `7` while holding a `9`), you steal the build automatically. This ends your turn.
    *   **Complex Steal:** Assemble a `Staging Stack` and drop it on an opponent's build. The stack must contain exactly one hand card and be partitionable by the build's value. This creates a larger, reinforced build that you now own. This ends your turn.

#### The Auto-Grouping Exception
This is the only automatic action in the game.
*   **Trigger:** When a player successfully creates a **new, permanent build**.
*   **Action:** The game instantly scans the table for any other loose cards or builds that match the new build's value.
*   **Result:** All matching items are swept up and added to the *bottom* of the newly created build, creating a single, consolidated build and cleaning up the table.

### 2.3 Capturing

Capturing is the primary way to score points. All captures are initiated via the `Staging Stack` mechanic. The order in which cards are added to the stack is the order they will appear in the capture pile.

*   **Staging a Capture:** To capture, you create a `Staging Stack` that includes one card from your hand and the cards/builds from the table you wish to capture.
*   **Example - Sum Capture:** To use a hand `7` to capture a `4` and a `3` on the table:
    1.  Drag the hand `7` onto the table `4`. This creates a `Staging Stack`.
    2.  Drag the table `3` onto the `Staging Stack`.
    3.  Click the **Confirm (✓)** button. The game validates that the table cards (`4+3`) sum to the hand card (`7`) and executes the capture.

### 2.4 Using Opponent's Captured Cards

A player can use the top card from their opponent's capture pile as if it were a loose card on the table. This must be done explicitly.

*   **How it works:** A player must manually drag the top card from the opponent's capture pile and add it to their `Staging Stack` to include it in a build or capture. The game will not do this automatically.

## 3. Core Game Logic (`src/components/game-logic/`)
### 2.5 Trailing

Trailing is playing a card from your hand directly to the table without capturing or building.

*   **Round 1:** Trailing is an instant action. You cannot trail a card if a card of the same rank is on the table, or if you own a build.
*   **Round 2:** To provide more flexibility, trailing a card now initiates a `Staging Stack`.
    1.  Drop a card from your hand onto the empty table area. This creates a single-card `Staging Stack`.
    2.  You can then either add more cards to it to form a combo, or click **Confirm (✓)** to finalize the trail and end your turn.
    3.  Clicking **Cancel (X)** will return the card to your hand.

The game's logic has been modularized from a single monolithic file into a directory of focused modules. This separation of concerns makes the codebase easier to understand, maintain, and test. The core logic now resides in `src/components/game-logic/`.

### Key Functions:

The logic is organized into pure functions across several files:
*   **`index.js`**: Exports all public functions from the other modules, providing a single entry point for the game logic.
*   **`game-state.js`**: Handles game initialization and high-level state transitions like starting new rounds or ending the game. Contains `initializeGame()`, `startNextRound()`, etc.
*   **`card-operations.js`**: Contains pure functions for manipulating card collections, such as adding/removing cards from hands, the table, or capture piles.
*   **`validation.js`**: Provides functions to validate player moves, such as `findValidCaptures()`, `findValidBuilds()`, and `validateBuild()`.
*   **`algorithms.js`**: Houses complex algorithms, including the optimized dynamic programming version of `findCombinationsDP` for finding card combinations that sum to a target value.
*   **`scoring.js`**: Contains all logic related to calculating scores at the end of a round or the game.

All functions that orchestrate player actions are designed to be pure, receiving the current game state and player input, and returning a new game state object.

#### Example Player Actions:

*   **Setup & Game Flow:** `initializeGame()`, `startNextRound()`, `handleSweep()`, `isRoundOver()`, `isGameOver()`, `endGame()`, and `calculateScores()`.
*   **Player Actions:**
    *   `handleTrail()`: Plays a card from hand to the table without capturing or building.
    *   `handleCapture()`: Manages all capture actions, including those involving an opponent's cards.
    *   `handleBuild()`: The primary function for creating a simple sum-build.
    *   `handleCreateBuildFromStack()`: Creates a build from a temporary stack of cards on the table.
    *   `handleBaseBuild()`: Creates a complex, multi-combination build.
    *   `handleAddToOwnBuild()`: Adds a card to a player's own existing build (increasing or reinforcing).
    *   `handleAddToOpponentBuild()`: Adds a card to an opponent's build, "stealing" it.
*   **Validation & Helpers:** A suite of functions like `findValidCaptures()`, `findValidBuilds()`, and `validateBuild()` determine possible moves and ensure rules are followed.

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

* **`deck`**: An array of card objects remaining in the deck.
* **`playerHands`**: A 2D array representing the cards in each player's hand.
* **`tableCards`**: An array of cards and build objects currently on the table.
* **`playerCaptures`**: A 3D array storing the groups of cards captured by each player.
* **`currentPlayer`**: The index of the player whose turn it is.
* **`round`**: The current round number.
* **`scores`**: An array containing the scores for each player.
* **`gameOver`**: A boolean indicating if the game has ended.
* **`winner`**: The index of the winning player, or `null` if there is no winner yet.

### Card and Build Objects:

* **Card Object:**

  ```javascript
  {
    suit: '♠' | '♥' | '♦' | '♣',
    rank: 'A' | '2' | ... | '10',
    value: number
  }
  ```

* **Build Object:**

  ```javascript
  {
    buildId: string,
    type: 'build',
    cards: Array<Card>,
    value: number,
    owner: 0 | 1
  }
  ```

## 4. React Components

The UI is built with React and organized into several components.

### UI Components

The UI is managed by `App.js` and the main `GameBoard.js` component. The component structure follows the modular plan outlined in the refactoring guide:

```
src/components/ui/
├── GameBoard.js
├── PlayerHand.js
├── TableCards.js
├── CapturedCards.js
├── ComboZone.js
└── notifications/
    ├── NotificationSystem.js
    └── Toast.js
```

Interactive elements are handled by `DraggableCard` and `CardStack` components. The on-table stacking mechanic, managed within `GameBoard.js`, serves as the primary interface for all complex moves.

### Custom Hooks:

*   **`useGameState.js`**: Encapsulates the core `gameState` object and provides memoized selectors to derive state for UI components.
*   **`useGameActions.js`**: A specialized hook used by `GameBoard.js` to handle complex user interactions. It orchestrates calls to the pure functions in `game-logic` and manages temporary UI state, like the staging of card stacks.
*   **`useNotifications.js`**: A hook that provides functions (`showError`, `showSuccess`, etc.) to display non-blocking toast notifications for user feedback, replacing browser `alert()`s.

## 5. Development Guidelines

To ensure consistency and maintainability, please follow these guidelines when adding new features or modifying existing code.

### State Management:
*   All state updates must be **immutable**. Use spread syntax (`...`) for objects and arrays instead of direct mutation. Avoid expensive deep cloning like `JSON.parse(JSON.stringify())`.
*   The `gameState` object is the **single source of truth**.

### Component Design:
*   Use functional components, hooks, and CSS modules.
*   Prioritize creating reusable components like `Card.js`.
*   Ensure components are accessible by providing ARIA labels and keyboard navigation support (`onKeyDown`).

### Error Handling & User Feedback:
*   **Never use `alert()`**. All user feedback should be provided through the `useNotifications` hook.
*   Game logic functions should not produce side effects. For invalid moves, they should return the original, unmodified game state. The calling function in `useGameActions` is responsible for triggering the notification.

### Performance:
*   Be mindful of algorithmic complexity. Use efficient solutions, such as the dynamic programming approach for `findCombinationsDP`, for operations that may run frequently.
*   Use `React.memo` to prevent unnecessary re-renders of components that receive complex props.

### Game Logic:

*   All game rules must reside in `game-logic.js` as pure functions.
*   Do not implement game logic directly in React components.
*   Use the provided `logGameState` function for debugging.

### Testing:
*   **Unit Tests:** All new game logic functions in `src/components/game-logic/` must have corresponding unit tests.
*   **Integration Tests:** Create integration tests for complete game flows to validate UI state synchronization and user interactions.

### Adding New Features:

1.  **Update Game Logic:** Start by adding or modifying the necessary pure functions in the appropriate module within `src/components/game-logic/`.
2.  **Write Unit Tests:** Add unit tests for the new logic to ensure correctness.
3.  **Update Hooks:** If needed, update the `useGameActions` hook to orchestrate the new logic.
4.  **Update Components:** Modify the relevant React components in `src/components/ui/` to incorporate the new feature.
5.  **Write Integration Tests:** Add tests to verify the feature works end-to-end.

By following these guidelines, we can ensure that the Casino card game project remains well-structured, easy to understand, and maintainable.

The GitHub repository for this project is [https://github.com/lindabaloyi/official-casino-game](https://github.com/lindabaloyi/official-casino-game)

---
