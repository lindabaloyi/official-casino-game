import React, { memo, useCallback } from 'react';
import CardStack from './CardStack';
import { rankValue } from './game-logic/card-operations.js';
import './TableCards.css';

const BuildStack = memo(({ build, onDropStack }) => {
  const displayCards = React.useMemo(() => {
    return [...build.cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
  }, [build.cards]);

  const memoizedOnDropStack = useCallback(
    (draggedItem) => onDropStack(draggedItem, { type: 'build', buildId: build.buildId }),
    [onDropStack, build.buildId]
  );

  return (
    <div className="build">
      <CardStack
        stackId={build.buildId}
        cards={displayCards}
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

const TableCards = ({ cards, onDropOnCard }) => {
  // Separate loose cards from builds to render them differently.
  const looseCards = React.useMemo(() => cards.filter(c => !c.type), [cards]);
  const builds = React.useMemo(() => cards.filter(c => c.type === 'build'), [cards]);

  const memoizedOnDropOnCard = useCallback(onDropOnCard, [onDropOnCard]);

  return (
    <div className="table-cards">
      <h3>Table Cards</h3>
      {/* The container now has a minimum height to prevent layout collapse when empty */}
      <div className="cards-container" style={{ minHeight: '150px' }}>
        {cards.length > 0 && (
          <>
            {/* Render each loose card as its own individual stack */}
            {looseCards.map((card, index) =>
              <CardStack
                key={`loose-stack-${card.rank}-${card.suit}`}
                stackId={`loose-stack-${card.rank}-${card.suit}`}
                cards={[card]} // Each loose card is a stack of one.
                onDropStack={(draggedItem) => memoizedOnDropOnCard(draggedItem, {
                  type: 'loose',
                  rank: card.rank,
                  suit: card.suit,
                  cardId: `${card.rank}-${card.suit}`
                })}
              />
            )}
            {/* Render each build as a stack inside its own container */}
            {builds.map((build, index) => (
              <BuildStack key={`build-container-${index}`} build={build} onDropStack={memoizedOnDropOnCard} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(TableCards);
