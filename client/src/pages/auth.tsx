import { useEffect, useState } from "react";
import { useAuth, forgotPassword, resetPassword } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import logoIcon from "@assets/am_logo_1767300370565.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function AuthPage() {
  const { isLoading, isAuthenticated, user, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const resetToken = new URLSearchParams(search).get("token");
  
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.hasCompletedOnboarding) {
        setLocation("/app/inbox");
      } else {
        setLocation("/app/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setSubmitting(false);
          return;
        }
        await register(email, password, name);
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setSuccess("If an account exists with that email, you will receive a password reset link.");
      } else if (mode === "reset") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setSubmitting(false);
          return;
        }
        await resetPassword(resetToken!, password);
        setSuccess("Password reset successfully. You can now log in.");
        setTimeout(() => setMode("login"), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <img src={logoIcon} alt="ActionMinutes" className="h-12 w-auto" />
          <h1 className="text-2xl font-bold text-white">ActionMinutes</h1>
        </div>

        <Card className="bg-[#1a1a1a]/80 backdrop-blur-xl border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-white">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create account"}
              {mode === "forgot" && "Reset password"}
              {mode === "reset" && "Set new password"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {mode === "login" && "Sign in to your account"}
              {mode === "register" && "Get started with ActionMinutes"}
              {mode === "forgot" && "Enter your email to receive a reset link"}
              {mode === "reset" && "Enter your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="pl-10 bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-500"
                      required
                      data-testid="input-name"
                    />
                  </div>
                </div>
              )}

              {(mode === "login" || mode === "register" || mode === "forgot") && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-500"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
              )}

              {(mode === "login" || mode === "register" || mode === "reset") && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-500"
                      required
                      minLength={mode === "login" ? 1 : 8}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {(mode === "register" || mode === "reset") && (
                    <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                  )}
                </div>
              )}

              {(mode === "register" || mode === "reset") && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-500"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm" data-testid="auth-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm" data-testid="auth-success">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                disabled={submitting}
                data-testid="button-submit"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" && "Sign in"}
                    {mode === "register" && "Create account"}
                    {mode === "forgot" && "Send reset link"}
                    {mode === "reset" && "Reset password"}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              {mode === "login" && (
                <>
                  <button
                    onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                    className="text-violet-400 hover:text-violet-300 mb-2 block w-full"
                    data-testid="link-forgot-password"
                  >
                    Forgot your password?
                  </button>
                  <span>
                    Don't have an account?{" "}
                    <button
                      onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                      className="text-violet-400 hover:text-violet-300"
                      data-testid="link-register"
                    >
                      Sign up
                    </button>
                  </span>
                </>
              )}
              {mode === "register" && (
                <span>
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                    className="text-violet-400 hover:text-violet-300"
                    data-testid="link-login"
                  >
                    Sign in
                  </button>
                </span>
              )}
              {mode === "forgot" && (
                <button
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className="text-violet-400 hover:text-violet-300"
                  data-testid="link-back-to-login"
                >
                  Back to sign in
                </button>
              )}
              {mode === "reset" && (
                <button
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); setLocation("/login"); }}
                  className="text-violet-400 hover:text-violet-300"
                  data-testid="link-back-to-login"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
