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
        setLocation("/inbox");
      } else {
        setLocation("/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isSignedIn) {
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
              signInUrl="/auth"
              afterSignUpUrl="/onboarding"
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
              signUpUrl="/auth"
              afterSignInUrl="/inbox"
            />
          )}
        </div>
      </div>
    </div>
  );
}
