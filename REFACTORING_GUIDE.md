# Casino Game Refactoring Guide

## Executive Summary

This document outlines a comprehensive refactoring plan for the Casino card game codebase, focusing on software design best practices, performance optimization, and modern UI/UX improvements while maintaining the strategic gameplay elements described in `GEMINI.md`.

## 1. Codebase Analysis

### Current Issues Identified

#### game-logic.js (598 lines)
- **Monolithic Structure**: Single large file with mixed concerns
- **Code Duplication**: Multiple similar helper functions for card manipulation
- **Inefficient Patterns**: Excessive use of `JSON.parse(JSON.stringify())` for deep cloning
- **Poor Error Handling**: Uses browser `alert()` instead of proper UI feedback
- **Algorithm Inefficiency**: Recursive `findCombinations` function not optimized for performance

#### useGameActions.js (144 lines)
- **Complex Logic**: Hook contains too many responsibilities
- **Tight Coupling**: Direct manipulation of game state within UI logic
- **Error Handling**: Relies on alerts instead of modern notification systems

#### UI Components
- **Missing Styling**: `GameBoard.css` is empty
- **No Responsive Design**: Fixed layouts not optimized for different screen sizes
- **Limited Accessibility**: Missing ARIA labels, keyboard navigation
- **Basic Visual Design**: Bland appearance not engaging for users

## 2. Refactoring Strategy

### Modularization Plan

#### New File Structure
```
src/
├── components/
│   ├── game-logic/
│   │   ├── index.js
│   │   ├── game-state.js
│   │   ├── card-operations.js
│   │   ├── validation.js
│   │   ├── algorithms.js
│   │   └── scoring.js
│   ├── ui/
│   │   ├── GameBoard.js
│   │   ├── PlayerHand.js
│   │   ├── TableCards.js
│   │   ├── CapturedCards.js
│   │   ├── ComboZone.js
│   │   └── notifications/
│   │       ├── NotificationSystem.js
│   │       └── Toast.js
│   ├── hooks/
│   │   ├── useGameState.js
│   │   ├── useGameActions.js
│   │   └── useNotifications.js
│   └── styles/
│       ├── GameBoard.css
│       ├── components.css
│       └── themes.css
```

### Performance Optimizations

#### Algorithm Improvements
```javascript
// Current: Recursive findCombinations (inefficient)
const findCombinations = (cards, target) => {
  const result = [];
  const find = (startIndex, currentCombination, currentSum) => {
    // ... recursive implementation
  };
  find(0, [], 0);
  return result;
};

// Optimized: Dynamic programming approach
const findCombinationsDP = (cards, target) => {
  const dp = Array(target + 1).fill().map(() => []);
  dp[0] = [[]];

  for (const card of cards) {
    for (let sum = target; sum >= card.value; sum--) {
      for (const combination of dp[sum - card.value]) {
        dp[sum].push([...combination, card]);
      }
    }
  }

  return dp[target];
};
```

#### Memory Optimization
```javascript
// Current: Expensive deep cloning
const newState = JSON.parse(JSON.stringify(gameState));

// Optimized: Immutable updates with spread operators
const newState = {
  ...gameState,
  playerHands: gameState.playerHands.map((hand, index) =>
    index === currentPlayer
      ? hand.filter(card => card.id !== removedCardId)
      : hand
  )
};
```

## 3. UI/UX Enhancement Plan

### Modern Design System

#### Color Palette & Typography
```css
:root {
  --primary-bg: #1a1a2e;
  --secondary-bg: #16213e;
  --accent: #0f3460;
  --text-primary: #e94560;
  --text-secondary: #ffffff;
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;

  --font-primary: 'Roboto', sans-serif;
  --font-secondary: 'Playfair Display', serif;
}
```

#### Component Styling Examples
```css
.game-board {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
  padding: 2rem;
  display: grid;
  grid-template-areas:
    "status status"
    "captured table"
    "hands hands";
  gap: 1.5rem;
}

.card {
  width: 80px;
  height: 112px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  cursor: grab;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.4);
}

.card.dragging {
  opacity: 0.5;
  transform: rotate(5deg);
}
```

### Responsive Design
```css
@media (max-width: 768px) {
  .game-board {
    grid-template-areas:
      "status"
      "captured"
      "table"
      "hands";
    padding: 1rem;
  }

  .card {
    width: 60px;
    height: 84px;
  }
}

@media (max-width: 480px) {
  .game-board {
    padding: 0.5rem;
    gap: 1rem;
  }

  .card {
    width: 50px;
    height: 70px;
  }
}
```

### Accessibility Features
```javascript
// ARIA labels and keyboard navigation
<Card
  role="button"
  tabIndex={0}
  aria-label={`Card: ${card.rank} of ${card.suit}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCardSelect(card);
    }
  }}
/>
```

## 4. Error Handling & User Feedback

### Modern Notification System
```javascript
// Notification context and hook
const NotificationContext = createContext();

export const useNotifications = () => {
  const { addNotification } = useContext(NotificationContext);

  return {
    showSuccess: (message) => addNotification({ type: 'success', message }),
    showError: (message) => addNotification({ type: 'error', message }),
    showWarning: (message) => addNotification({ type: 'warning', message }),
    showInfo: (message) => addNotification({ type: 'info', message })
  };
};

// Usage in game logic
const handleInvalidMove = (errorMessage) => {
  const { showError } = useNotifications();
  showError(errorMessage);
  // Return original state instead of using alert
  return gameState;
};
```

## 5. Implementation Roadmap

### Phase 1: Core Refactoring (Week 1-2)
1. **Modularize game-logic.js**
   - Split into logical modules
   - Implement efficient algorithms
   - Add proper error handling

2. **Create Notification System**
   - Implement toast notifications
   - Replace all `alert()` calls
   - Add loading states

### Phase 2: UI Enhancement (Week 3-4)
1. **Design System Implementation**
   - Create CSS custom properties
   - Implement responsive grid layouts
   - Add smooth animations

2. **Component Optimization**
   - Add accessibility features
   - Implement keyboard navigation
   - Optimize drag-and-drop performance

### Phase 3: Advanced Features (Week 5-6)
1. **Combo Zone Implementation**
   - Build staging area component
   - Implement drag-and-drop validation
   - Add visual feedback systems

2. **Performance Optimization**
   - Implement virtual scrolling for large hands
   - Add memoization for expensive calculations
   - Optimize re-renders

## 6. Testing Strategy

### Unit Tests
```javascript
// Example test for refactored card operations
describe('Card Operations', () => {
  test('should remove card from hand efficiently', () => {
    const hand = [
      { id: 1, rank: 'A', suit: '♠' },
      { id: 2, rank: 'K', suit: '♥' }
    ];

    const result = removeCardFromHand(hand, { id: 1, rank: 'A', suit: '♠' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});
```

### Integration Tests
- Test complete game flows
- Validate UI state synchronization
- Test responsive behavior across devices

## 7. Migration Strategy

### Backward Compatibility
- Maintain existing API contracts
- Gradual component replacement
- Feature flags for new functionality

### Deployment Plan
1. Deploy notification system first
2. Roll out UI improvements incrementally
3. Implement core logic refactoring
4. Add advanced features

## 8. Success Metrics

### Performance
- Reduce bundle size by 30%
- Improve initial load time by 40%
- Reduce memory usage by 25%

### User Experience
- Increase session duration by 50%
- Reduce user errors by 60%
- Improve accessibility score to 95+

### Code Quality
- Achieve 90%+ test coverage
- Reduce code duplication by 70%
- Improve maintainability index by 40%

This refactoring plan transforms the Casino game from a functional prototype into a modern, maintainable, and engaging application while preserving the strategic depth that makes the game compelling.