import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { X, ArrowRight, ArrowLeft, Sparkle, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  route: string;
  highlightSelector?: string;
  position?: "center" | "bottom" | "top";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to ActionMinutes!",
    description: "Let's take a quick tour of the key features that will help you turn meeting notes into action. This will only take about a minute.",
    route: "/inbox",
    position: "center",
  },
  {
    id: "capture",
    title: "Capture Meeting Notes",
    description: "Start here! Type, paste, or upload your meeting notes. You can even use voice recording or take a photo of handwritten notes.",
    route: "/capture",
    highlightSelector: "[data-testid='nav-capture']",
    position: "bottom",
  },
  {
    id: "extraction",
    title: "AI Extraction",
    description: "Our AI analyzes your notes and extracts action items, decisions, and risks. Review and refine the results with one click.",
    route: "/capture",
    position: "center",
  },
  {
    id: "inbox",
    title: "Your Action Inbox",
    description: "All your action items land here. Filter by status, owner, or priority. Check off tasks as you complete them.",
    route: "/inbox",
    highlightSelector: "[data-testid='nav-inbox']",
    position: "bottom",
  },
  {
    id: "drafts",
    title: "Follow-up Drafts",
    description: "Ready-to-send email drafts are generated automatically. Review, edit, and send follow-ups in seconds.",
    route: "/drafts",
    highlightSelector: "[data-testid='nav-drafts']",
    position: "bottom",
  },
];

export function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [, setLocation] = useLocation();
  const { user, updateUser } = useStore();

  useEffect(() => {
    if (user.isAuthenticated && user.hasCompletedOnboarding && !user.hasCompletedTutorial) {
      setCurrentStep(0);
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user.isAuthenticated, user.hasCompletedOnboarding, user.hasCompletedTutorial]);

  const completeTutorial = useCallback(async () => {
    try {
      const response = await apiRequest("PATCH", "/api/users/me", { hasCompletedTutorial: true });
      if (response.ok) {
        updateUser({ hasCompletedTutorial: true });
        setIsVisible(false);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    } catch (error) {
      console.error("Failed to save tutorial completion:", error);
    }
  }, [updateUser]);

  const handleNext = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = tutorialSteps[currentStep + 1];
      if (nextStep.route) {
        setLocation(nextStep.route);
      }
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  }, [currentStep, setLocation, completeTutorial]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = tutorialSteps[currentStep - 1];
      if (prevStep.route) {
        setLocation(prevStep.route);
      }
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setLocation]);

  const handleSkip = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300"
        onClick={handleSkip}
        data-testid="tutorial-overlay"
      />

      <div
        className={cn(
          "fixed z-50 w-[90vw] max-w-md bg-white rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-gray-100 p-6 transition-all duration-300",
          step.position === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          step.position === "bottom" && "bottom-24 left-1/2 -translate-x-1/2 md:bottom-8",
          step.position === "top" && "top-24 left-1/2 -translate-x-1/2"
        )}
        data-testid="tutorial-modal"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          data-testid="tutorial-skip-button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkle className="w-5 h-5 text-white" weight="duotone" />
          </div>
          <div className="flex gap-1.5">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  index === currentStep ? "bg-indigo-600" : index < currentStep ? "bg-indigo-300" : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2" data-testid="tutorial-title">
          {step.title}
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed" data-testid="tutorial-description">
          {step.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
            data-testid="tutorial-skip"
          >
            Skip tour
          </Button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="gap-1"
                data-testid="tutorial-prev"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              data-testid="tutorial-next"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function useRestartTutorial() {
  const { updateUser } = useStore();
  const [, setLocation] = useLocation();
  
  const restartTutorial = useCallback(async () => {
    try {
      const response = await apiRequest("PATCH", "/api/users/me", { hasCompletedTutorial: false });
      if (response.ok) {
        updateUser({ hasCompletedTutorial: false });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setLocation("/inbox");
      }
    } catch (error) {
      console.error("Failed to restart tutorial:", error);
    }
  }, [updateUser, setLocation]);

  return restartTutorial;
}
