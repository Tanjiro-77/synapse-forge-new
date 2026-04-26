import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Brain,
  Sparkles,
  Loader2,
  Zap,
  AlertTriangle,
  TrendingUp,
  Target,
  Calendar,
  Flame,
  Battery,
  BatteryMedium,
  BatteryFull,
  Eye,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Types — mapped 1-to-1 with existing Edge Function responses
═══════════════════════════════════════════════════════════════ */
interface Insight {
  title: string;
  detail: string;
  severity: "critical" | "warning" | "positive" | "info";
}

interface PriorityTask {
  task: string;
  reason: string;
  urgency: "high" | "medium" | "low";
}

interface BacklogItem {
  day: string;
  action: string;
}

interface CoachData {
  insights: Insight[];
  priority_tasks: PriorityTask[];
  strategy: string;
  weak_focus: string[];
  backlog_plan: BacklogItem[];
  brain_mode_plan: string;
}

interface MemoryPattern {
  id: string;
  category: string;
  pattern: string;
  confidence: number;
  evidence: string | null;
}

interface Prediction {
  prediction: string;
  reason: string;
  risk_level: "high" | "medium" | "low";
}

type EnergyLevel = "low" | "medium" | "high";

/* ═══════════════════════════════════════════════════════════════
   Constants — existing DB / Edge Function values
═══════════════════════════════════════════════════════════════ */
const ENERGY_OPTIONS = [
  { value: "low" as EnergyLevel, icon: Battery, label: "Low", emoji: "😴" },
  { value: "medium" as EnergyLevel, icon: BatteryMedium, label: "Medium", emoji: "🙂" },
  { value: "high" as EnergyLevel, icon: BatteryFull, label: "High", emoji: "🔥" },
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/5 text-red-600",
  warning: "border-amber-500/40 bg-amber-500/5 text-amber-600",
  positive: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
  info: "border-border bg-muted/20 text-foreground",
};

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  positive: Sparkles,
  info: Lightbulb,
};

const URGENCY_STYLES: Record<string, string> = {
  high: "bg-red-500 text-white border-0",
  medium: "bg-amber-500 text-white border-0",
  low: "bg-secondary text-secondary-foreground border-0",
};

const RISK_STYLES: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/5",
  medium: "border-amber-500/40 bg-amber-500/5",
  low: "border-emerald-500/40 bg-emerald-500/5",
};

const RISK_BADGE_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Section skeleton ── */
const SectionSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-20 w-full rounded-xl" />
    ))}
  </div>
);

/* ── Energy selector ── */
interface EnergyPickerProps {
  value: EnergyLevel;
  onChange: (level: EnergyLevel) => void;
  disabled?: boolean;
}

const EnergyPicker = ({ value, onChange, disabled }: EnergyPickerProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-sm text-primary-foreground/80 font-medium">Today's energy:</span>
    {ENERGY_OPTIONS.map((opt) => {
      const Icon = opt.icon;
      const isSelected = value === opt.value;
      return (
        <Button
          key={opt.value}
          size="sm"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          variant={isSelected ? "secondary" : "outline"}
          className={cn(
            "gap-1.5 rounded-lg h-9",
            !isSelected &&
            "bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20",
            isSelected && "font-semibold",
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {opt.label} {opt.emoji}
        </Button>
      );
    })}
  </div>
);

/* ── Action buttons ── */
interface ActionButtonsProps {
  loading: boolean;
  brainModeActive: boolean;
  memLoading: boolean;
  predLoading: boolean;
  onInsights: () => void;
  onBrainMode: () => void;
  onLearnPatterns: () => void;
  onPredict: () => void;
}

const ActionButtons = ({
  loading,
  brainModeActive,
  memLoading,
  predLoading,
  onInsights,
  onBrainMode,
  onLearnPatterns,
  onPredict,
}: ActionButtonsProps) => (
  <div className="flex flex-wrap gap-2.5">
    <Button
      variant="secondary"
      size="lg"
      onClick={onInsights}
      disabled={loading || memLoading || predLoading}
      className="gap-2 rounded-xl font-semibold"
    >
      {loading && !brainModeActive ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Zap className="w-4 h-4" />
      )}
      Smart Insights
    </Button>

    <Button
      variant="outline"
      size="lg"
      onClick={onBrainMode}
      disabled={loading || memLoading || predLoading}
      className="gap-2 rounded-xl bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20"
    >
      {loading && brainModeActive ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Flame className="w-4 h-4" />
      )}
      Brain Mode
    </Button>

    <Button
      variant="outline"
      size="lg"
      onClick={onLearnPatterns}
      disabled={loading || memLoading || predLoading}
      className="gap-2 rounded-xl bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20"
    >
      {memLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
      Learn Patterns
    </Button>

    <Button
      variant="outline"
      size="lg"
      onClick={onPredict}
      disabled={loading || memLoading || predLoading}
      className="gap-2 rounded-xl bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20"
    >
      {predLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShieldAlert className="w-4 h-4" />
      )}
      Predict Future
    </Button>
  </div>
);

/* ── Predictions section ── */
const PredictionsSection = ({ predictions }: { predictions: Prediction[] }) => (
  <Card className="p-5 border-amber-500/20 bg-amber-500/3 backdrop-blur-sm">
    <h2 className="font-semibold flex items-center gap-2 mb-4 text-amber-600">
      <ShieldAlert className="w-5 h-5" />
      Behavior Predictions
    </h2>
    <div className="grid md:grid-cols-2 gap-3">
      {predictions.map((p, i) => (
        <div
          key={i}
          className={cn("p-4 rounded-xl border transition-all duration-200", RISK_STYLES[p.risk_level] ?? RISK_STYLES.low)}
        >
          <Badge
            variant="outline"
            className={cn("h-5 text-[10px] mb-2", RISK_BADGE_STYLES[p.risk_level])}
          >
            {p.risk_level} risk
          </Badge>
          <div className="text-sm font-semibold leading-snug mb-1">{p.prediction}</div>
          <div className="text-xs text-muted-foreground italic">
            <span className="font-medium not-italic">Why: </span>
            {p.reason}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

/* ── Memory patterns section ── */
const MemorySection = ({ patterns }: { patterns: MemoryPattern[] }) => (
  <Card className="p-5 border-primary/20 bg-primary/3 backdrop-blur-sm">
    <h2 className="font-semibold flex items-center gap-2 mb-4 text-primary">
      <Eye className="w-5 h-5" />
      AI Memory · What I've Learned About You
    </h2>
    <div className="grid md:grid-cols-2 gap-3">
      {patterns.map((p) => (
        <div
          key={p.id}
          className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors"
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="h-5 text-[10px] capitalize">
              {p.category}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-5 text-[10px]",
                p.confidence >= 80
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : p.confidence >= 60
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {p.confidence}% confident
            </Badge>
          </div>
          <div className="text-sm font-medium leading-snug">{p.pattern}</div>
          {p.evidence && (
            <div className="text-xs text-muted-foreground mt-1.5 italic">
              📊 {p.evidence}
            </div>
          )}
        </div>
      ))}
    </div>
  </Card>
);

/* ── Strategy section ── */
const StrategySection = ({ strategy }: { strategy: string }) => (
  <Card className="p-6 border-primary/20 bg-card/60 backdrop-blur-sm">
    <h2 className="font-semibold flex items-center gap-2 mb-3 text-primary">
      <TrendingUp className="w-5 h-5" />
      Today's Strategy
    </h2>
    <p className="text-sm leading-relaxed text-foreground">{strategy}</p>
  </Card>
);

/* ── Priority tasks section ── */
const PrioritySection = ({ tasks }: { tasks: PriorityTask[] }) => (
  <Card className="p-6 border-border/50 bg-card/60 backdrop-blur-sm">
    <h2 className="font-semibold flex items-center gap-2 mb-4">
      <Target className="w-5 h-5 text-primary" />
      Smart Priority — with WHY
    </h2>
    <div className="space-y-3">
      {tasks.map((t, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/50 hover:border-border transition-colors"
        >
          {/* Rank number */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-600 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            {i + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{t.task}</span>
              <Badge variant="outline" className={cn("h-5 text-[10px]", URGENCY_STYLES[t.urgency])}>
                {t.urgency}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
              <span>
                <span className="font-semibold text-foreground">Why: </span>
                {t.reason}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

/* ── Insights grid ── */
const InsightsSection = ({ insights }: { insights: Insight[] }) => (
  <div className="grid md:grid-cols-2 gap-4">
    {insights.map((ins, i) => {
      const Icon = SEVERITY_ICONS[ins.severity] ?? AlertTriangle;
      return (
        <Card
          key={i}
          className={cn(
            "p-5 border transition-all duration-200",
            SEVERITY_STYLES[ins.severity] ?? SEVERITY_STYLES.info,
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 shrink-0" />
            <h3 className="font-semibold text-sm">{ins.title}</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90">{ins.detail}</p>
        </Card>
      );
    })}
  </div>
);

/* ── Weak focus + backlog ── */
const WeakAndBacklog = ({
  weakFocus,
  backlogPlan,
}: {
  weakFocus: string[];
  backlogPlan: BacklogItem[];
}) => (
  <div className="grid md:grid-cols-2 gap-4">
    <Card className="p-5 border-amber-500/20 bg-amber-500/3 backdrop-blur-sm">
      <h2 className="font-semibold flex items-center gap-2 mb-3 text-amber-600">
        <AlertTriangle className="w-4 h-4" />
        Weak Topic Focus
      </h2>
      {weakFocus.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weak areas detected. Great job! 🎉</p>
      ) : (
        <ul className="space-y-2">
          {weakFocus.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>

    <Card className="p-5 border-red-500/20 bg-red-500/3 backdrop-blur-sm">
      <h2 className="font-semibold flex items-center gap-2 mb-3 text-red-600">
        <Calendar className="w-4 h-4" />
        Backlog Crusher
      </h2>
      {backlogPlan.length === 0 ? (
        <p className="text-sm text-muted-foreground">No backlog! You're on track 🚀</p>
      ) : (
        <ul className="space-y-2">
          {backlogPlan.map((b, i) => (
            <li key={i} className="text-sm leading-relaxed">
              <span className="font-bold text-red-600">{b.day}: </span>
              {b.action}
            </li>
          ))}
        </ul>
      )}
    </Card>
  </div>
);

/* ── Brain mode plan ── */
const BrainModePlan = ({ plan }: { plan: string }) => (
  <Card className="p-6 bg-gradient-to-br from-primary via-primary/90 to-violet-600 text-primary-foreground border-0 shadow-xl shadow-primary/20">
    <h2 className="font-extrabold text-xl flex items-center gap-2 mb-3">
      <Flame className="w-6 h-6 animate-pulse" />
      Brain Mode — 7-Day Sprint
    </h2>
    <p className="leading-relaxed whitespace-pre-line text-primary-foreground/90 text-sm">
      {plan}
    </p>
  </Card>
);

/* ── Empty / intro state ── */
const EmptyState = () => (
  <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
      <Brain className="w-8 h-8 text-primary" />
    </div>
    <h3 className="font-semibold text-lg mb-2">Your AI Coach is ready</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
      Click any action above to generate personalised insights, learn your patterns, or predict your
      future behaviour based on your real data.
    </p>
  </Card>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Coach = () => {
  const { user } = useAuth();

  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [patterns, setPatterns] = useState<MemoryPattern[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [energy, setEnergy] = useState<EnergyLevel>("medium");

  const [loading, setLoading] = useState(false);
  const [brainModeActive, setBrainModeActive] = useState(false);
  const [memLoading, setMemLoading] = useState(false);
  const [predLoading, setPredLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    document.title = "AI Coach · Synapse Forge";
  }, []);

  /* ── Load cached data on mount ── */
  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      setInitialLoading(true);
      try {
        const [aiRes, mpRes, prRes, enRes] = await Promise.all([
          supabase
            .from("ai_insights")
            .select("payload")
            .eq("user_id", user.id)
            .eq("kind", "insights")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("memory_patterns")
            .select("*")
            .eq("user_id", user.id)
            .order("confidence", { ascending: false }),
          supabase
            .from("predictions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("energy_logs")
            .select("energy_level")
            .eq("user_id", user.id)
            .eq("log_date", today)
            .maybeSingle(),
        ]);

        if (aiRes.data?.payload) setCoachData(aiRes.data.payload as CoachData);
        setPatterns((mpRes.data as MemoryPattern[]) ?? []);
        setPredictions((prRes.data as Prediction[]) ?? []);
        if (enRes.data?.energy_level) setEnergy(enRes.data.energy_level as EnergyLevel);
      } catch (error: any) {
        toast.error(error.message ?? "Failed to load coach data");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [user?.id]);

  /* ── Set energy level ── */
  const handleSetEnergy = async (level: EnergyLevel) => {
    if (!user) return;

    setEnergy(level);
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("energy_logs").upsert(
      { user_id: user.id, energy_level: level, log_date: today },
      { onConflict: "user_id,log_date" },
    );

    if (error) {
      toast.error(error.message ?? "Failed to save energy level");
    } else {
      const opt = ENERGY_OPTIONS.find((o) => o.value === level);
      toast.success(`Energy set to ${opt?.label} ${opt?.emoji}`);
    }
  };

  /* ── Generate insights / brain mode ── */
  const handleGenerate = async (brainMode: boolean) => {
    setLoading(true);
    setBrainModeActive(brainMode);

    try {
      const { data: res, error } = await supabase.functions.invoke("ai-coach", {
        body: { kind: brainMode ? "brain_mode" : "insights", brain_mode: brainMode, energy },
      });

      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);

      setCoachData(res as CoachData);
      toast.success(brainMode ? "🧠 Brain Mode activated!" : "✨ Fresh insights generated!");
    } catch (error: any) {
      toast.error(error.message ?? "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  /* ── Learn patterns ── */
  const handleLearnPatterns = async () => {
    setMemLoading(true);

    try {
      const { data: res, error } = await supabase.functions.invoke("ai-memory", {
        body: { mode: "memory" },
      });

      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);

      setPatterns(((res as any).patterns ?? []) as MemoryPattern[]);
      toast.success("🧬 Memory patterns updated!");
    } catch (error: any) {
      toast.error(error.message ?? "Failed to learn patterns");
    } finally {
      setMemLoading(false);
    }
  };

  /* ── Predict future ── */
  const handlePredict = async () => {
    setPredLoading(true);

    try {
      const { data: res, error } = await supabase.functions.invoke("ai-memory", {
        body: { mode: "predict" },
      });

      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);

      setPredictions(((res as any).predictions ?? []) as Prediction[]);
      toast.success("🎯 Predictions ready!");
    } catch (error: any) {
      toast.error(error.message ?? "Failed to generate predictions");
    } finally {
      setPredLoading(false);
    }
  };

  const isAnyLoading = loading || memLoading || predLoading;
  const hasNoContent = !coachData && patterns.length === 0 && predictions.length === 0;

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-6 sm:p-8 shadow-xl shadow-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.15),transparent_60%)]" />

        <div className="relative">
          {/* Tag line */}
          <div className="flex items-center gap-2 text-white/70 text-xs mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by AI · Memory · Prediction</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
            <Brain className="w-8 h-8 shrink-0" />
            Your AI Study Coach
          </h1>

          <p className="text-white/80 text-sm max-w-2xl mb-5 leading-relaxed">
            Personal mentor who understands your learning patterns. Long-term insights, future
            predictions, and energy-based plans — all from your real data.
          </p>

          {/* Energy picker */}
          <EnergyPicker
            value={energy}
            onChange={handleSetEnergy}
            disabled={isAnyLoading}
          />

          {/* Action buttons */}
          <div className="mt-4">
            <ActionButtons
              loading={loading}
              brainModeActive={brainModeActive}
              memLoading={memLoading}
              predLoading={predLoading}
              onInsights={() => handleGenerate(false)}
              onBrainMode={() => handleGenerate(true)}
              onLearnPatterns={handleLearnPatterns}
              onPredict={handlePredict}
            />
          </div>
        </div>
      </div>

      {/* ── Loading initial data ── */}
      {initialLoading && <SectionSkeleton rows={3} />}

      {/* ── Empty state ── */}
      {!initialLoading && hasNoContent && !loading && <EmptyState />}

      {/* ── Predictions ── */}
      {predictions.length > 0 && <PredictionsSection predictions={predictions} />}

      {/* ── Memory patterns ── */}
      {patterns.length > 0 && <MemorySection patterns={patterns} />}

      {/* ── Coach data sections ── */}
      {coachData && (
        <>
          <StrategySection strategy={coachData.strategy} />
          <PrioritySection tasks={coachData.priority_tasks} />
          <InsightsSection insights={coachData.insights} />
          <WeakAndBacklog weakFocus={coachData.weak_focus} backlogPlan={coachData.backlog_plan} />
          {coachData.brain_mode_plan && <BrainModePlan plan={coachData.brain_mode_plan} />}
        </>
      )}
    </div>
  );
};

export default Coach;