import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { VipTierConfig, calculateVipTierFromBalance } from "@/lib/vip";

interface UserProfile {
  id?: string;
  balance?: number;
  username?: string;
  email?: string;
  avatar_url?: string;
}

interface VipState {
  currentTier: VipTierConfig;
  isLoading: boolean;
  hasChanges: boolean;
}

interface VipContextType {
  vip: VipState;
  updateBalance: (newBalance: number) => Promise<void>;
  refreshVip: () => Promise<void>;
  triggerTierUpgrade: (newTierId: string) => Promise<void>;
}

const VipContext = createContext<VipContextType | undefined>(undefined);

interface VipProviderProps {
  children: ReactNode;
  initialUser?: UserProfile;
}

export const VipProvider = ({ children, initialUser }: VipProviderProps) => {
  const [vipState, setVipState] = useState<VipState>(() => {
    const initialBalance = initialUser?.balance || 0;
    const initialTier = calculateVipTierFromBalance(initialBalance);

    return {
      currentTier: initialTier,
      isLoading: false,
      hasChanges: false,
    };
  });

  const fetchUserProfile = async (): Promise<UserProfile | null> => {
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  };

  const refreshVip = useCallback(async () => {
    setVipState(prev => ({ ...prev, isLoading: true }));

    try {
      const userProfile = await fetchUserProfile();
      const newBalance = userProfile?.balance || 0;
      const newTier = calculateVipTierFromBalance(newBalance);

      setVipState(prev => ({
        ...prev,
        currentTier: newTier,
        hasChanges: newTier.id !== prev.currentTier.id,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to refresh VIP status:", error);
      setVipState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const triggerTierUpgrade = useCallback(async (newTierId: string) => {
    try {
      const response = await fetch("/api/vip/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tierId: newTierId }),
      });

      if (!response.ok) {
        throw new Error("Failed to upgrade tier");
      }

      const newTier = calculateVipTierFromBalance(
        newTierId === "vip" ? 10000 : newTierId === "pro" ? 5000 : 0
      );

      setVipState(prev => ({
        ...prev,
        currentTier: newTier,
        hasChanges: false,
      }));
    } catch (error) {
      console.error("Failed to trigger tier upgrade:", error);
      throw error;
    }
  }, []);

  const updateBalance = useCallback(async (newBalance: number) => {
    try {
      const response = await fetch(`/api/user/balance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ balance: newBalance }),
      });

      if (!response.ok) {
        throw new Error("Failed to update balance");
      }

      const newTier = calculateVipTierFromBalance(newBalance);

      setVipState(prev => ({
        ...prev,
        currentTier: newTier,
        hasChanges: newTier.id !== prev.currentTier.id,
      }));
    } catch (error) {
      console.error("Failed to update balance:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    refreshVip();
  }, [refreshVip]);

  const value: VipContextType = {
    vip: vipState,
    updateBalance,
    refreshVip,
    triggerTierUpgrade,
  };

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
};

export const useVip = () => {
  const context = useContext(VipContext);
  if (!context) {
    throw new Error("useVip must be used within a VipProvider");
  }
  return context;
};
