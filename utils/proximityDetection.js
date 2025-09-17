/**
 * Robust proximity detection utilities for mobile casino app
 * Replaces fragile global.dropZones dependency with reliable calculations
 */
import { rankValue } from '../game-logic/index.js';

/**
 * Calculate distance between two points
 */
export const calculateDistance = (pos1, pos2) => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if a position is within bounds with tolerance
 */
export const isWithinBounds = (position, bounds, tolerance = 60) => {
  const { x, y, width, height } = bounds;
  return (
    position.x >= x - tolerance &&
    position.x <= x + width + tolerance &&
    position.y >= y - tolerance &&
    position.y <= y + height + tolerance
  );
};

/**
 * Create estimated card positions based on table layout
 * This provides a fallback when global.dropZones is unavailable
 */
export const estimateCardPositions = (tableCards) => {
  const positions = [];
  let currentX = 50; // Starting position
  const cardWidth = 60;
  const cardHeight = 80;
  const margin = 20;

  tableCards.forEach((card, index) => {
    if (!card.type) { // Loose card
      positions.push({
        card,
        bounds: {
          x: currentX,
          y: 100, // Approximate table center
          width: cardWidth,
          height: cardHeight
        },
        cardId: `${card.rank}-${card.suit}`
      });
      currentX += cardWidth + margin;
    }
  });

  return positions;
};

/**
 * Find all cards of the same rank as the dropped card
 */
export const findSameRankCards = (tableCards, droppedCard) => {
  return tableCards.filter(card => 
    !card.type && // Only loose cards
    rankValue(card.rank) === rankValue(droppedCard.rank)
  );
};

/**
 * Find all cards of different rank as the dropped card
 */
export const findDifferentRankCards = (tableCards, droppedCard) => {
  return tableCards.filter(card => 
    !card.type && // Only loose cards
    rankValue(card.rank) !== rankValue(droppedCard.rank)
  );
};

/**
 * Robust proximity detection that works with or without global.dropZones
 */
export const detectProximity = (dropPosition, tableCards, droppedCard) => {
  const sameRankCards = findSameRankCards(tableCards, droppedCard);
  const differentRankCards = findDifferentRankCards(tableCards, droppedCard);
  
  // Result object
  const result = {
    nearSameRank: null,
    nearDifferentRank: null,
    distances: {
      sameRank: [],
      differentRank: []
    },
    confidence: 'low'
  };

  // Strategy 1: Try to use global.dropZones if available
  if (global.dropZones && Array.isArray(global.dropZones)) {
    const dropZoneResults = analyzeDropZones(dropPosition, sameRankCards, differentRankCards);
    if (dropZoneResults.confidence === 'high') {
      return dropZoneResults;
    }
  }

  // Strategy 2: Use estimated positions as fallback
  const estimatedPositions = estimateCardPositions(tableCards);
  return analyzeEstimatedPositions(dropPosition, estimatedPositions, droppedCard);
};

/**
 * Analyze proximity using global.dropZones
 */
const analyzeDropZones = (dropPosition, sameRankCards, differentRankCards) => {
  const result = {
    nearSameRank: null,
    nearDifferentRank: null,
    distances: { sameRank: [], differentRank: [] },
    confidence: 'high'
  };

  const tolerance = 80; // Generous tolerance for mobile
  let closestSameRank = { card: null, distance: Infinity };
  let closestDifferentRank = { card: null, distance: Infinity };

  // Check all drop zones
  for (const zone of global.dropZones) {
    if (!zone.stackId || !zone.bounds) continue;

    // Find matching same-rank cards
    const matchingSameRank = sameRankCards.find(card => {
      // More robust matching - handle different stackId formats
      const cardKey = `${card.rank}-${card.suit}`;
      return zone.stackId.includes(cardKey) || 
             zone.stackId.includes(card.rank + card.suit) ||
             zone.stackId.includes(`loose-stack-${cardKey}`);
    });

    if (matchingSameRank && isWithinBounds(dropPosition, zone.bounds, tolerance)) {
      const centerX = zone.bounds.x + zone.bounds.width / 2;
      const centerY = zone.bounds.y + zone.bounds.height / 2;
      const distance = calculateDistance(dropPosition, { x: centerX, y: centerY });
      
      result.distances.sameRank.push({ card: matchingSameRank, distance });
      if (distance < closestSameRank.distance) {
        closestSameRank = { card: matchingSameRank, distance };
      }
    }

    // Find matching different-rank cards
    const matchingDifferentRank = differentRankCards.find(card => {
      const cardKey = `${card.rank}-${card.suit}`;
      return zone.stackId.includes(cardKey) || 
             zone.stackId.includes(card.rank + card.suit) ||
             zone.stackId.includes(`loose-stack-${cardKey}`);
    });

    if (matchingDifferentRank && isWithinBounds(dropPosition, zone.bounds, tolerance)) {
      const centerX = zone.bounds.x + zone.bounds.width / 2;
      const centerY = zone.bounds.y + zone.bounds.height / 2;
      const distance = calculateDistance(dropPosition, { x: centerX, y: centerY });
      
      result.distances.differentRank.push({ card: matchingDifferentRank, distance });
      if (distance < closestDifferentRank.distance) {
        closestDifferentRank = { card: matchingDifferentRank, distance };
      }
    }
  }

  result.nearSameRank = closestSameRank.distance < Infinity ? closestSameRank.card : null;
  result.nearDifferentRank = closestDifferentRank.distance < Infinity ? closestDifferentRank.card : null;

  return result;
};

/**
 * Analyze proximity using estimated positions
 */
const analyzeEstimatedPositions = (dropPosition, estimatedPositions, droppedCard) => {
  const result = {
    nearSameRank: null,
    nearDifferentRank: null,
    distances: { sameRank: [], differentRank: [] },
    confidence: 'medium'
  };

  const tolerance = 100; // Larger tolerance for estimated positions
  let closestSameRank = { card: null, distance: Infinity };
  let closestDifferentRank = { card: null, distance: Infinity };

  for (const pos of estimatedPositions) {
    if (isWithinBounds(dropPosition, pos.bounds, tolerance)) {
      const centerX = pos.bounds.x + pos.bounds.width / 2;
      const centerY = pos.bounds.y + pos.bounds.height / 2;
      const distance = calculateDistance(dropPosition, { x: centerX, y: centerY });

      if (rankValue(pos.card.rank) === rankValue(droppedCard.rank)) {
        result.distances.sameRank.push({ card: pos.card, distance });
        if (distance < closestSameRank.distance) {
          closestSameRank = { card: pos.card, distance };
        }
      } else {
        result.distances.differentRank.push({ card: pos.card, distance });
        if (distance < closestDifferentRank.distance) {
          closestDifferentRank = { card: pos.card, distance };
        }
      }
    }
  }

  result.nearSameRank = closestSameRank.distance < Infinity ? closestSameRank.card : null;
  result.nearDifferentRank = closestDifferentRank.distance < Infinity ? closestDifferentRank.card : null;

  return result;
};

/**
 * Determine user intent based on proximity analysis
 */
export const determineUserIntent = (proximityResult, sameRankCards, differentRankCards) => {
  const { nearSameRank, nearDifferentRank, distances, confidence } = proximityResult;

  // Handle error cases
  if (!proximityResult || typeof proximityResult !== 'object') {
    console.warn('Invalid proximity result, falling back to trail');
    return {
      intent: 'trail',
      targetCard: null,
      confidence: 'low',
      reason: 'Invalid proximity analysis result'
    };
  }

  // Clear intention analysis
  if (nearSameRank && !nearDifferentRank) {
    return {
      intent: 'capture',
      targetCard: nearSameRank,
      confidence: confidence,
      reason: 'Near same-rank card only'
    };
  }

  if (nearDifferentRank && !nearSameRank) {
    return {
      intent: 'build_attempt',
      targetCard: nearDifferentRank,
      confidence: confidence,
      reason: 'Near different-rank card only'
    };
  }

  if (nearSameRank && nearDifferentRank) {
    // Ambiguous case - use distance and context to break ties
    const sameRankDist = distances.sameRank.find(d => d.card === nearSameRank)?.distance || Infinity;
    const differentRankDist = distances.differentRank.find(d => d.card === nearDifferentRank)?.distance || Infinity;

    // Enhanced decision logic with multiple factors
    const distanceRatio = sameRankDist / differentRankDist;
    
    // Strong bias toward captures when distances are similar (within 50% of each other)
    if (distanceRatio < 0.7) {
      return {
        intent: 'capture',
        targetCard: nearSameRank,
        confidence: confidence === 'high' ? 'high' : 'medium',
        reason: 'Significantly closer to same-rank card'
      };
    } else if (distanceRatio > 1.5) {
      return {
        intent: 'build_attempt',
        targetCard: nearDifferentRank,
        confidence: confidence === 'high' ? 'high' : 'medium',
        reason: 'Significantly closer to different-rank card'
      };
    } else {
      // Very close distances - lean toward capture but with lower confidence
      return {
        intent: 'unclear_capture',
        targetCard: nearSameRank,
        confidence: 'low',
        reason: 'Ambiguous proximity - similar distances to both card types'
      };
    }
  }

  // No proximity detected - enhanced fallback logic
  if (sameRankCards.length > 0) {
    // Check if there are many different rank cards that might have confused the detection
    if (differentRankCards.length > 3) {
      return {
        intent: 'trail',
        targetCard: null,
        confidence: 'medium',
        reason: 'Crowded table - requiring explicit card targeting'
      };
    }
    
    return {
      intent: 'unclear_capture',
      targetCard: sameRankCards[0],
      confidence: 'low',
      reason: 'Same-rank cards available but no clear proximity'
    };
  }

  return {
    intent: 'trail',
    targetCard: null,
    confidence: confidence || 'medium',
    reason: 'No nearby cards detected'
  };
};

/**
 * Enhanced error handling for proximity detection
 */
export const safeDetectProximity = (dropPosition, tableCards, droppedCard) => {
  try {
    // Validate inputs
    if (!dropPosition || typeof dropPosition.x !== 'number' || typeof dropPosition.y !== 'number') {
      console.warn('Invalid drop position for proximity detection');
      return createFallbackResult();
    }

    if (!Array.isArray(tableCards) || !droppedCard) {
      console.warn('Invalid table cards or dropped card for proximity detection');
      return createFallbackResult();
    }

    return detectProximity(dropPosition, tableCards, droppedCard);
  } catch (error) {
    console.error('Error in proximity detection:', error);
    return createFallbackResult();
  }
};

/**
 * Create a fallback proximity result when detection fails
 */
const createFallbackResult = () => ({
  nearSameRank: null,
  nearDifferentRank: null,
  distances: { sameRank: [], differentRank: [] },
  confidence: 'low'
});