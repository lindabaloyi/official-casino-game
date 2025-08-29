import React from 'react';
import { useDrop } from 'react-dnd';
import Card from './Card';

const ItemTypes = {
  CARD: 'card',
};

const rankValue = (rank) => {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
};

const CardStack = ({ cards, onDropStack, onDropOnCard, stackId }) => {
  const [{ isOverStack }, dropStack] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item, monitor) => onDropStack(item, monitor.getClientOffset()),
    collect: (monitor) => ({
      isOverStack: monitor.isOver(),
    }),
  }));

  const sortedCards = [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

  return (
    <div
      ref={dropStack}
      style={{
        position: 'relative',
        width: '65px',
        height: `${95 + (sortedCards.length - 1) * 20}px`,
        margin: '0 5px',
        backgroundColor: isOverStack ? 'rgba(173, 216, 230, 0.5)' : 'transparent',
        borderRadius: '10px',
        padding: '5px',
      }}
    >
      {sortedCards.map((card, idx) => {
        const [{ isOverCard }, dropCard] = useDrop(() => ({
          accept: ItemTypes.CARD,
          drop: (item) => {
            if (onDropOnCard) {
              onDropOnCard(item, card);
            }
          },
          collect: (monitor) => ({
            isOverCard: monitor.isOver(),
          }),
        }));

        return (
          <div
            key={`${stackId}-${card.rank}-${card.suit}-${idx}`}
            ref={dropCard}
            style={{
              position: 'absolute',
              top: `${idx * 20}px`,
              left: 0,
              zIndex: idx,
              backgroundColor: isOverCard ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
              borderRadius: '5px',
            }}
          >
            <Card rank={card.rank} suit={card.suit} />
          </div>
        );
      })}
    </div>
  );
};

export default CardStack;