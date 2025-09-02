import React from 'react';
import CardStack from './CardStack'; // We assume CardStack component exists and works
import { rankValue } from './game-logic';
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
        {capturedGroups.map((group, index) => {
          const capturingCard = group[0]; // Assuming the first card is always the capturing card
          const capturedTableCards = group.slice(1); // The rest are the captured table cards

          const sortedCapturedTableCards = [...capturedTableCards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

          const displayCards = [capturingCard, ...capturedTableCards];

          return (
            <CardStack
              key={`capture-group-${player}-${index}`}
              cards={displayCards}
            />
          );
        })}
      </div>
    </div>
  );
});

export default CapturedCards;
