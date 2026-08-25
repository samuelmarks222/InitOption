import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export interface ProfileStep {
  id: string;
  name: string;
  weight: number;
  completed: boolean;
}

export type TourType = "platform" | "trading" | "deposit" | "withdrawal" | "account" | "copy_trading";

interface TourProgress {
  started: boolean;
  completed: boolean;
  skipped: boolean;
  lastStepIndex: number;
}

interface ProfileTourContextState {
  percentage: number;
  steps: ProfileStep[];
  runTour: boolean;
  tourCompleted: boolean;
  activeTourType: TourType;
  tourProgress: Record<TourType, TourProgress>;
  startTour: () => void;
  startTourOfType: (type: TourType) => void;
  stopTour: () => void;
  markStepCompleted: (id: string) => void;
  finishTour: () => void;
  skipTour: () => void;
  restartTour: (type?: TourType) => void;
  saveTourStep: (type: TourType, stepIndex: number) => void;
}

const ProfileTourContext = createContext<ProfileTourContextState | undefined>(undefined);

export const DEFAULT_STEPS = [
  { id: "email", name: "Email verified", weight: 10, completed: false },
  { id: "phone", name: "Phone number added", weight: 10, completed: false },
  { id: "personal", name: "Personal data filled", weight: 20, completed: false },
  { id: "kyc", name: "KYC documents uploaded", weight: 30, completed: false },
  { id: "deposit", name: "First deposit made", weight: 15, completed: false },
  { id: "trade", name: "First trade placed", weight: 15, completed: false },
];

const DEFAULT_PROGRESS: TourProgress = {
  started: false,
  completed: false,
  skipped: false,
  lastStepIndex: 0,
};

function getDefaultProgressMap(): Record<TourType, TourProgress> {
  return {
    platform: { ...DEFAULT_PROGRESS },
    trading: { ...DEFAULT_PROGRESS },
    deposit: { ...DEFAULT_PROGRESS },
    withdrawal: { ...DEFAULT_PROGRESS },
    account: { ...DEFAULT_PROGRESS },
    copy_trading: { ...DEFAULT_PROGRESS },
  };
}

export const ProfileTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<ProfileStep[]>(DEFAULT_STEPS);
  const [runTour, setRunTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [activeTourType, setActiveTourType] = useState<TourType>("platform");
  const [tourProgress, setTourProgress] = useState<Record<TourType, TourProgress>>(getDefaultProgressMap());

  useEffect(() => {
    if (!user?.id) {
      setSteps(DEFAULT_STEPS);
      setRunTour(false);
      setTourCompleted(false);
      setTourProgress(getDefaultProgressMap());
      return;
    }

    const stepsKey = `profile_steps:${user.id}`;
    const tourKey = `platform_tour_completed:${user.id}`;
    const progressKey = `tour_progress:${user.id}`;
    const savedSteps = localStorage.getItem(stepsKey);
    const savedProgress = localStorage.getItem(progressKey);

    if (savedSteps) {
      try {
        const parsed = JSON.parse(savedSteps);
        if (Array.isArray(parsed)) {
          const mergedSteps = DEFAULT_STEPS.map((step) => {
            const storedStep = parsed.find((entry: Partial<ProfileStep>) => entry?.id === step.id);
            return {
              ...step,
              completed: Boolean(storedStep?.completed),
            };
          });
          setSteps(mergedSteps);
        } else {
          setSteps(DEFAULT_STEPS);
        }
      } catch {
        setSteps(DEFAULT_STEPS);
      }
    } else {
      setSteps(DEFAULT_STEPS);
    }

    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setTourProgress({ ...getDefaultProgressMap(), ...parsed });
      } catch {
        setTourProgress(getDefaultProgressMap());
      }
    }

    setRunTour(false);
    setTourCompleted(localStorage.getItem(tourKey) === "true");
  }, [user?.id]);

  // Recalculate percentage natively
  const percentage = steps.reduce((acc, step) => acc + (step.completed ? step.weight : 0), 0);

  const saveTourStep = (type: TourType, stepIndex: number) => {
    setTourProgress(prev => {
      const next = {
        ...prev,
        [type]: { ...prev[type], started: true, lastStepIndex: stepIndex },
      };
      if (user?.id) {
        localStorage.setItem(`tour_progress:${user.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const startTour = () => {
    setActiveTourType("platform");
    setRunTour(true);
    setTourCompleted(false);
    setTourProgress(prev => {
      const next = { ...prev, platform: { ...prev.platform, started: true } };
      if (user?.id) localStorage.setItem(`tour_progress:${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  const startTourOfType = (type: TourType) => {
    setActiveTourType(type);
    setRunTour(true);
    setTourCompleted(false);
    setTourProgress(prev => {
      const next = { ...prev, [type]: { ...prev[type], started: true, skipped: false } };
      if (user?.id) localStorage.setItem(`tour_progress:${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  const stopTour = () => setRunTour(false);

  const skipTour = () => {
    setRunTour(false);
    setTourProgress(prev => {
      const next = { ...prev, [activeTourType]: { ...prev[activeTourType], skipped: true } };
      if (user?.id) localStorage.setItem(`tour_progress:${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  const restartTour = (type?: TourType) => {
    const target = type || activeTourType;
    setActiveTourType(target);
    setRunTour(true);
    setTourCompleted(false);
    setTourProgress(prev => {
      const next = {
        ...prev,
        [target]: { started: true, completed: false, skipped: false, lastStepIndex: 0 },
      };
      if (user?.id) localStorage.setItem(`tour_progress:${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStartTour = () => {
      setRunTour(true);
      setTourCompleted(false);
      setActiveTourType("platform");
    };

    const handleStartTourOfType = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: TourType }>;
      if (customEvent.detail?.type) {
        startTourOfType(customEvent.detail.type);
      }
    };

    window.addEventListener("initoption:start-platform-tour", handleStartTour);
    window.addEventListener("initoption:start-tour", handleStartTourOfType);
    return () => {
      window.removeEventListener("initoption:start-platform-tour", handleStartTour);
      window.removeEventListener("initoption:start-tour", handleStartTourOfType);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishTour = () => {
    setRunTour(false);
    setTourCompleted(true);
    setTourProgress(prev => {
      const next = { ...prev, [activeTourType]: { ...prev[activeTourType], completed: true } };
      if (user?.id) {
        localStorage.setItem(`tour_progress:${user.id}`, JSON.stringify(next));
        localStorage.setItem(`platform_tour_completed:${user.id}`, "true");
      }
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("initoption:platform-tour-finished"));
    }
  };

  const markStepCompleted = (id: string) => {
    setSteps(prev => {
      const next = prev.map(s => s.id === id ? { ...s, completed: true } : s);
      if (user?.id) {
        localStorage.setItem(`profile_steps:${user.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <ProfileTourContext.Provider
      value={{
        percentage,
        steps,
        runTour,
        tourCompleted,
        activeTourType,
        tourProgress,
        startTour,
        startTourOfType,
        stopTour,
        markStepCompleted,
        finishTour,
        skipTour,
        restartTour,
        saveTourStep,
      }}
    >
      {children}
    </ProfileTourContext.Provider>
  );
};

export const useProfileTour = () => {
  const context = useContext(ProfileTourContext);
  if (!context) throw new Error("useProfileTour must be used within ProfileTourProvider");
  return context;
};
