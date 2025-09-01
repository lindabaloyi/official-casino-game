import React, { memo } from 'react';

// Using a single object for suit details, keyed by the symbol.
// This object is declared once to avoid redeclaration errors.
const suitDetails = {
  '♥': { color: '#d40000', name: 'hearts' },
  '♦': { color: '#d40000', name: 'diamonds' },
  '♣': { color: '#000000', name: 'clubs' },
  '♠': { color: '#000000', name: 'spades' },
};

const cardStyle = {
  border: '1.5px solid black',
  borderRadius: '10px',
  width: '65px',
  height: '95px',
  backgroundColor: 'white',
  boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
  cursor: 'pointer',
  userSelect: 'none',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center', // Center the main suit symbol
  alignItems: 'center',
  padding: '8px',
  fontFamily: "'Times New Roman', Times, serif",
  position: 'relative',
  fontSize: '18px', // Slightly larger base font
  fontWeight: 'bold',
};

const cornerStyle = {
  position: 'absolute',
  lineHeight: '1',
  textAlign: 'center',
};

function Card({ rank, suit, isSelected, onClick }) {
  // The `suit` prop is a symbol (e.g., '♥'), so we use it directly.
  const { color, name } = suitDetails[suit] || { color: 'black', name: '' };
  const suitSymbol = suit;

  return (
    <div
      className={`card${isSelected ? ' selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => { if (e.key === 'Enter') onClick(); }}
      aria-label={`${rank} of ${name}`} // Use the full suit name for accessibility
      style={{
        ...cardStyle,
        color, // Apply color to the whole card for simplicity
        border: isSelected ? '2.5px solid #007bff' : cardStyle.border,
        boxShadow: isSelected ? '0 0 10px #007bff' : cardStyle.boxShadow,
      }}
    >
      <div className="card-corner top-left" style={{ ...cornerStyle, top: '5px', left: '5px' }}>
        <div className="rank">{rank}</div>
        <div className="suit">{suitSymbol}</div>
      </div>
      <div className="card-center" style={{ fontSize: '36px' }}>
        {suitSymbol}
      </div>
      <div className="card-corner bottom-right" style={{ ...cornerStyle, bottom: '5px', right: '5px', transform: 'rotate(180deg)' }}>
        <div className="rank">{rank}</div>
        <div className="suit">{suitSymbol}</div>
      </div>
    </div>
  );
}

export default memo(Card);