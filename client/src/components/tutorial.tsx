import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { X, ArrowRight, ArrowLeft, Sparkle, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
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
    route: "/app/inbox",
    position: "center",
  },
  {
    id: "capture",
    title: "Capture Meeting Notes",
    description: "Start here! Type, paste, or upload your meeting notes. You can even use voice recording or take a photo of handwritten notes.",
    route: "/app/capture",
    highlightSelector: "[data-testid='nav-capture']",
    position: "bottom",
  },
  {
    id: "extraction",
    title: "AI Extraction",
    description: "Our AI analyzes your notes and extracts action items, decisions, and risks. Review and refine the results with one click.",
    route: "/app/capture",
    position: "center",
  },
  {
    id: "inbox",
    title: "Your Action Inbox",
    description: "All your action items land here. Filter by status, owner, or priority. Check off tasks as you complete them.",
    route: "/app/inbox",
    highlightSelector: "[data-testid='nav-inbox']",
    position: "bottom",
  },
  {
    id: "drafts",
    title: "Follow-up Drafts",
    description: "Ready-to-send email drafts are generated automatically. Review, edit, and send follow-ups in seconds.",
    route: "/app/drafts",
    highlightSelector: "[data-testid='nav-drafts']",
    position: "bottom",
  },
];

export function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [, setLocation] = useLocation();
  const { updateUser } = useStore();
  const { user: authUser, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && authUser?.hasCompletedOnboarding && !authUser?.hasCompletedTutorial) {
      setCurrentStep(0);
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authUser?.hasCompletedOnboarding, authUser?.hasCompletedTutorial]);

  const completeTutorial = useCallback(async () => {
    setIsVisible(false);
    updateUser({ hasCompletedTutorial: true });
    
    try {
      await apiRequest("PATCH", "/api/users/me", { hasCompletedTutorial: true });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
        className="fixed inset-0 bg-black/20 z-50 transition-opacity duration-300"
        onClick={handleSkip}
        data-testid="tutorial-overlay"
      />

      <div
        className={cn(
          "fixed z-50 w-[90vw] max-w-md bg-card rounded-2xl border border-border p-6 transition-all duration-300",
          "after:content-[''] after:absolute after:-inset-4 after:bg-card/40 after:backdrop-blur-md after:-z-10 after:rounded-[2rem]",
          step.position === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          step.position === "bottom" && "bottom-24 left-1/2 -translate-x-1/2 md:bottom-8",
          step.position === "top" && "top-24 left-1/2 -translate-x-1/2"
        )}
        data-testid="tutorial-modal"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="tutorial-skip-button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Sparkle className="w-5 h-5 text-primary-foreground" weight="duotone" />
          </div>
          <div className="flex gap-1.5">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/50" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2" data-testid="tutorial-title">
          {step.title}
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed" data-testid="tutorial-description">
          {step.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
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
              className="gap-1 bg-primary hover:bg-primary/90"
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
        setLocation("/app/inbox");
      }
    } catch (error) {
      console.error("Failed to restart tutorial:", error);
    }
  }, [updateUser, setLocation]);

  return restartTutorial;
}
