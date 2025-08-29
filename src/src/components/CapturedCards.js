import React from 'react';
import Card from './Card';

const CapturedCards = ({ player, cards }) => {
  // The 'cards' prop is an array of capture groups, e.g., [[card1, card2], [card3, card4, card5]]
  // We flatten it to get a single list of card objects for rendering in the correct order.
  const allCapturedCards = cards.flat();

  return (
    <div className="captured-cards">
      <h4>P{player + 1} Stack</h4>
      <div className="captured-stack-container">
        {allCapturedCards.length > 0 ? (
          allCapturedCards.map((card, index) => (
            <div
              key={index}
              className="card-in-capture-stack"
              style={{
                zIndex: index, // Higher index (more recent card) is on top
                top: `${index * 2}px`, // Small offset to show a stack
              }}
            >
              <Card rank={card.rank} suit={card.suit} />
            </div>
          ))
        ) : (
          <div className="captured-card-placeholder">None</div>
        )}
      </div>
    </div>
  );
};

export default CapturedCards;