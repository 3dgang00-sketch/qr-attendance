/**
 * App Context
 * Manages global application state (loading, notifications, etc.)
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

/**
 * AppProvider Component
 * Wraps the application to provide app-wide state
 */
export function AppProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Add a notification
   */
  const addNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);



  /**
   * Show success notification
   */
  const showSuccess = useCallback((message, duration = 3000) => {
    return addNotification(message, 'success', duration);
  }, [addNotification]);

  /**
   * Show error notification
   */
  const showError = useCallback((message, duration = 5000) => {
    return addNotification(message, 'error', duration);
  }, [addNotification]);

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message, duration = 4000) => {
    return addNotification(message, 'warning', duration);
  }, [addNotification]);

  /**
   * Show info notification
   */
  const showInfo = useCallback((message, duration = 3000) => {
    return addNotification(message, 'info', duration);
  }, [addNotification]);

  const value = {
    notifications,
    globalLoading,
    setGlobalLoading,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Custom hook to use app context
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
