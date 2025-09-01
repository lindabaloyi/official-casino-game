import React from 'react';
import CardStack from './CardStack'; // We assume CardStack component exists and works
import './CapturedCards.css';

const CapturedCards = React.memo(({ player, cards: capturedGroups }) => {
  if (!capturedGroups || capturedGroups.length === 0) {
    return (
      <div className="captured-cards">
        <h4>Player {player + 1} Captures</h4>
        <div className="cards-container empty">
          <p>No cards captured yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="captured-cards">
      <h4>Player {player + 1} Captures</h4>
      <div className="cards-container">
        {capturedGroups.map((group, index) => (
          <CardStack
            key={`capture-group-${player}-${index}`}
            cards={group}
          />
        ))}
      </div>
    </div>
  );
});

export default CapturedCards;
