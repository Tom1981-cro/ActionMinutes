import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SignIn, SignUp, useUser } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import logoIcon from "@assets/am_logo_1767300370565.png";
import { useState } from "react";

export default function AuthPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.hasCompletedOnboarding) {
        setLocation("/app/inbox");
      } else {
        setLocation("/app/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  // Show loading while Clerk is loading or while we're authenticating with the backend
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // If Clerk is signed in, show loading while backend sync happens
  // The useEffect above will redirect once authentication is complete
  if (isSignedIn && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500">Signing you in...</p>
        </div>
      </div>
    );
  }

  // If fully authenticated, the useEffect will handle redirect
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          {isRegisterMode ? (
            <SignUp 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-glow rounded-2xl border-gray-200",
                  headerTitle: "text-slate-900",
                  headerSubtitle: "text-slate-500",
                  formButtonPrimary: "btn-gradient shadow-lg shadow-indigo-500/30",
                  footerActionLink: "text-indigo-600 hover:text-indigo-700",
                }
              }}
              routing="hash"
              signInUrl="/login"
              afterSignUpUrl="/app/onboarding"
            />
          ) : (
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-glow rounded-2xl border-gray-200",
                  headerTitle: "text-slate-900",
                  headerSubtitle: "text-slate-500",
                  formButtonPrimary: "btn-gradient shadow-lg shadow-indigo-500/30",
                  footerActionLink: "text-indigo-600 hover:text-indigo-700",
                }
              }}
              routing="hash"
              signUpUrl="/login"
              afterSignInUrl="/app/inbox"
            />
          )}
        </div>
      </div>
    </div>
  );
}
