import React, { memo, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import Card from './Card';

const ItemTypes = {
  CARD: 'card',
};

const DraggableCard = memo(({ card, player, isCurrent, isSelected, onSelectCard }) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.CARD,
      item: { card, player, source: 'hand' },
      canDrag: isCurrent,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [card, player, isCurrent]
  );

  const handleClick = useCallback(() => {
    if (isCurrent && typeof onSelectCard === 'function') {
      onSelectCard(card);
    }
  }, [isCurrent, onSelectCard, card]);

  return (
    <div
      ref={drag}
      className={isDragging ? 'draggable-card dragging' : 'draggable-card'}
    >
      <Card
        rank={card.rank}
        suit={card.suit}
        isSelected={isSelected}
        onClick={handleClick}
      />
    </div>
  );
});

export default DraggableCard;