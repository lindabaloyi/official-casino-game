import { rankValue } from './index.js';

/**
 * Advanced real-time combo analysis for casino card game builds
 * Detects combo boundaries, auto-sorts first combo, validates in real-time
 */

/**
 * Analyzes a stack of cards to detect complete and incomplete combos
 * @param {Array} cards - Array of card objects in the stack
 * @param {number} targetValue - Expected value for all combos (optional for detection phase)
 * @returns {Object} Analysis result with combo information
 */
export const analyzeCardStack = (cards, targetValue = null) => {
  if (!cards || cards.length === 0) {
    return { completeCombos: [], incompleteCards: [], firstComboValue: null };
  }

  // Find all possible combinations that sum to various values
  const allCombinations = findAllPossibleCombinations(cards);
  
  // If we have a target value, filter to matching combinations
  if (targetValue !== null) {
    const matchingCombos = allCombinations.filter(combo => combo.value === targetValue);
    return processTargetedCombos(matchingCombos, cards, targetValue);
  }
  
  // Auto-detect first combo and analyze structure
  return detectFirstCombo(allCombinations, cards);
};

/**
 * Finds all possible mathematical combinations from a set of cards
 * @param {Array} cards - Card objects to analyze
 * @returns {Array} Array of combination objects with cards and values
 */
const findAllPossibleCombinations = (cards) => {
  const combinations = [];
  const cardValues = cards.map(card => ({ 
    card, 
    value: rankValue(card.rank),
    id: `${card.rank}-${card.suit}`
  }));

  // Add individual cards as standalone combos
  // CASINO RULE: Only include cards with value ≤10 for consistency
  cardValues.forEach(cardVal => {
    if (cardVal.value <= 10) {
      combinations.push({
        cards: [cardVal.card],
        value: cardVal.value,
        type: 'standalone',
        cardIds: [cardVal.id]
      });
    }
  });

  // Find all possible mathematical combinations (2+ cards)
  // CASINO RULE: Cap combinations at ≤10 to respect casino build limits
  for (let size = 2; size <= cardValues.length; size++) {
    const combos = generateCombinations(cardValues, size);
    combos.forEach(combo => {
      const sum = combo.reduce((total, cardVal) => total + cardVal.value, 0);
      
      // CASINO CONSTRAINT: Only allow combinations ≤ 10
      if (sum <= 10) {
        combinations.push({
          cards: combo.map(cv => cv.card),
          value: sum,
          type: 'mathematical',
          cardIds: combo.map(cv => cv.id)
        });
      }
    });
  }

  return combinations;
};

/**
 * Detects the first complete combo in a card stack
 * ROBUST VERSION: Prefers mathematical combinations over standalone duplicates
 * @param {Array} allCombinations - All possible combinations
 * @param {Array} cards - Original card array
 * @returns {Object} First combo detection result
 */
const detectFirstCombo = (allCombinations, cards) => {
  // Separate mathematical combinations from standalone cards
  const mathematicalCombos = allCombinations.filter(combo => combo.type === 'mathematical');
  const standalones = allCombinations.filter(combo => combo.type === 'standalone');
  
  // PRIORITY 1: Look for mathematical combinations (2+ cards that sum to a value)
  if (mathematicalCombos.length > 0) {
    // Find the best mathematical combo (prefer smaller size, earlier position)
    const bestMathCombo = findOptimalFirstCombo(mathematicalCombos, cards);
    
    if (bestMathCombo) {
      return {
        firstComboValue: bestMathCombo.value,
        completeCombos: [bestMathCombo],
        incompleteCards: getIncompleteCards(cards, [bestMathCombo])
      };
    }
  }

  // PRIORITY 2: Look for multiple standalones of same value (only if no math combos)
  const standalonesByValue = {};
  standalones.forEach(combo => {
    if (!standalonesByValue[combo.value]) {
      standalonesByValue[combo.value] = [];
    }
    standalonesByValue[combo.value].push(combo);
  });

  // Find values with multiple standalone cards (like two 9s)
  for (const [value, combos] of Object.entries(standalonesByValue)) {
    if (combos.length > 1) {
      // Multiple standalone cards of same value - take the first one
      const firstStandalone = findOptimalFirstCombo(combos, cards);
      if (firstStandalone) {
        return {
          firstComboValue: parseInt(value),
          completeCombos: [firstStandalone],
          incompleteCards: getIncompleteCards(cards, [firstStandalone])
        };
      }
    }
  }

  // Fallback: No clear first combo detected yet
  return {
    firstComboValue: null,
    completeCombos: [],
    incompleteCards: [...cards]
  };
};

/**
 * Finds the optimal first combo from multiple possibilities
 * Prefers smaller combinations that appear earlier in the card sequence
 */
const findOptimalFirstCombo = (combos, cards) => {
  // Sort by combination size (prefer smaller) then by position in original array
  return combos.sort((a, b) => {
    if (a.cards.length !== b.cards.length) {
      return a.cards.length - b.cards.length; // Smaller combos first
    }
    
    // Same size - prefer combos with cards that appear earlier
    const aFirstIndex = Math.min(...a.cards.map(card => 
      cards.findIndex(c => c.rank === card.rank && c.suit === card.suit)
    ));
    const bFirstIndex = Math.min(...b.cards.map(card => 
      cards.findIndex(c => c.rank === card.rank && c.suit === card.suit)
    ));
    
    return aFirstIndex - bFirstIndex;
  })[0];
};

/**
 * Gets cards that are not part of any complete combo (incomplete cards)
 */
const getIncompleteCards = (allCards, completeCombos) => {
  const usedCardIds = new Set();
  completeCombos.forEach(combo => {
    combo.cards.forEach(card => {
      usedCardIds.add(`${card.rank}-${card.suit}`);
    });
  });

  return allCards.filter(card => !usedCardIds.has(`${card.rank}-${card.suit}`));
};

/**
 * Validates if adding a new card would create valid combinations
 * @param {Array} currentCards - Current cards in temp stack
 * @param {Object} newCard - New card being added
 * @param {number} targetValue - Expected combo value
 * @returns {Object} Validation result with success/error information
 */
export const validateNewCardAddition = (currentCards, newCard, targetValue = null) => {
  const updatedCards = [...currentCards, newCard];
  const analysis = analyzeCardStack(updatedCards, targetValue);

  // TEMP BUILD MODE: Always allow during creation - validation happens at finalization only
  // This function is now only used for analysis, not blocking validation
  return { 
    isValid: true, 
    analysis,
    shouldAutoSort: false // No auto-sorting during temp build creation
  };
};

/**
 * Sorts the first combo while preserving order of subsequent cards
 * @param {Array} cards - All cards in the stack
 * @param {Object} firstCombo - The first combo to sort
 * @returns {Array} Reordered cards with first combo sorted
 */
export const sortFirstComboOnly = (cards, firstCombo) => {
  if (!firstCombo || !firstCombo.cards || firstCombo.cards.length === 0) {
    return cards;
  }

  // Get IDs of cards in the first combo
  const firstComboIds = new Set(firstCombo.cards.map(card => `${card.rank}-${card.suit}`));
  
  // Separate first combo cards from others, preserving non-combo order
  const firstComboCards = [];
  const otherCards = [];
  
  cards.forEach(card => {
    if (firstComboIds.has(`${card.rank}-${card.suit}`)) {
      firstComboCards.push(card);
    } else {
      otherCards.push(card);
    }
  });

  // Sort first combo cards by value (DESCENDING - big cards first, so small cards show on top when displaying last card)
  firstComboCards.sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

  // Return: sorted first combo + remaining cards in original order
  return [...firstComboCards, ...otherCards];
};

/**
 * Generates combinations of specified size from array
 */
const generateCombinations = (arr, size) => {
  if (size === 1) return arr.map(item => [item]);
  if (size > arr.length) return [];

  const combinations = [];
  for (let i = 0; i < arr.length - size + 1; i++) {
    const head = arr[i];
    const tailCombos = generateCombinations(arr.slice(i + 1), size - 1);
    tailCombos.forEach(tailCombo => {
      combinations.push([head, ...tailCombo]);
    });
  }
  return combinations;
};

/**
 * Creates a human-readable description of a combo
 */
const getComboDescription = (combo) => {
  if (combo.type === 'standalone') {
    return `${combo.cards[0].rank}`;
  }
  return combo.cards.map(card => card.rank).join('+');
};

/**
 * Gets ALL possible candidate target values for a set of cards
 * Used for comprehensive merge validation without known target
 * @param {Array} cards - Cards to analyze for target values
 * @returns {Array} Sorted unique target values ≤10
 */
export const getCandidateTargetValues = (cards) => {
  if (!cards || cards.length === 0) {
    return [];
  }

  // Get all possible combinations (respecting casino ≤10 rule)
  const allCombinations = findAllPossibleCombinations(cards);
  
  // Extract unique values from all combinations
  const uniqueValues = new Set();
  allCombinations.forEach(combo => {
    if (combo.value <= 10) { // Double-check casino constraint
      uniqueValues.add(combo.value);
    }
  });
  
  // Return as sorted array for consistent processing
  return Array.from(uniqueValues).sort((a, b) => a - b);
};

/**
 * Validates if combos in a stack are correctly sorted (big→small within each combo)
 * @param {Array} cards - Cards in the temp build
 * @returns {Object} { isValid, error, suggestion }
 */
export const validateComboSorting = (cards) => {
  if (!cards || cards.length === 0) {
    return { isValid: true, error: null, suggestion: null };
  }

  // Get all candidate target values 
  const candidateTargets = getCandidateTargetValues(cards);
  
  // Try each target value to find valid partitions
  for (const targetValue of candidateTargets) {
    const analysis = analyzeCardStack(cards, targetValue);
    
    // If we found a valid complete partition
    if (analysis.isValid && analysis.incompleteCards.length === 0) {
      // Check if each combo in the partition is sorted correctly
      const partition = analysis.bestPartition;
      
      // 🛡️ DEFENSIVE NULL CHECK: Ensure partition exists and is an array
      if (!partition || !Array.isArray(partition)) {
        console.warn("Invalid partition structure:", partition);
        continue; // Skip this target value and try next one
      }
      
      for (let i = 0; i < partition.length; i++) {
        const combo = partition[i];
        
        // 🛡️ DEFENSIVE NULL CHECK: Ensure combo exists and is an array
        if (!combo || !Array.isArray(combo)) {
          console.warn("Invalid combo structure in partition:", combo);
          continue; // Skip this combo and check next one
        }
        
        // Check if this combo is sorted big→small
        for (let j = 0; j < combo.length - 1; j++) {
          const currentCard = combo[j];
          const nextCard = combo[j + 1];
          
          if (rankValue(currentCard.rank) < rankValue(nextCard.rank)) {
            // Found incorrectly sorted combo
            const comboStr = combo.map(c => c.rank).join(' + ');
            const correctOrder = [...combo]
              .sort((a, b) => rankValue(b.rank) - rankValue(a.rank))
              .map(c => c.rank).join(' + ');
              
            return {
              isValid: false,
              error: `Combo [${comboStr}] is not sorted correctly`,
              suggestion: `Should be: [${correctOrder}] (big cards first)`
            };
          }
        }
      }
      
      // All combos are correctly sorted
      return { isValid: true, error: null, suggestion: null };
    }
  }
  
  // No valid partition found - this will be caught by existing validation
  return { isValid: false, error: "No valid combo arrangement found", suggestion: null };
};

/**
 * Processes combinations when we have a specific target value
 * BULLETPROOF VERSION: Requires 100% card coverage or marks as invalid
 */
const processTargetedCombos = (matchingCombos, allCards, targetValue) => {
  // Find the best partition of all cards into target-value combos
  const partition = findBestPartition(allCards, targetValue);
  
  if (!partition.isValid) {
    return {
      firstComboValue: targetValue,
      completeCombos: [],
      incompleteCards: [...allCards],
      isValid: false,
      error: partition.error,
      bestPartition: []  // ✅ Already correct - empty array for invalid partitions
    };
  }

  // BULLETPROOF CHECK: Require perfect coverage for validation to pass
  const hasUncoveredCards = partition.remaining && partition.remaining.length > 0;
  
  if (hasUncoveredCards) {
    const uncoveredCardNames = partition.remaining.map(card => card.rank).join(', ');
    return {
      firstComboValue: targetValue,
      completeCombos: partition.combos,
      incompleteCards: partition.remaining,
      isValid: false,  // CRITICAL: Mark as invalid if not all cards covered
      error: `Cannot form complete partition: cards ${uncoveredCardNames} don't fit into combinations of ${targetValue}`,
      bestPartition: partition.combos ? partition.combos.map(c => c.cards) : []  // 🔧 FIX: Extract card arrays safely
    };
  }

  return {
    firstComboValue: targetValue,
    completeCombos: partition.combos,
    incompleteCards: partition.remaining,  // Should be empty for valid partitions
    isValid: true,
    bestPartition: partition.combos.map(c => c.cards)  // 🔧 FIX: Extract card arrays for validateComboSorting
  };
};

/**
 * Finds the best way to partition cards into combos of target value using dynamic programming
 * This is the CORE algorithm for bulletproof validation
 */
const findBestPartition = (cards, targetValue) => {
  if (!cards || cards.length === 0) {
    return { isValid: true, combos: [], remaining: [], error: null };
  }

  const combinations = findAllPossibleCombinations(cards);
  const targetCombos = combinations.filter(combo => combo.value === targetValue);
  
  if (targetCombos.length === 0) {
    return {
      isValid: false,
      combos: [],
      remaining: [...cards],
      error: `No combinations equal ${targetValue}`
    };
  }

  // ROBUST PARTITION ALGORITHM: Find disjoint combos that cover ALL cards
  const bestPartition = findDisjointPartition(cards, targetCombos);
  
  if (!bestPartition) {
    return {
      isValid: false,
      combos: [],
      remaining: [...cards],
      error: `Cannot partition all cards into combinations of ${targetValue}`
    };
  }

  // CONSISTENCY FIX: isValid should reflect actual coverage
  const hasFullCoverage = bestPartition.uncoveredCards.length === 0;
  
  return {
    isValid: hasFullCoverage,  // Only valid if ALL cards are covered
    combos: bestPartition.combos,
    remaining: bestPartition.uncoveredCards,
    error: hasFullCoverage ? null : `Incomplete partition: ${bestPartition.uncoveredCards.length} cards uncovered`
  };
};

/**
 * CORE ALGORITHM: Find disjoint combinations that maximize card coverage
 * Uses backtracking to find complete partitions only
 * FIXED: Matches new backtracking that only returns complete partitions
 */
const findDisjointPartition = (allCards, possibleCombos) => {
  const cardIds = allCards.map(card => `${card.rank}-${card.suit}`);
  
  // Try to find COMPLETE partition using backtracking
  const result = backtrackPartition(cardIds, possibleCombos, [], new Set());
  
  if (result) {
    // backtrackPartition now only returns complete partitions
    // Verify completeness (defensive check)
    if (result.usedCards.size === cardIds.length) {
      return {
        combos: result.selectedCombos,
        uncoveredCards: [] // Always empty for complete partitions
      };
    } else {
      // This shouldn't happen with fixed backtracking, but defensive programming
      console.warn("Backtracking returned incomplete partition - this is a bug");
      return null;
    }
  }
  
  // No valid COMPLETE partition found
  return null;
};

/**
 * Backtracking algorithm to find optimal disjoint partition
 * FIXED: Only returns complete partitions or null (no partial results)
 */
const backtrackPartition = (allCardIds, possibleCombos, selectedCombos, usedCards) => {
  // Base case: All cards are covered - ONLY case that returns success
  if (usedCards.size === allCardIds.length) {
    return { selectedCombos: [...selectedCombos], usedCards: new Set(usedCards) };
  }

  // Find the best combo to add next (prefer larger combos for efficiency)
  const sortedCombos = possibleCombos
    .filter(combo => {
      // Only consider combos that don't overlap with already used cards
      const comboCardIds = combo.cardIds;
      return comboCardIds.every(cardId => !usedCards.has(cardId));
    })
    .sort((a, b) => b.cards.length - a.cards.length); // Larger combos first

  // Try each possible combo
  for (const combo of sortedCombos) {
    const comboCardIds = combo.cardIds;
    
    // Add this combo to the partition
    const newSelectedCombos = [...selectedCombos, combo];
    const newUsedCards = new Set(usedCards);
    comboCardIds.forEach(cardId => newUsedCards.add(cardId));
    
    // Recursively try to complete the partition
    const result = backtrackPartition(allCardIds, possibleCombos, newSelectedCombos, newUsedCards);
    
    if (result) {
      return result; // Found a valid COMPLETE partition
    }
  }

  // CRITICAL FIX: Only return null - no partial results allowed
  // This forces the algorithm to explore all branches until it finds complete coverage
  return null;
};