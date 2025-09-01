
import React from 'react';
import './ActionModal.css';

const ActionModal = ({ modalInfo, onAction, onCancel }) => {
  if (!modalInfo) {
    return null;
  }

  const { title, message, actions } = modalInfo;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          {actions.map((action, index) => (
            <button key={index} onClick={() => onAction(action)}>
              {action.label}
            </button>
          ))}
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
