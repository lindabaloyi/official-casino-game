import React from 'react';
import { useDrop } from 'react-dnd';
import Card from './Card';

const ItemTypes = {
  CARD: 'card',
};

const CardStack = ({ cards, onDropStack, stackId }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item) => {
      // The target is the top card of the stack.
      // In a loose card stack, there's only one card.
      // In a build, we interact with the whole build, represented by its top card.
      const targetCard = cards.length > 0 ? cards[cards.length - 1] : null;

      if (onDropStack) {
        onDropStack(item, targetCard);
      }

      // **This is the crucial part.**
      // Return an object to signify that the drop was handled here.
      // This prevents parent drop targets (like the GameBoard) from also handling it.
      return { stackId };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = isOver && canDrop;

  return (
    // The `ref={drop}` makes this whole div a drop target.
    <div ref={drop} className={`card-stack ${isActive ? 'active-drop' : ''}`}>
      {cards.map((card, index) => {
        const reversedIndex = cards.length - 1 - index;
        return (
          <div key={index} className="card-in-stack" style={{ top: `${reversedIndex * 25}px`, zIndex: reversedIndex }}>
            <Card rank={card.rank} suit={card.suit} />
          </div>
        );
      })}
    </div>
  );
};

export default CardStack;