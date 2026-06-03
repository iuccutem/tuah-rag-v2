import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, Sheet as SheetIcon, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Sign in — Q&A Evaluation" }],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        navigate({ to: "/" });
      } else {
        setCheckingAuth(false);
      }
    };
    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate({ to: "/" });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created.");
          navigate({ to: "/" });
        } else {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sheets-toolbar-bg)] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--sheets-toolbar-bg)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--sheets-grid)] bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <SheetIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold leading-tight">Q&amp;A Evaluation</h1>
            <p className="text-[12px] text-muted-foreground">
              {isSignup ? "Create your account" : "Sign in to continue"}
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-[12px]">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              !isSignup ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              isSignup ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
            disabled={busy}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignup ? (
              <UserPlus className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
