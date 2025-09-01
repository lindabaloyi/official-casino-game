import React, { memo } from 'react';
import DraggableCard from './DraggableCard';
import './PlayerHand.css';

const PlayerHand = memo(({ player, cards, isCurrent, onSelectCard, selectedCard }) => {
  return (
    // We always render both hands to avoid violating rules of hooks,
    // but we use CSS to hide the non-active player's hand.
    <div
      className={`player-hand ${isCurrent ? 'current-player' : ''} ${isCurrent ? 'visible' : 'hidden'}`}
    >
      <h3>{`Player ${player + 1} ${isCurrent ? 'Hand' : ''}`}</h3>
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
