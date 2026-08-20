import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export interface ProfileStep {
  id: string;
  name: string;
  weight: number;
  completed: boolean;
}

interface ProfileTourContextState {
  percentage: number;
  steps: ProfileStep[];
  runTour: boolean;
  tourCompleted: boolean;
  startTour: () => void;
  stopTour: () => void;
  markStepCompleted: (id: string) => void;
  finishTour: () => void;
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

export const ProfileTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<ProfileStep[]>(DEFAULT_STEPS);
  const [runTour, setRunTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setSteps(DEFAULT_STEPS);
      setRunTour(false);
      setTourCompleted(false);
      return;
    }

    const stepsKey = `profile_steps:${user.id}`;
    const tourKey = `platform_tour_completed:${user.id}`;
    const savedSteps = localStorage.getItem(stepsKey);

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

    setRunTour(false);
    setTourCompleted(localStorage.getItem(tourKey) === "true");
  }, [user?.id]);

  // Recalculate percentage natively
  const percentage = steps.reduce((acc, step) => acc + (step.completed ? step.weight : 0), 0);

  const startTour = () => setRunTour(true);
  const stopTour = () => setRunTour(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStartTour = () => {
      setRunTour(true);
      setTourCompleted(false);
    };

    window.addEventListener("initoption:start-platform-tour", handleStartTour);
    return () => window.removeEventListener("initoption:start-platform-tour", handleStartTour);
  }, []);
  
  const finishTour = () => {
    setRunTour(false);
    setTourCompleted(true);
    if (user?.id) {
      localStorage.setItem(`platform_tour_completed:${user.id}`, "true");
    }
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
        startTour,
        stopTour,
        finishTour,
        markStepCompleted
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
