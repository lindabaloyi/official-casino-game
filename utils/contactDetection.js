/**
 * Contact-based detection utilities for trail validation
 * Implements 20% overlap threshold for capture/build vs trail determination
 */

/**
 * Standard card dimensions for overlap calculations
 */
export const CARD_DIMENSIONS = {
  width: 60,
  height: 80
};

/**
 * Contact threshold - any overlap >20% counts as contact
 */
export const CONTACT_THRESHOLD = 0.2;

/**
 * Calculate overlap area between two rectangles
 */
export const calculateOverlapArea = (rect1, rect2) => {
  const left = Math.max(rect1.x, rect2.x);
  const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const top = Math.max(rect1.y, rect2.y);
  const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  if (left < right && top < bottom) {
    return (right - left) * (bottom - top);
  }
  return 0;
};

/**
 * Calculate overlap percentage between two rectangles
 * Returns the overlap as a percentage of the smaller rectangle
 */
export const calculateOverlapPercentage = (rect1, rect2) => {
  const overlapArea = calculateOverlapArea(rect1, rect2);
  if (overlapArea === 0) return 0;

  const area1 = rect1.width * rect1.height;
  const area2 = rect2.width * rect2.height;
  const smallerArea = Math.min(area1, area2);

  return overlapArea / smallerArea;
};

/**
 * Create dropped card bounds based on drop position
 */
export const createDroppedCardBounds = (dropPosition, cardDimensions = CARD_DIMENSIONS) => {
  return {
    x: dropPosition.x - (cardDimensions.width / 2), // Center the card on drop position
    y: dropPosition.y - (cardDimensions.height / 2),
    width: cardDimensions.width,
    height: cardDimensions.height
  };
};

/**
 * Get bounds for any table entity (loose cards, builds, temporary stacks)
 * Improved reliability by removing global.dropZones dependency
 */
export const getTableEntityBounds = (entity, tableCards) => {
  // Handle different entity types
  if (entity.type === 'build') {
    // For builds, estimate position based on build index
    const buildIndex = tableCards.filter(c => c.type === 'build').findIndex(b => 
      b.id === entity.id || (b.cards && entity.cards && 
      JSON.stringify(b.cards) === JSON.stringify(entity.cards))
    );
    const baseX = 200; // Builds positioned to the right of loose cards
    const buildSpacing = 100;
    return {
      x: baseX + (buildIndex * buildSpacing),
      y: 50, // Builds positioned higher
      width: CARD_DIMENSIONS.width * 1.5, // Builds are wider
      height: CARD_DIMENSIONS.height
    };
  }
  
  if (entity.type === 'temporary_stack') {
    // For temporary stacks, position near builds
    const tempStackIndex = tableCards.filter(c => c.type === 'temporary_stack').findIndex(t => 
      t.id === entity.id || (t.cards && entity.cards && 
      JSON.stringify(t.cards) === JSON.stringify(entity.cards))
    );
    const baseX = 200;
    const stackSpacing = 120;
    return {
      x: baseX + (tempStackIndex * stackSpacing),
      y: 200, // Temp stacks positioned lower than builds
      width: CARD_DIMENSIONS.width * 1.2, // Temp stacks slightly wider
      height: CARD_DIMENSIONS.height
    };
  }
  
  // Handle loose cards - improved position calculation
  const cardKey = `${entity.rank}${entity.suit}`;
  const cardIndex = tableCards.findIndex(c => 
    !c.type && c.rank === entity.rank && c.suit === entity.suit
  );
  
  if (cardIndex >= 0) {
    const baseX = 50;
    const cardSpacing = 80;
    return {
      x: baseX + (cardIndex * cardSpacing),
      y: 100, // Loose cards in the center
      width: CARD_DIMENSIONS.width,
      height: CARD_DIMENSIONS.height
    };
  }

  return null;
};

/**
 * Legacy function for backward compatibility
 */
export const getTableCardBounds = (card, tableCards) => {
  return getTableEntityBounds(card, tableCards);
};

/**
 * Detect contact between dropped card and ANY table entity
 * Returns contact info for highest overlap target if > 20%
 */
export const detectCardContact = (dropPosition, tableCards, droppedCard) => {
  const droppedCardBounds = createDroppedCardBounds(dropPosition);
  let bestContact = {
    hasContact: false,
    targetEntity: null,
    targetType: null,
    overlapPercentage: 0,
    tableBounds: null,
    droppedBounds: droppedCardBounds
  };
  
  // Check contact with ALL table entities
  for (const tableEntity of tableCards) {
    const entityBounds = getTableEntityBounds(tableEntity, tableCards);
    if (!entityBounds) continue;

    const overlapPercentage = calculateOverlapPercentage(droppedCardBounds, entityBounds);
    
    // Track the highest overlap that exceeds threshold
    if (overlapPercentage > CONTACT_THRESHOLD && overlapPercentage > bestContact.overlapPercentage) {
      bestContact = {
        hasContact: true,
        targetEntity: tableEntity,
        targetType: tableEntity.type || 'loose_card',
        overlapPercentage,
        tableBounds: entityBounds,
        droppedBounds: droppedCardBounds
      };
      
      // For backward compatibility, also set targetCard
      if (!tableEntity.type) {
        bestContact.targetCard = tableEntity;
      }
    }
  }

  return bestContact;
};

/**
 * Simple check if there's any meaningful contact
 * Returns true if any table card has >20% overlap
 */
export const hasCardContact = (dropPosition, tableCards) => {
  const result = detectCardContact(dropPosition, tableCards, null);
  return result.hasContact;
};

/**
 * Get all entities that have contact with the dropped position
 * Returns all overlapping entities sorted by overlap percentage (highest first)
 */
export const getAllContactingEntities = (dropPosition, tableCards) => {
  const droppedCardBounds = createDroppedCardBounds(dropPosition);
  const contactingEntities = [];
  
  // Check ALL table entities
  for (const tableEntity of tableCards) {
    const entityBounds = getTableEntityBounds(tableEntity, tableCards);
    if (!entityBounds) continue;

    const overlapPercentage = calculateOverlapPercentage(droppedCardBounds, entityBounds);
    
    if (overlapPercentage > CONTACT_THRESHOLD) {
      contactingEntities.push({
        entity: tableEntity,
        entityType: tableEntity.type || 'loose_card',
        overlapPercentage,
        entityBounds,
        // Legacy compatibility
        card: !tableEntity.type ? tableEntity : null,
        tableBounds: entityBounds
      });
    }
  }

  // Sort by overlap percentage (highest first)
  return contactingEntities.sort((a, b) => b.overlapPercentage - a.overlapPercentage);
};

/**
 * Legacy function for backward compatibility
 */
export const getAllContactingCards = (dropPosition, tableCards) => {
  const allContacts = getAllContactingEntities(dropPosition, tableCards);
  // Filter to only loose cards for backward compatibility
  return allContacts
    .filter(contact => contact.entityType === 'loose_card')
    .map(contact => ({
      card: contact.entity,
      overlapPercentage: contact.overlapPercentage,
      tableBounds: contact.entityBounds
    }));
};