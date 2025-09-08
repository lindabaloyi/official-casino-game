import React, { memo } from 'react';
import DraggableCard from './DraggableCard';
import './PlayerHand.css';

const PlayerHand = memo(({ player, cards, isCurrent, onSelectCard, selectedCard, gameMode }) => {
  // In online mode, the hand should always be visible. In local mode, it depends on `isCurrent`.
  const isVisible = gameMode === 'online' || isCurrent;

  return (
    // We always render both hands to avoid violating rules of hooks,
    // but we use CSS to hide the non-active player's hand in local mode.
    <div
      className={`player-hand ${isCurrent ? 'current-player' : ''} ${isVisible ? 'visible' : 'hidden'}`}>
      
      <div className="cards-container player-cards-container">
        {cards.map((card, index) => {
          const isSelected = selectedCard && card.rank === selectedCard.rank && card.suit === selectedCard.suit;

          return (
            <DraggableCard
              key={`${card.rank}-${card.suit}`}
              card={card}
              player={player}
              isCurrent={isCurrent}
              isSelected={isSelected}
              onSelectCard={onSelectCard}
            />
          );
        })}
      </div>
    </div>
  );
});

export default PlayerHand;
