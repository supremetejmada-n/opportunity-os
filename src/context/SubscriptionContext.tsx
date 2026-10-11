import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, SubscriptionStatusResponse, PaymentOrderResponse } from '../services/api.js';
import { useAuth } from './AuthContext.js';

interface SubscriptionContextType {
  subscription: SubscriptionStatusResponse | null;
  isEntitled: boolean;
  isLoading: boolean;
  error: string | null;
  isSubscriptionModalOpen: boolean;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  refreshSubscription: () => Promise<void>;
  createOrder: () => Promise<PaymentOrderResponse>;
  verifyPayment: (data: { orderId: string; paymentId: string; signature: string }) => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);

  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.subscription.getStatus();
      setSubscription(data);
      setError(null);
    } catch (err: any) {
      console.warn('[SubscriptionContext] Failed to load subscription status:', err.message);
      setError(err.message || 'Failed to load subscription status');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription, user?.id]);

  const openSubscriptionModal = () => setIsSubscriptionModalOpen(true);
  const closeSubscriptionModal = () => setIsSubscriptionModalOpen(false);

  const createOrder = async (): Promise<PaymentOrderResponse> => {
    setError(null);
    try {
      const order = await api.subscription.createOrder();
      return order;
    } catch (err: any) {
      setError(err.message || 'Failed to create payment order');
      throw err;
    }
  };

  const verifyPayment = async (data: { orderId: string; paymentId: string; signature: string }): Promise<void> => {
    setError(null);
    try {
      await api.subscription.verifyPayment(data);
      await refreshSubscription();
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
      throw err;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    setError(null);
    try {
      await api.subscription.cancel();
      await refreshSubscription();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
      throw err;
    }
  };

  const isEntitled = Boolean(subscription?.isEntitled);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isEntitled,
        isLoading,
        error,
        isSubscriptionModalOpen,
        openSubscriptionModal,
        closeSubscriptionModal,
        refreshSubscription,
        createOrder,
        verifyPayment,
        cancelSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
