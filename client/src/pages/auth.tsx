import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Logo, LogoWordmark } from "@/components/logo";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-stone-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Logo variant="squircle" size={48} />
            <LogoWordmark size="lg" />
          </div>
          <p className="text-slate-600 text-lg">
            Turn meeting notes into actions and follow-ups—fast.
          </p>
        </div>

        <Card className="border-stone-200 shadow-soft bg-white rounded-3xl">
          <CardHeader>
            <CardTitle className="text-slate-800">Sign in</CardTitle>
            <CardDescription className="text-stone-500">Enter your email to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-2xl border-stone-200"
                  data-testid="input-email"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base rounded-2xl bg-teal-500 hover:bg-teal-600 shadow-sm" 
                disabled={isLoading}
                data-testid="button-signin"
              >
                {isLoading ? "Signing in..." : "Sign in"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-stone-500">
             Don't have an account? <span className="text-teal-600 font-medium ml-1 cursor-pointer hover:underline">Create account</span>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-stone-400">
          Demo mode • No password required
        </p>
      </div>
    </div>
  );
}
