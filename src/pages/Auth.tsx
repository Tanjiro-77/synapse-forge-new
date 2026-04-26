import { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Brain, Loader2, Mail, Lock, User, Eye, EyeOff,
  Flame, Zap, Target, ArrowRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── validation ──────────────────────────────────────────────── */
const emailSchema = z.string().trim().email("Invalid email address").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);
const nameSchema = z.string().trim().min(1, "Name is required").max(60);

/* ─── feature highlights ──────────────────────────────────────── */
const features = [
  { icon: Flame, label: "Daily Streaks", desc: "Stay consistent every day" },
  { icon: Zap, label: "XP & Levels", desc: "Gamified progress tracking" },
  { icon: Target, label: "Smart Goals", desc: "AI-powered study planning" },
];

/* ─── Google SVG ──────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.1z" />
    <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5l-6-5.1c-2 1.4-4.4 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6 5.1c-.4.4 6.4-4.7 6.4-14.1 0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

/* ─── field wrapper ───────────────────────────────────────────── */
interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  error?: string;
}

const Field = ({
  id, label, type = "text", value, onChange, icon: Icon,
  placeholder, required, minLength, autoComplete, error,
}: FieldProps) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground/80">
        {label}
      </Label>
      <div className="relative group">
        <Icon className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
          "text-muted-foreground/50 transition-colors duration-200",
          "group-focus-within:text-primary",
        )} />
        <Input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={cn(
            "pl-9 h-11 rounded-xl",
            "bg-background/60 border-border/60",
            "transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60",
            "placeholder:text-muted-foreground/40",
            isPassword && "pr-10",
            error && "border-destructive/60 focus-visible:ring-destructive/20",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "text-muted-foreground/40 hover:text-muted-foreground",
              "transition-colors duration-200",
              "focus:outline-none",
            )}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-destructive font-medium animate-in fade-in-0 slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

/* ─── divider ─────────────────────────────────────────────────── */
const OrDivider = () => (
  <div className="relative my-5">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-border/50" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-card px-3 text-[11px] uppercase tracking-widest font-medium text-muted-foreground/60">
        or
      </span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Auth Page
═══════════════════════════════════════════════════════════════ */
const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const uid = useId();

  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (!loading && user) nav("/", { replace: true }); }, [user, loading, nav]);
  useEffect(() => { document.title = "Sign in · Synapse Forge"; }, []);
  // reset errors when switching tabs
  useEffect(() => { setErrors({}); }, [tab]);

  /* ── validation helper ── */
  const validate = (schema: z.ZodTypeAny, value: unknown, field: string): boolean => {
    const r = schema.safeParse(value);
    if (!r.success) {
      const msg = r.error.errors[0]?.message ?? "Invalid";
      setErrors((e) => ({ ...e, [field]: msg }));
      toast.error(msg);
      return false;
    }
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    return true;
  };

  /* ── sign in ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = validate(emailSchema, email, "email") &&
      validate(passwordSchema, password, "password");
    if (!ok) return;

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      setErrors({ password: error.message });
    } else {
      toast.success("Welcome back! 🎉");
      nav("/");
    }
  };

  /* ── sign up ── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = validate(nameSchema, name, "name") &&
      validate(emailSchema, email, "email") &&
      validate(passwordSchema, password, "password");
    if (!ok) return;

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Welcome to Synapse Forge 🚀");
      nav("/");
    }
  };

  /* ── google ── */
  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if ("error" in result && result.error) toast.error(result.error.message);
    else if (!("redirected" in result && result.redirected)) nav("/");
  };

  /* ─────────────────────────────────────────────── render ── */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">

      {/* ── ambient bg blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* ── Brand header ── */}
        <div className="flex flex-col items-center mb-8 text-center">
          {/* logo */}
          <div className="relative mb-5">
            <div className={cn(
              "w-16 h-16 rounded-2xl",
              "bg-gradient-to-br from-primary to-violet-600",
              "flex items-center justify-center",
              "shadow-2xl shadow-primary/30",
            )}>
              <Brain className="w-8 h-8 text-white" />
            </div>
            {/* glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl -z-10 scale-110" />
            {/* sparkle */}
            <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-400" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Synapse{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Forge
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-[220px]">
            Track. Analyze. Improve. Repeat.
          </p>

          {/* feature pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
            {features.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold",
                  "px-2 py-0.5 rounded-full",
                  "bg-muted/60 border border-border/50 text-muted-foreground",
                )}
              >
                <Icon className="w-2.5 h-2.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Card ── */}
        <div className={cn(
          "rounded-2xl border border-border/50 p-6",
          "bg-card/80 backdrop-blur-xl",
          "shadow-2xl shadow-black/10",
        )}>

          {/* Google button — above tabs for prominence */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-11 rounded-xl gap-2.5 font-medium",
              "border-border/60 bg-background/60",
              "hover:bg-accent hover:border-border transition-all duration-200",
            )}
            onClick={handleGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <OrDivider />

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl bg-muted/50 mb-5 p-1">
              <TabsTrigger value="signin" className="rounded-lg text-sm font-medium">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm font-medium">
                Create account
              </TabsTrigger>
            </TabsList>

            {/* ── Sign In ── */}
            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field
                  id={`${uid}-si-email`}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  icon={Mail}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  error={errors.email}
                />
                <Field
                  id={`${uid}-si-password`}
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  icon={Lock}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  error={errors.password}
                />

                {/* forgot password */}
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className={cn(
                    "w-full h-11 rounded-xl gap-2 font-semibold",
                    "bg-gradient-to-r from-primary to-violet-600",
                    "hover:from-primary/90 hover:to-violet-600/90",
                    "shadow-lg shadow-primary/25 hover:shadow-primary/40",
                    "transition-all duration-200",
                  )}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ── Sign Up ── */}
            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field
                  id={`${uid}-su-name`}
                  label="Display name"
                  value={name}
                  onChange={setName}
                  icon={User}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  error={errors.name}
                />
                <Field
                  id={`${uid}-su-email`}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  icon={Mail}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  error={errors.email}
                />
                <Field
                  id={`${uid}-su-password`}
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  icon={Lock}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  error={errors.password}
                />

                <Button
                  type="submit"
                  className={cn(
                    "w-full h-11 rounded-xl gap-2 font-semibold",
                    "bg-gradient-to-r from-primary to-violet-600",
                    "hover:from-primary/90 hover:to-violet-600/90",
                    "shadow-lg shadow-primary/25 hover:shadow-primary/40",
                    "transition-all duration-200",
                  )}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                  By continuing you agree to our{" "}
                  <button type="button" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Terms
                  </button>{" "}
                  &{" "}
                  <button type="button" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Privacy Policy
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* footer */}
        <p className="text-center text-[11px] text-muted-foreground/50 mt-5">
          © {new Date().getFullYear()} Synapse Forge · Built for students
        </p>
      </div>
    </div>
  );
};

export default Auth;