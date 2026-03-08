import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRight, ArrowLeft } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent", description: "Check your email for the password reset link." });
        setIsForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "You're now signed in." });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-grid relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 cursor-pointer" onClick={() => navigate("/")}>
            <Search className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-heading">OwnerTrace</span>
          </div>
          <p className="text-muted-foreground">
            {isForgotPassword
              ? "Enter your email to reset your password"
              : isLogin
              ? "Welcome back"
              : "Create your account"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading
                ? "Loading..."
                : isForgotPassword
                ? "Send Reset Link"
                : isLogin
                ? "Sign In"
                : "Sign Up"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            {isForgotPassword ? (
              <button
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            ) : (
              <>
                {isLogin && (
                  <button
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
