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

const TableCards = ({ cards, onDropOnCard, currentPlayer }) => {
  // Separate loose cards from builds to render them differently.
  const looseCards = React.useMemo(() => cards.filter(c => !c.type), [cards]);
  const builds = React.useMemo(() => cards.filter(c => c.type === 'build'), [cards]);
  const temporaryStacks = React.useMemo(() => cards.filter(c => c.type === 'temporary_stack'), [cards]);

  const memoizedOnDropOnCard = useCallback(onDropOnCard, [onDropOnCard]);

  return (
    <div className="table-cards">
      <h3>Table Cards</h3>
      {/* The container now has a minimum height to prevent layout collapse when empty */}
      <div className="cards-container" style={{ minHeight: '150px' }}>
        {cards.length > 0 && (
          <>
            {/* Render each loose card as its own individual stack */}
            {looseCards.map((card) => <DraggableLooseCard key={`draggable-loose-${card.rank}-${card.suit}`} card={card} onDropOnCard={memoizedOnDropOnCard} currentPlayer={currentPlayer} />)}
            {/* Render each build as a stack inside its own container */}
            {builds.map((build) => (
              <BuildStack key={build.buildId} build={build} onDropStack={memoizedOnDropOnCard} />
            ))}
            {/* Render each temporary stack for capture */}
            {temporaryStacks.map((stack) => {
              const memoizedOnDropStack = (draggedItem) => onDropOnCard(draggedItem, { type: 'temporary_stack', stackId: stack.stackId });
              const stackValue = calculateCardSum(stack.cards);
              return (
                <div key={stack.stackId} className="build">
                  <CardStack
                    stackId={stack.stackId}
                    cards={stack.cards}
                    onDropStack={memoizedOnDropStack}
                    isBuild={true} // Show as a collapsed stack
                    buildValue={stackValue} // Display the live sum
                  />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(TableCards);
