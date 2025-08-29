import React from 'react';
import CardStack from './CardStack';

const TableCards = ({ cards, onDropOnCard }) => {
  // Separate loose cards from builds to render them differently.
  const looseCards = cards.filter(c => !c.type);
  const builds = cards.filter(c => c.type === 'build');

  return (
    <div className="table-cards">
      <h3>Table Cards</h3>
      <div className="cards-container">
        {/* Render each loose card as its own individual stack */}
        {looseCards.map((card, index) =>
          <CardStack
            key={`loose-stack-${index}`}
            stackId={`loose-stack-${index}`}
            cards={[card]} // Each loose card is a stack of one.
            onDropStack={(draggedItem) => onDropOnCard(draggedItem, card)}
          />
        )}
        {/* Render each build as a stack inside its own container */}
        {builds.map((build, index) => (
          <div key={`build-container-${index}`} className="build">
            <CardStack
              stackId={build.buildId || `build-stack-${index}`}
              cards={build.cards}
              onDropStack={(draggedItem) => onDropOnCard(draggedItem, build)}
            />
            <div className="build-owner-tag">
              P{build.owner + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableCards;
