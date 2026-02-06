import { useEffect, useState } from "react";
import { useAuth, forgotPassword, resetPassword } from "@/hooks/use-auth";
import { useLocation, useSearch, Link } from "wouter";
import { Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";
import { Brain, Sparkle, Lightning, CheckCircle } from "@phosphor-icons/react";
import logoIcon from "@assets/am_logo_1767300370565.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register" | "forgot" | "reset";

function BrandingPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <img src={logoIcon} alt="ActionMinutes" className="h-10 w-auto" />
          <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">ActionMinutes</span>
        </Link>
      </div>

      <div className="relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl xl:text-5xl font-bold text-foreground leading-tight">
            Turn messy meetings into{" "}
            <span className="text-primary">
              clear actions
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md">
            AI-powered meeting notes that extract action items, decisions, and follow-ups in under 60 seconds.
          </p>
        </motion.div>

        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center gap-3 text-foreground">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent border border-primary/30">
              <Brain className="h-4 w-4 text-primary" weight="duotone" />
            </div>
            <span>AI extracts action items automatically</span>
          </div>
          <div className="flex items-center gap-3 text-foreground">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent border border-primary/30">
              <Lightning className="h-4 w-4 text-primary" weight="duotone" />
            </div>
            <span>Generate follow-up emails instantly</span>
          </div>
          <div className="flex items-center gap-3 text-foreground">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle className="h-4 w-4 text-emerald-400" weight="duotone" />
            </div>
            <span>Track tasks until they're done</span>
          </div>
        </motion.div>
      </div>

      <motion.div 
        className="relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full bg-primary border-2 border-background flex items-center justify-center text-xs font-medium text-primary-foreground"
              >
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">2,000+</span> teams ship faster with ActionMinutes
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
  const planParam = new URLSearchParams(search).get("plan");
  const justRegistered = sessionStorage.getItem('justRegistered') === 'true';

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (justRegistered && !user.hasCompletedOnboarding) {
        if (planParam) {
          sessionStorage.setItem('pendingPlan', planParam);
        }
        setLocation("/app/onboarding");
      } else if (planParam) {
        sessionStorage.removeItem('justRegistered');
        setLocation("/app/settings?tab=subscription");
      } else {
        sessionStorage.removeItem('justRegistered');
        setLocation("/app/inbox");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation, planParam, justRegistered]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        sessionStorage.setItem('justRegistered', 'true');
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
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 lg:w-1/2">
        <BrandingPanel />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 bg-card">
        <div className="lg:hidden flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="ActionMinutes" className="h-8 w-auto" />
            <span className="text-lg font-bold text-foreground">ActionMinutes</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
              {mode === "reset" && "Set new password"}
            </h2>
            <p className="text-muted-foreground mb-8">
              {mode === "login" && "Sign in to continue to ActionMinutes"}
              {mode === "register" && "Get started with ActionMinutes for free"}
              {mode === "forgot" && "Enter your email to receive a reset link"}
              {mode === "reset" && "Choose a strong password for your account"}
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground text-sm">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-ring/20"
                    required
                    data-testid="input-name"
                  />
                </div>
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground text-sm">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-ring/20"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                      className="text-xs text-primary hover:text-primary/80"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-ring/20"
                    required
                    minLength={mode === "login" ? 1 : 8}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {(mode === "register" || mode === "reset") && (
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters with a letter and number</p>
                )}
              </div>
            )}

            {(mode === "register" || mode === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-ring/20"
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
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-token"
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

            {mode === "register" && (
              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:text-primary/80">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>
              </p>
            )}
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <span>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                  className="text-primary hover:text-primary/80 font-medium"
                  data-testid="link-register"
                >
                  Sign up for free
                </button>
              </span>
            )}
            {mode === "register" && (
              <span>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className="text-primary hover:text-primary/80 font-medium"
                  data-testid="link-login"
                >
                  Sign in
                </button>
              </span>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="text-primary hover:text-primary/80 font-medium"
                data-testid="link-back-to-login"
              >
                Back to sign in
              </button>
            )}
            {mode === "reset" && (
              <button
                onClick={() => { setMode("login"); setError(""); setSuccess(""); setLocation("/login"); }}
                className="text-primary hover:text-primary/80 font-medium"
                data-testid="link-back-to-login"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-border mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            </div>
            <div>
              © {new Date().getFullYear()} ActionMinutes. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
