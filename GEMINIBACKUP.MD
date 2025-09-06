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

### 2.2 On-Table Combo Actions

To create a seamless and intuitive experience, all complex actions are performed directly on the table by stacking cards. The game logic is designed to intelligently infer the player's intent (Capture or Build) based on the sequence of drags. If a move is invalid, the stacked cards will automatically return to their original positions.

#### Core Interaction Rules
*   **Invalid Drag Prevention:** When a player is building towards a target value (e.g., building a "7"), the UI should prevent them from dragging any card with a value greater than the target (e.g., 10, 9 , 8) into the build stack. This provides immediate, helpful feedback.
*   **"Stealing" Cards:** Means the player can use the first card on the opponents capture, For any **Build** or **Add to Build** or or **Capture** action, the player can use cards from the opps capured cards and combine them with:
    1.  Their own hand from the deck.
    2.  Loose cards on the table.
    3.  The opponent's capture pile. This makes the opponent's captured cards a strategic resource.

---

#### Scenario 1: Multi-Card Capture

A player with a `9♦` in hand wants to capture table cards `4♥`, `3♠`, and `2♣`.
*   **Stack Cards:** The player drags the table cards on top of each other to create a single temporary stack. The drag order must be  from highest at the bottom of the stack to lowest value at the top (4♥ -> 3♠ -> 2♣).
*   **Execute Capture:** The player drags the capturing card (`9♦`) from their hand and drops it onto the temporary stack on the table.
*   **Validation & Outcome:**
    *   **Success:** The game validates that the sum of the stacked cards (4 + 3 + 2 = 9) equals the value of the hand card (`9♦`). All cards are moved to the player's capture pile.
    *   **Failure:** If the sum does not match, the move is invalid. The stack disbands, and all cards return to their original positions.

#### Scenario 2: Creating a Build

A player with a `7♥` and a `9♠` (the required **capture card**) in hand wants to build a 9 using the `2♣` on the table.
*   **Initiate Build:** The player drags the `7♥` from their hand and drops it directly onto the `2♣` on the table, creating a temporary stack.
*   **Build Irder:** The game must rearrange the order, from highest at the bottom of the stack (7♥) to lowest value at the top (2♠) = (7♥ -> 2♠).
*   **Validation & Outcome:**
    *   **Success:** The game analyzes the stack. Since 7 ≠ 2, it's not a capture. It hypothesizes a build. It validates that (a) the sum is 9, and (b) the player holds a separate `9♠` in their hand to capture it later. A new, permanent build of 9 is created on the table.
    *   **Failure:** If the player does not hold a 9, the move is invalid. The `7♥` returns to the player's hand.

#### Scenario 3: Creating a Build by "Stealing"

A player wants to create a build of 10, using cards from all available sources.
*   **Player's Hand:** Contains a `5♥` and a `10♦` (the required **capture card**).
*   **Table Cards:** A loose `5♣`, `7♣`, and `2♣`.
*   **Opponent's Capture Pile:** Contains an `A♠`.
1.  **Stack Cards:** The player creates a temporary stack on the table by dragging the `5♣` from his hand combining it with the 5 from the loose cards, then drags the loose 9 from the table and finally the `A♠` from the opponent's capture pile.
2.  **Declare Intent:** The player clicks the **"Build"** button that appears contextually.
*Outcome:* The logic validates that (a) the stack sums to 10 (5+5) and (7+2+1) are equal to 10, and (b) the player holds a `10♦` to capture it. The move is valid. A new build of 10 is created, and the `A♠` is successfully "stolen" from the opponent.

#### Scenario 4: Capturing by "Stealing"

A player wants to capture a combination of cards that includes one from the opponent's pile.
*   **Player's Hand:** Contains a `10♦`, `2♦`.
*   **Table Cards:** A loose `7♣`, `10♣`.
*   **Opponent's Capture Pile:** Contains a `3♠`.
1.  **Stack Cards:** The player drags the `7♣` to the `10♦` . They then drag the `3♠` from the opponent's capture pile and drop it onto the `7♣`, creating a temporary stack with a sum of 10.
2.  **Execute Capture:** The player uses the `10♣` as his base number, dragging all the combo cards before also using his card in the end to capture the pile card.
*Outcome:* The game validates the sum (7+3=10) matches the capture card (10). The capture is successful. The `10♣`, `7♣`, and the stolen `3♠` all go to the player's capture pile. with the capture card being the card on top of the stack.



#### Scenario 5: Adding to an Existing Build

A player wants to capture a combination of cards that includes cards from the opponent's pile.
*   **Player's Hand:** Contains a 5♦, 9♣.
*   **Table Cards:** A loose 4♣, 9♣.
*   **Opponent's Capture Pile:** Contains a `3♠`.
1.  **Stack Cards:** The player drags the `7♣` to the `10♦` . They then drag the `3♠` from the opponent's capture pile and drop it onto the `7♣`, creating a temporary stack with a sum of 10.
2.  **Execute Capture:** The player uses the `10♣` as his base number, dragging all the combo cards before also using his card in the end to capture the pile card.
*Outcome:* The game validates the sum (7+3=10) matches the capture card (10). The capture is successful. The `10♣`, `7♣`, and the stolen `3♠` all go to the player's capture pile. with the capture card being the card on top of the stack.

A player wants to add their `5♦` and the loose card `4♣` and the loose card `9♣` combined with `A♦` from the opponents captured stack to a build of 9 they already own. Their hand also contains a `9♣` to maintain the ability to capture.
*   **Stack Cards:** The player first drags the loose `5♣` from the table and drops it onto their own build of 9 to create augmented pile. Then , then drags the loose `4♣`, then the loose `8♣`, combined with `A♦` from the opponents captured stack to a build of 9
*   **Execute Build:** The player then drags the `5♦` from their hand and drops it onto the augmented stack.
*   **Validation & Outcome:**
    *   **Success:** The game validates that (a) the player owns the build, (b) the sum of the newly added cards (4 + 5) equals the build's value (9), and (c) the player still holds a `9♣` in their hand. The build on the table is updated to include the new cards.
    *   **Failure:** If any condition is not met, the cards return to their original positions.

Player’s Hand: Contains a 5♦, 9♣.

Table Cards: A loose 4♣, 9♣.

Opponent’s Capture Pile: Contains an A♦.

Stack Cards:

The player drags the loose 5♣ from the table onto their existing build of 9 to create an augmented pile.

They then drag the loose 4♣ and combine it with the A♦ taken from the opponent’s captured stack, ensuring the sum (4 + 5) aligns with the build value of 9.

Execute Build:

The player places the 5♦ from their hand onto the augmented build.

Outcome:

Success: The game validates that the player owns the build, that the new additions (4 + 5) equal 9, and that the player still holds a 9♣ in their hand to maintain capture ability. The build is updated with the new cards.

Failure: If any condition is not met, the cards return to their original positions.

#### Scenario 6: Capturing a Build and a Loose Card

A player with a `10♦` in hand wants to capture both a build of 10 (e.g., `[6♠, 4♥]`) and a loose `10♣`.
*   **Stack Items:** The player drags the loose `10♣` and drops it onto the existing build of 10, creating a temporary stack of items.
*   **Execute Capture:** The player drags the capturing card (`10♦`) from their hand onto this stack.
*   **Validation & Outcome:**
    *   **Success:** The game validates that the hand card's value (10) matches the value of *each item* in the stack (the build is 10, the loose card is 10). All cards are moved to the player's capture pile.
    *   **Failure:** If the values do not match, the `10♣` returns to its original position.

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
