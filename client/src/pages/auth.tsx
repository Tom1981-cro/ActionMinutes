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
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-[#0a0a0a] to-fuchsia-900/30" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <img src={logoIcon} alt="ActionMinutes" className="h-10 w-auto" />
          <span className="text-xl font-bold text-white group-hover:text-violet-300 transition-colors">ActionMinutes</span>
        </Link>
      </div>

      <div className="relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Turn messy meetings into{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              clear actions
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/60 max-w-md">
            AI-powered meeting notes that extract action items, decisions, and follow-ups in under 60 seconds.
          </p>
        </motion.div>

        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30">
              <Brain className="h-4 w-4 text-violet-400" weight="duotone" />
            </div>
            <span>AI extracts action items automatically</span>
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30">
              <Lightning className="h-4 w-4 text-fuchsia-400" weight="duotone" />
            </div>
            <span>Generate follow-up emails instantly</span>
          </div>
          <div className="flex items-center gap-3 text-white/70">
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
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 border-2 border-[#0a0a0a] flex items-center justify-center text-xs font-medium text-white"
              >
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <div className="text-sm text-white/50">
            <span className="text-white font-medium">2,000+</span> teams ship faster with ActionMinutes
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

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.hasCompletedOnboarding) {
        if (planParam) {
          sessionStorage.setItem('pendingPlan', planParam);
        }
        setLocation("/app/onboarding");
      } else if (planParam) {
        setLocation("/app/settings?tab=subscription");
      } else {
        setLocation("/app/inbox");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation, planParam]);

  useEffect(() => {
    return () => {
      if (!planParam) {
        sessionStorage.removeItem('pendingPlan');
      }
    };
  }, [planParam]);

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
    <div className="min-h-screen flex bg-[#0a0a0a]">
      <div className="flex-1 lg:w-1/2">
        <BrandingPanel />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 bg-[#0f0f0f]">
        <div className="lg:hidden flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="ActionMinutes" className="h-8 w-auto" />
            <span className="text-lg font-bold text-white">ActionMinutes</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
              {mode === "reset" && "Set new password"}
            </h2>
            <p className="text-gray-400 mb-8">
              {mode === "login" && "Sign in to continue to ActionMinutes"}
              {mode === "register" && "Get started with ActionMinutes for free"}
              {mode === "forgot" && "Enter your email to receive a reset link"}
              {mode === "reset" && "Choose a strong password for your account"}
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300 text-sm">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10 h-11 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                    required
                    data-testid="input-name"
                  />
                </div>
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-11 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                      className="text-xs text-violet-400 hover:text-violet-300"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:ring-violet-500/20"
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
                  <p className="text-xs text-gray-500">Must be at least 8 characters with a letter and number</p>
                )}
              </div>
            )}

            {(mode === "register" || mode === "reset") && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300 text-sm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:ring-violet-500/20"
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
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-lg shadow-violet-500/25"
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
              <p className="text-xs text-gray-500 text-center">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-violet-400 hover:text-violet-300">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</Link>
              </p>
            )}
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            {mode === "login" && (
              <span>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                  className="text-violet-400 hover:text-violet-300 font-medium"
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
                  className="text-violet-400 hover:text-violet-300 font-medium"
                  data-testid="link-login"
                >
                  Sign in
                </button>
              </span>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="text-violet-400 hover:text-violet-300 font-medium"
                data-testid="link-back-to-login"
              >
                Back to sign in
              </button>
            )}
            {mode === "reset" && (
              <button
                onClick={() => { setMode("login"); setError(""); setSuccess(""); setLocation("/login"); }}
                className="text-violet-400 hover:text-violet-300 font-medium"
                data-testid="link-back-to-login"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
              <Link href="/support" className="hover:text-gray-400 transition-colors">Support</Link>
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
