import React from 'react';
import Card from './Card';

const CapturedCards = ({ player, cards }) => {
  // Show the top card of the capture pile
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  return (
    <div className="captured-cards captured-cards-positioned">
      <h4>{`Player ${player + 1} Captured (${cards.length})`}</h4>
      <div className="cards-container captured-cards-container horizontal-cards">
        {topCard ? (
          <Card rank={topCard.rank} suit={topCard.suit} />
        ) : (
          <div className="card-placeholder captured-card-placeholder">Empty</div>
        )}
      </div>
    </div>
  );
};

export default CapturedCards;