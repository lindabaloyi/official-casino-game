import React from 'react';
import { useDrop } from 'react-dnd';
import Card from './Card';

const ItemTypes = {
  CARD: 'card',
  TEMP_STACK: 'temp_stack',
};

const CardStack = ({ cards, onDropStack, stackId, buildValue, isBuild = false }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    // This drop target can now accept single cards or temporary stacks
    accept: [ItemTypes.CARD, ItemTypes.TEMP_STACK],
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

  // For builds, only show the top card to maintain game strategy
  const cardsToShow = isBuild ? [cards[cards.length - 1]] : cards;

  // Debug logging for build display
  if (isBuild) {
    console.log(`CardStack Build Display: fullCards=[${cards.map(c => c.rank).join(',')}], showing=${cardsToShow[0]?.rank}`);
  }

  return (
    // The `ref={drop}` makes this whole div a drop target.
    <div ref={drop} className={`card-stack ${isActive ? 'active-drop' : ''} ${isBuild ? 'build-stack' : ''}`}>
      {cardsToShow.map((card, index) => {
        const reversedIndex = cardsToShow.length - 1 - index;
        const isTopCard = index === cardsToShow.length - 1;

        return (
          <div key={index} className="card-in-stack" style={{ top: `${reversedIndex * 25}px`, zIndex: reversedIndex }}>
            <Card rank={card.rank} suit={card.suit} />
            {/* Show build value icon on the top card of builds */}
            {isBuild && isTopCard && buildValue && (
              <div className="build-value-icon">
                {buildValue}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CardStack;