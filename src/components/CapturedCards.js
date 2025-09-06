import React from 'react';
import CardStack from './CardStack'; // We assume CardStack component exists and works
import './CapturedCards.css';

const CapturedCards = React.memo(({ player, cards: capturedGroups }) => {
  if (!capturedGroups || capturedGroups.length === 0) {
    return (
<<<<<<< HEAD
      <div className="captured-cards">
        <h4>Player {player + 1} Captures</h4>
        <div className="cards-container empty">
          <p>No cards captured yet KRM.</p>
        </div>
=======
      <div className="cards-container empty">
        <p>No Cards.</p>
>>>>>>> 4e20f960b2ad081eaa4a209f0f5b07eacae3c935
      </div>
    );
  }

  // Flatten all capture groups into a single pile for display.
  const allCapturedCards = capturedGroups.flat();

  return (
    <div className="cards-container">
      {/* Render a single stack for the entire capture pile, styled like a build */}
      <CardStack
        key={`capture-pile-${player}`}
        cards={allCapturedCards}
        isBuild={true} // This ensures only the top card is visible
      />
    </div>
  );
});

export default CapturedCards;
