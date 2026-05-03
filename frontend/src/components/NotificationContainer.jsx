/**
 * Notification Component
 * Displays toast notifications from AppContext
 */

import React from 'react';
import { useApp } from '../context/AppContext';

/**
 * Notification Toast Component
 */
function NotificationToast({ notification, onClose }) {
  const typeStyles = {
    success: { backgroundColor: '#51cf66', borderColor: '#2b8a3e' },
    error: { backgroundColor: '#ff6b6b', borderColor: '#c92a2a' },
    warning: { backgroundColor: '#ffd43b', borderColor: '#f59f00' },
    info: { backgroundColor: '#74c0fc', borderColor: '#1971c2' },
  };

  return (
    <div
      style={{
        ...typeStyles[notification.type],
        padding: '12px 16px',
        margin: '8px',
        borderRadius: '4px',
        color: notification.type === 'warning' ? '#333' : '#fff',
        border: `1px solid ${typeStyles[notification.type].borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minWidth: '300px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        animation: 'slideIn 0.3s ease-in-out',
      }}
    >
      <span>{notification.message}</span>
      <button
        onClick={() => onClose(notification.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0',
          marginLeft: '12px',
        }}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Notification Container Component
 */
export function NotificationContainer() {
  const { notifications, removeNotification } = useApp();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '500px',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}

export default NotificationContainer;
