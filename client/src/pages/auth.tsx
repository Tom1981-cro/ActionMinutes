import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import logoIcon from "@assets/am_logo_1767300370565.png";

export default function AuthPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/onboarding");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center gap-3 mb-4">
            <img src={logoIcon} alt="ActionMinutes" className="w-12 h-12 rounded-xl" />
            <span className="text-2xl tracking-tight text-slate-900">
              <span className="font-bold">Action</span><span className="font-normal">Minutes</span>
            </span>
          </div>
          <p className="text-lg text-slate-600">
            Turn Minutes into <span className="text-purple-600 font-medium">Velocity</span>
          </p>
        </div>

        <Card className="border-gray-200 shadow-glow bg-white rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-slate-900 text-xl">Welcome</CardTitle>
            <CardDescription className="text-slate-500">Sign in to continue to ActionMinutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleLogin}
              className="w-full h-12 text-base rounded-lg btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30" 
              data-testid="button-signin"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Sign in with Replit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-center text-sm text-slate-500">
              Continue with Google, GitHub, Apple, or email
            </p>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-slate-400">
          Secure authentication powered by Replit
        </p>
      </div>
    </div>
  );
}
