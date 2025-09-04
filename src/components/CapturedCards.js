import React from 'react';
import CardStack from './CardStack'; // We assume CardStack component exists and works
import './CapturedCards.css';

const CapturedCards = React.memo(({ player, cards: capturedGroups }) => {
  if (!capturedGroups || capturedGroups.length === 0) {
    return (
      <div className="cards-container empty">
        <p>No Cards.</p>
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
