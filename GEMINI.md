# Gemini Developer Guide: Casino Card Game

This guide provides a comprehensive overview of the Casino card game's architecture, components, and game logic. It is intended to help developers understand the codebase and contribute to the project consistently.

## 1. Game Overview

**Game:** Casino
**Objective:** To score points by capturing cards from the table.
**Players:** 2
**Rounds:** 2

### Scoring Rules:

*   **Cards:** 1 point for capturing 21 or more cards in total.
*   **Spades:** 2 points for capturing 6 or more spades.
*   **Big Casino (10 of Diamonds):** 2 points
*   **Little Casino (2 of Spades):** 1 point
*   **Aces:** 1 point for each Ace captured.

## 2. Advanced Gameplay Mechanics

All complex player actions, such as creating builds or capturing multiple cards, are performed directly on the game table through a drag-and-drop stacking mechanic. The game logic infers the player's intent (e.g., Build, Capture, Add to Build) based on the cards being stacked and the context of the game. If a move is invalid, the cards automatically return to their original positions.

### 2.1 Core Interaction: Stacking

*   **Initiating an Action:** A player initiates an action by dragging a card from their hand onto a card on the table, or by dragging table cards onto each other. This creates a temporary stack.
*   **Intent Inference:** The game analyzes the final stack to determine the action:
    *   **Capture:** If the sum of table cards in the stack equals the value of the player's hand card dropped on top, it's a capture.
    *   **Build:** If the values don't match for a capture, the game checks if a valid build can be formed. This requires the player to hold a "capture card" in their hand matching the build's value.
*   **Invalid Moves:** If no valid action can be inferred, the stack disbands.

### 2.2 Building

Building allows players to combine cards on the table into a single unit with a specific value, which can be captured later.

#### Creating a New Build
A player can create a build in several ways:
1.  **Sum Build:** Drag a card from hand onto a table card. If the player holds a card matching the sum (e.g., drag a `2` from hand onto a `5` on the table to build a `7`, while holding a `7` in hand), a build of `7` is created.
2.  **Stacking Build:** Drag multiple loose table cards into a temporary stack, then drop a hand card on top. The game will attempt to form a build from the combination.
3.  **Base Build:** A more complex build where a player uses a hand card to bind multiple combinations of table cards that each sum to the hand card's value. For example, with a `9` in hand, a player could group a `[6, 3]` and a `[5, 4]` on the table into a single "base build" of 9. This build cannot be extended further.
4.  **Auto-Grouping Build:** If a player creates a build that matches the value of other loose cards or builds already on the table, the game will automatically group them. The existing matching items are placed at the bottom of the stack, and the cards used for the new build action are placed on top. For example, if a player uses their `6` and a table `2` to build an `8`, and there is already a loose `8` on the table, the game will create one large build of `8` with the cards ordered `[8, 6, 2]`. This consolidated build cannot be extended further.

#### Modifying Existing Builds
A player can add cards to any build on the table (their own or an opponent's) to "reinforce" it. This is a powerful strategic move that makes the build larger and transfers its ownership. This is done using a flexible, on-the-fly "Staging Stack".

*   **Creating and Growing a Staging Stack:**
    *   **Context is Key:** If a player already owns a build, the game enters a "staging mode". Any combination of cards that is not an immediate capture will automatically create or add to a temporary Staging Stack instead of showing an error.
    *   **How to Stage:** A player can create or add to a stack by dragging cards from multiple sources onto each other:
        *   A card from their hand onto a loose table card.
        *   A loose table card onto another loose table card.
        *   A card from the opponent's capture pile onto a loose card or an existing Staging Stack.
    *   The player's turn does not end while they are building their Staging Stack.

*   **Committing the Action:**
    1.  Once the Staging Stack is assembled, the player drags the entire stack and drops it onto a target build.
    2.  The game then validates the move.

*   **Validation Rules:**
    *   **Card Sources:** The final Staging Stack must contain exactly one card that originated from the player's hand.
    *   **Value Partitioning:** The cards in the Staging Stack must be perfectly partitionable into groups that each sum to the target build's value. For example, adding a stack of `[9, 1, 8, 2]` to a build of `10` is valid because it finds the combos `(9+1)` and `(8+2)`.

*   **Outcome:** The move creates a single, larger build. This new build is owned by the current player and cannot be extended further.
*   **Invalid Attempts:** If a player attempts to reinforce a build with a Staging Stack that fails validation, the Staging Stack will automatically disband. All cards within it (including the one from the player's hand) will be returned to the table as loose cards, and the player's turn will end.

### 2.3 Capturing

Capturing is the primary way to score points. A player uses a card from their hand to take matching cards or builds from the table.

*   **Simple Capture:** Use a hand card to capture one or more table cards/builds of the same value (e.g., use a `9` to capture a `9` and a build of `9`).
*   **Multi-Card Capture:** Stack multiple table cards that sum to the value of a hand card, then drop the hand card on top to capture the stack (e.g., stack a `4` and a `3`, then drop a `7` from hand to capture).

### 2.4 Special Mechanic: Using Opponent's Captured Cards

In a unique strategic twist, a player can use the top card from their opponent's capture pile as if it were a loose card on the table for one of their actions.

*   **How it works:** A player can drag the top card from the opponent's capture pile and combine it with cards from their hand or the table to perform a **Build** or **Capture**.
*   **Example (Temporal Build for Capture):** A player has a `9` in hand. The opponent's capture pile shows a `6`. The table has a `3`. The player can drag the opponent's `6` and the table's `3` together, then use their `9` to capture this temporary combination. The `6` is removed from the opponent's pile and added to the current player's capture.

## 3. Core Game Logic (`src/src/components/game-logic.js`)

This file is the heart of the game, containing all the rules and state management functions.

### Key Functions:

The logic is organized into several pure functions that manage the game state, grouped by purpose:
*   **Setup & Game Flow:** `initializeGame()`, `startNextRound()`, `handleSweep()`, `isRoundOver()`, `isGameOver()`, `endGame()`, and `calculateScores()`.
*   **Player Actions:**
    *   `handleTrail()`: Plays a card from hand to the table without capturing or building.
    *   `handleCapture()`: Manages all capture actions, including those involving an opponent's cards.
    *   `handleBuild()`: The primary function for creating a simple sum-build.
    *   `handleCreateBuildFromStack()`: Creates a build from a temporary stack of cards on the table.
    *   `handleBaseBuild()`: Creates a complex, multi-combination build.
    *   `handleAddToOwnBuild()`: Adds a card to a player's own existing build (increasing or reinforcing).
    *   `handleAddToOpponentBuild()`: Adds a card to an opponent's build, "stealing" it.
    *   `handleTemporalBuild()`: A helper for using an opponent's captured card in a play.
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

The UI is managed by `App.js` and the main `GameBoard.js` component. Key display components include `PlayerHand.js`, `TableCards.js`, and `CapturedCards.js`.
Interactive elements are handled by `DraggableCard.js` and `CardStack.js` (for builds and other stacks). The on-table stacking mechanic, managed within `GameBoard.js`, serves as the primary interface for all complex moves, removing the need for separate modals or staging zones for most actions.

### Custom Hooks:

* **`useGameState.js`**: A hook that encapsulates the game's state and provides action dispatchers (`trailCard`, `build`, `capture`, etc.).
* **`useGameActions.js`**: A more specialized hook used by `GameBoard.js` to handle complex user interactions, including managing the temporary state of card stacks on the table before a play is committed. It integrates with `game-logic.js` to validate and update the game state.

## 5. Development Guidelines

To ensure consistency and maintainability, please follow these guidelines when adding new features or modifying existing code.

### State Management:

*   All state updates must be **immutable**.
*   The `gameState` object is the **single source of truth**.

### Component Design:

*   Use functional components, hooks, and CSS modules.
*   Prioritize creating reusable components like `Card.js`.

### Game Logic:

*   All game rules must reside in `game-logic.js` as pure functions.
*   Do not implement game logic directly in React components.
*   Use the provided `logGameState` function for debugging.

### Adding New Features:

1. **Update Game Logic:** Start by adding or modifying the necessary functions in `game-logic.js`.
2. **Update Hooks:** If needed, update the `useGameState` or `useGameActions` hooks to expose the new functionality to the UI.
3. **Update Components:** Modify the relevant React components to incorporate the new feature.
4. **Write Tests:** Add unit tests for the new game logic and integration tests for the new UI components.

By following these guidelines, we can ensure that the Casino card game project remains well-structured, easy to understand, and maintainable.

The GitHub repository for this project is [https://github.com/lindabaloyi/official-casino-game](https://github.com/lindabaloyi/official-casino-game)

---
