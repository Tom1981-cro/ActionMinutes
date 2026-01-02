import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, Sparkles, Loader2, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/am_logo_1767300370565.png";

export default function AuthPage() {
  const { isLoading, isAuthenticated, user, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.hasCompletedOnboarding) {
        setLocation("/inbox");
      } else {
        setLocation("/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let loggedInUser;
      if (isRegisterMode) {
        loggedInUser = await register(email, password, name);
        toast({ title: "Account created!", description: "Welcome to ActionMinutes" });
        setLocation("/onboarding");
      } else {
        loggedInUser = await login(email, password);
        if (loggedInUser?.hasCompletedOnboarding) {
          setLocation("/inbox");
        } else {
          setLocation("/onboarding");
        }
      }
    } catch (error: any) {
      toast({
        title: isRegisterMode ? "Registration failed" : "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <CardTitle className="text-slate-900 text-xl">
              {isRegisterMode ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {isRegisterMode 
                ? "Enter your details to get started" 
                : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegisterMode && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="Your name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      data-testid="input-name"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    data-testid="input-password"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base rounded-lg btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30" 
                disabled={isSubmitting}
                data-testid="button-signin"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRegisterMode ? "Creating account..." : "Signing in..."}
                  </span>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isRegisterMode ? "Create Account" : "Sign In"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-slate-500">
            {isRegisterMode ? (
              <>
                Already have an account?{" "}
                <button 
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="text-indigo-600 font-medium ml-1 hover:underline"
                  data-testid="link-signin"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button 
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-indigo-600 font-medium ml-1 hover:underline"
                  data-testid="link-register"
                >
                  Create account
                </button>
              </>
            )}
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-slate-400">
          Secure authentication with encrypted passwords
        </p>
      </div>
    </div>
  );
}
