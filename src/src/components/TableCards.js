import React from 'react';
import CardStack from './CardStack';

const TableCards = ({ cards, onDropOnCard }) => {
  // Group loose cards by their rank.
  const looseCardGroups = cards
    .filter(c => !c.type)
    .reduce((groups, card) => {
      (groups[card.rank] = groups[card.rank] || []).push(card);
      return groups;
    }, {});

  const builds = cards.filter(c => c.type === 'build');

  return (
    <div className="table-cards">
      <h3>Table Cards</h3>
      <div className="cards-container">
        {/* Render each group of loose cards as a stack */}
        {Object.values(looseCardGroups).map((group, index) =>
          <CardStack
            key={`loose-stack-${index}`}
            stackId={`loose-stack-${index}`}
            cards={group}
            onDropStack={onDropOnCard}
          />
        )}
        {/* Render each build as a stack inside its own container */}
        {builds.map((build, index) => (
          <div key={`build-container-${index}`} className="build">
            <CardStack
              stackId={`build-stack-${index}`}
              cards={build.cards}
              onDropStack={onDropOnCard}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableCards;
