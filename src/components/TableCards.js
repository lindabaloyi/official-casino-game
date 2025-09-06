import React, { memo, useCallback } from 'react';
import CardStack from './CardStack';
import { calculateCardSum } from './game-logic/card-operations.js';
import { useDrag } from 'react-dnd';
import './TableCards.css';

const BuildStack = memo(({ build, onDropStack }) => {
  const memoizedOnDropStack = useCallback(
    (draggedItem) => onDropStack(draggedItem, { type: 'build', buildId: build.buildId }),
    [onDropStack, build.buildId]
  );

  return (
    <div className="build">
      <CardStack
        stackId={build.buildId}
        cards={build.cards}
        onDropStack={memoizedOnDropStack}
        buildValue={build.value}
        isBuild={true}
      />
      <div className="build-owner-tag">
        P{build.owner + 1}
      </div>
    </div>
  );
});

const DraggableTempStack = memo(({ stack, onDropOnCard, currentPlayer, onCancelStack, onConfirmStack }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'temp_stack', // A new, specific type for these stacks
    item: { stack, player: currentPlayer, source: 'temp_stack' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [stack, currentPlayer]);

  const memoizedOnDropStack = (draggedItem) => onDropOnCard(draggedItem, { type: 'temporary_stack', stackId: stack.stackId });
  const stackValue = calculateCardSum(stack.cards);

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }} className="build">
      <button className="cancel-stack-button" onClick={() => onCancelStack(stack)} aria-label="Cancel Staging Stack">
        &times;
      </button>
      <button className="confirm-stack-button" onClick={() => onConfirmStack(stack)} aria-label="Confirm Staging Stack">
        &#x2713;
      </button>
      <CardStack
        stackId={stack.stackId}
        cards={stack.cards}
        onDropStack={memoizedOnDropStack}
        isBuild={true}
        buildValue={stackValue}
      />
      <div className="temp-stack-indicator">
        Staging
      </div>
    </div>
  );
});

const DraggableLooseCard = ({ card, onDropOnCard, currentPlayer }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'card',
    item: { card, player: currentPlayer, source: 'table' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [card, currentPlayer]);

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}>
      <CardStack
        stackId={`loose-stack-${card.rank}-${card.suit}`}
        cards={[card]}
        onDropStack={(draggedItem) => onDropOnCard(draggedItem, { type: 'loose', cardId: `${card.rank}-${card.suit}` })}
      />
    </div>
  );
};

const TableCards = ({ cards, onDropOnCard, currentPlayer, onCancelStack, onConfirmStack }) => {
  const memoizedOnDropOnCard = useCallback(onDropOnCard, [onDropOnCard]);

  return (
    <div className="table-cards">
      <h3>Table Cards</h3>
      {/* The container now has a minimum height to prevent layout collapse when empty */}
      <div className="cards-container" style={{ minHeight: '150px' }}>
        {cards.map((item, index) => {
          if (item.type === 'build') {
            return <BuildStack key={item.buildId || index} build={item} onDropStack={memoizedOnDropOnCard} />;
          }
          if (item.type === 'temporary_stack') {
            return <DraggableTempStack key={item.stackId || index} stack={item} onDropOnCard={memoizedOnDropOnCard} currentPlayer={currentPlayer} onCancelStack={onCancelStack} onConfirmStack={onConfirmStack} />;
          }
          // Default to rendering a loose card
          return <DraggableLooseCard key={`loose-${item.rank}-${item.suit}` || index} card={item} onDropOnCard={memoizedOnDropOnCard} currentPlayer={currentPlayer} />;
        })}
      </div>
    </div>
  );
};

export default memo(TableCards);
