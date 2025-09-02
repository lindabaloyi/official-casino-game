# Gemini Developer Guide: Casino Card Game

This guide provides a comprehensive overview of the Casino card game's architecture, components, and game logic. It is intended to help developers understand the codebase and contribute to the project consistently.

## 1. Game Overview

**Game:** Casino
**Objective:** To score points by capturing cards from the table.
**Players:** 2
**Rounds:** 2

### Scoring Rules:

*   **6+ spades:** 2 point
*   **21+ cards:** 1 point
*   **Big Casino (10 of Diamonds):** 2 points
*   **Little Casino (2 of Spades):** 1 point
*   **Aces:** 1 point each

## 2. Advanced Gameplay Mechanics

### 2.1 The Combo Zone

To facilitate complex and strategic plays without diminishing player skill, the game includes a dedicated UI component known as the **Combo Zone**. This feature is the primary interface for all multi-card actions.

**Purpose:**
The Combo Zone is a temporary staging area on the game board where players can manually assemble combinations of cards for either a Build or a Capture action. Its design philosophy is to provide a tool for players to execute their strategy, not an automated assistant that suggests or validates moves prematurely.

**Functionality:**

* **Activation:** The zone activates when a player drags any card into it.
* **Manual Assembly:** The player has full control to drag cards from their hand and/or the table into the zone. The only feedback provided during this stage is the real-time sum of the cards’ values.
* **Player Declaration:** After assembling their desired combination, the player must explicitly declare their intent by clicking one of two buttons:

  * **Build:** To create a new build on the table. The action is validated to ensure the rules of building are met (e.g., one card from hand, player holds a matching capture card).
  * **Capture:** For an immediate capture of table cards. The action is validated to ensure the player holds a hand card matching the sum of the staged table cards.

This component replaces the need for separate modals or automated helpers for complex plays, ensuring a consistent and skill-based user experience.

### 2.2 Combo Zone Scenarios

The following scenarios illustrate common uses of the Combo Zone for advanced plays.

#### Scenario 1: Multi-Card Capture

A player with a `9♦` in hand wants to capture table cards `4♥`, `3♠`, and `2♣`.
1.  Drag table cards into the zone from highest to lowest value (`4♥` -> `3♠` -> `2♣`).
2.  Drag the capturing card (`9♦`) from hand into the zone.
3.  Click **"Capture"**.
*Outcome:* The move is validated (4+3+2=9), and the cards are captured.

#### Scenario 2: Creating a Build

A player with a `7♥` and a `9♠` in hand wants to build a 9 using the `2♣` on the table.
1.  Drag cards for the build into the zone from highest to lowest value (`7♥` from hand -> `2♣` from table).
2.  Click **"Build"**.
*Outcome:* The logic validates that the player holds a `9♠` to capture the build later. A new build of 9 is created on the table.

#### Scenario 3: Capturing a Build and a Loose Card

A player with a `10♦` wants to capture both a build of 10 and a loose `10♣` from the table.
1.  Drag the build of 10 and the loose `10♣` into the zone (order doesn't matter as they have the same value).
2.  Drag the capturing card (`10♦`) from hand into the zone.
3.  Click **"Capture"**.
*Outcome:* The logic validates that the `10♦` matches the value of each item. All cards are captured.

#### Scenario 4: Invalid Build Attempt (No Capture Card)

A player with a `7♥` (but no 9) tries to build a 9 with a `2♣` from the table.
1.  Drag `7♥` and `2♣` into the zone.
2.  Click **"Build"**.
*Outcome:* The move is invalid because the player does not hold a 9 to capture the build. An alert is shown, and cards are returned.

#### Scenario 5: Adding to an Existing Build

A player wants to add their `5♦` and the table's `4♣` to their own existing build of 9. The player holds a `9♣` to capture it later.
1.  Drag items into the zone from highest to lowest value: the build of 9, the `5♦` from hand, then the `4♣` from the table.
2.  Click **"Build"**.
*Outcome:* The logic validates ownership, the sum of new cards (5+4=9), and that the player still holds a 9. The build is updated.

## 3. Core Game Logic (`src/src/components/game-logic.js`)

This file is the heart of the game, containing all the rules and state management functions.

### Key Functions:

The logic is organized into several pure functions that manage the game state:
*   **Setup & Game Flow:** `initializeGame()`, `isRoundOver()`, `isGameOver()`, and `calculateScores()`.
*   **Player Actions:** A suite of `handle...` functions like `handleTrail()`, `handleBuild()`, `handleCapture()`, `handleAddToBuild()`, and their complex counterparts for the Combo Zone.
*   **Validation & Helpers:** Functions like `findValidCaptures()` and `findValidBuilds()` determine possible moves for the player.

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

Interactive elements are handled by `DraggableCard.js`, `CardStack.js` for builds, and the `ActionModal.js` for simple choices. The most important interactive component is the `ComboZone.js`, which serves as the staging area for all complex moves.

### Custom Hooks:

* **`useGameState.js`**: A hook that encapsulates the game's state and provides action dispatchers (`trailCard`, `build`, `capture`, etc.).
* **`useGameActions.js`**: A more specialized hook used by `GameBoard.js` to handle complex user interactions, including managing the temporary state of the Combo Zone before a play is committed. It integrates with `game-logic.js` to update the game state.

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
