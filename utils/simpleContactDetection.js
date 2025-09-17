/**
 * Simple contact detection for trail validation
 * Just checks if dropped card overlaps with ANY table entity
 */

/**
 * Standard card dimensions
 */
export const CARD_DIMENSIONS = {
  width: 60,
  height: 80
};

/**
 * Check if two rectangles overlap at all
 */
export const hasOverlap = (rect1, rect2) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

/**
 * Create dropped card bounds centered on drop position
 */
export const createDroppedCardBounds = (dropPosition, cardDimensions = CARD_DIMENSIONS) => {
  return {
    x: dropPosition.x - (cardDimensions.width / 2),
    y: dropPosition.y - (cardDimensions.height / 2),
    width: cardDimensions.width,
    height: cardDimensions.height
  };
};

/**
 * Get bounds for a table entity (card, build, stack)
 */
export const getTableEntityBounds = (entity, tableCards) => {
  // For loose cards, try to find in drop zones
  if (!entity.type) {
    const cardKey = `${entity.rank}${entity.suit}`;
    
    if (global.dropZones && Array.isArray(global.dropZones)) {
      for (const zone of global.dropZones) {
        if (zone.stackId && 
            (zone.stackId.includes(cardKey) || 
             zone.stackId.includes(`${entity.rank}-${entity.suit}`) ||
             zone.stackId.includes(`loose-stack-${cardKey}`))) {
          return zone.bounds;
        }
      }
    }
  }
  
  // For builds and temp stacks, try to find by ID
  if (entity.type && global.dropZones) {
    for (const zone of global.dropZones) {
      if (zone.stackId && 
          (zone.stackId.includes(entity.buildId) || 
           zone.stackId.includes(entity.stackId))) {
        return zone.bounds;
      }
    }
  }

  return null; // Could not determine bounds
};

/**
 * Simple check: does dropped card have ANY contact with ANY table entity?
 * Returns true if any overlap exists, false otherwise
 */
export const hasAnyContact = (dropPosition, tableCards) => {
  if (!dropPosition) return false;
  
  const droppedBounds = createDroppedCardBounds(dropPosition);
  
  // Check all table entities (loose cards, builds, temp stacks)
  for (const entity of tableCards) {
    const entityBounds = getTableEntityBounds(entity, tableCards);
    if (!entityBounds) continue;
    
    if (hasOverlap(droppedBounds, entityBounds)) {
      return true; // Contact found
    }
  }
  
  return false; // No contact
};