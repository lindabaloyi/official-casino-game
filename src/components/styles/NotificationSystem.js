import React, { createContext, useContext, useState, useCallback } from 'react';
import './NotificationSystem.css';

// Create notification context
const NotificationContext = createContext();

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 4000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((message) => addNotification({ type: 'success', message }), [addNotification]);
  const showError = useCallback((message) => addNotification({ type: 'error', message }), [addNotification]);
  const showWarning = useCallback((message) => addNotification({ type: 'warning', message }), [addNotification]);
  const showInfo = useCallback((message) => addNotification({ type: 'info', message }), [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Individual notification component
const Notification = ({ notification, onRemove }) => {
  const { id, type, message, title } = notification;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  return (
    <div
      className={`notification notification--${type}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="notification__icon">
        {getIcon()}
      </div>
      <div className="notification__content">
        {title && <div className="notification__title">{title}</div>}
        <div className="notification__message">{message}</div>
      </div>
      <button
        className="notification__close"
        onClick={() => onRemove(id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

// Notification container component
const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container" aria-label="Notifications">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};