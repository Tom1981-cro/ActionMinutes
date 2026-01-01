import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@assets/am_logo_1767300370565.png";

export default function AuthPage() {
  const { setUser } = useStore();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const user = await api.auth.getOrCreateDemoUser();
      setUser(user);
      setLocation("/onboarding");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <CardTitle className="text-slate-900 text-xl">Sign in</CardTitle>
            <CardDescription className="text-slate-500">Enter your email to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  data-testid="input-email"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base rounded-lg btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30" 
                disabled={isLoading}
                data-testid="button-signin"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-slate-500">
            Don't have an account? <span className="text-indigo-600 font-medium ml-1 cursor-pointer hover:underline">Create account</span>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-slate-400">
          Demo mode • No password required
        </p>
      </div>
    </div>
  );
}
