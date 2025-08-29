import React from 'react';
import { useDrag } from 'react-dnd';
import Card from './Card';

const ItemTypes = {
  CARD: 'card',
};

const DraggableCard = ({ card, player, isCurrent, isSelected, onSelectCard }) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
    type: ItemTypes.CARD,
    item: { card, player },
    canDrag: isCurrent,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    }),
    [card, player, isCurrent]
  );

  return (
    <div
      ref={drag}
      className={isDragging ? 'draggable-card dragging' : 'draggable-card'}
    >
      <Card
        rank={card.rank}
        suit={card.suit}
        isSelected={isSelected}
        onClick={() => {
          if (isCurrent && typeof onSelectCard === 'function') {
            onSelectCard(card);
          }
        }}
      />
    </div>
  );
};

export default DraggableCard;