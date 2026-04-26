import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Trash2,
  Target,
  Minus,
  CheckCircle2,
  TrendingUp,
  Flame,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — Driven by existing DB enum values
═══════════════════════════════════════════════════════════════ */
const PERIOD_CONFIG = {
  daily: { label: "Daily", color: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  weekly: { label: "Weekly", color: "text-violet-600", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  monthly: { label: "Monthly", color: "text-emerald-600", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
} as const;

const METRIC_CONFIG = {
  study_hours: { label: "Study Hours", unit: "hrs", icon: Flame },
  chapters: { label: "Chapters", unit: "ch", icon: Target },
  questions: { label: "Practice Questions", unit: "qs", icon: TrendingUp },
} as const;

type Period = keyof typeof PERIOD_CONFIG;
type Metric = keyof typeof METRIC_CONFIG;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Goal {
  id: string;
  period: Period;
  metric: Metric;
  target: number;
  progress: number;
  created_at: string;
}

interface GoalFormData {
  period: Period;
  metric: Metric;
  target: number;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useGoals = (userId: string | undefined) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { goals, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const GoalCardSkeleton = () => (
  <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-10 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  </Card>
);

/* ── Empty state ── */
const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
      <Target className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-2">No goals yet</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
      Set ambitious targets and log your progress daily. Small wins compound into big results.
    </p>
    <Button onClick={onAdd} className="gap-2 rounded-xl">
      <Plus className="w-4 h-4" />
      Set first goal
    </Button>
  </Card>
);

/* ── Stats summary ── */
interface StatsSummaryProps {
  total: number;
  achieved: number;
  inProgress: number;
}

const StatsSummary = ({ total, achieved, inProgress }: StatsSummaryProps) => (
  <div className="grid grid-cols-3 gap-3">
    <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Target className="w-3 h-3" />
        Total
      </div>
      <div className="text-2xl font-bold tabular-nums">{total}</div>
    </Card>

    <Card className="p-3 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-emerald-600 mb-1">
        <CheckCircle2 className="w-3 h-3" />
        Achieved
      </div>
      <div className="text-2xl font-bold tabular-nums text-emerald-600">{achieved}</div>
    </Card>

    <Card className="p-3 border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
        <TrendingUp className="w-3 h-3" />
        In Progress
      </div>
      <div className="text-2xl font-bold tabular-nums text-blue-600">{inProgress}</div>
    </Card>
  </div>
);

/* ── Goal card ── */
interface GoalCardProps {
  goal: Goal;
  onAdjust: (goal: Goal, delta: number) => void;
  onDelete: (goal: Goal) => void;
}

const GoalCard = ({ goal, onAdjust, onDelete }: GoalCardProps) => {
  const progress = Number(goal.progress);
  const target = Number(goal.target);
  const pct = Math.min(100, Math.round((progress / target) * 100));
  const achieved = progress >= target;

  const periodConfig = PERIOD_CONFIG[goal.period];
  const metricConfig = METRIC_CONFIG[goal.metric];
  const MetricIcon = metricConfig.icon;

  const getProgressColor = () => {
    if (achieved) return "text-emerald-600";
    if (pct >= 70) return "text-blue-600";
    if (pct >= 40) return "text-amber-600";
    return "text-foreground";
  };

  return (
    <Card
      className={cn(
        "p-5 group border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-lg transition-all duration-200",
        achieved && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", periodConfig.bgColor)}>
            <MetricIcon className={cn("w-4 h-4", periodConfig.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("h-5 text-[10px] font-semibold uppercase tracking-wider border-0", periodConfig.bgColor, periodConfig.color)}
              >
                {periodConfig.label}
              </Badge>
              {achieved && (
                <Badge
                  variant="outline"
                  className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"
                >
                  <Trophy className="w-2.5 h-2.5" />
                  Done!
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm mt-0.5">{metricConfig.label}</h3>
          </div>
        </div>

        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive shrink-0"
          onClick={() => onDelete(goal)}
          aria-label={`Delete ${metricConfig.label} goal`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Progress count */}
      <div className="flex items-end gap-2 mt-2 mb-3">
        <div className={cn("text-4xl font-extrabold tabular-nums leading-none", getProgressColor())}>
          {progress}
        </div>
        <div className="text-base text-muted-foreground mb-0.5">
          / {target} {metricConfig.unit}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className={cn("font-semibold tabular-nums", getProgressColor())}>{pct}%</span>
        </div>
        <Progress
          value={pct}
          className={cn(
            "h-2 transition-all duration-500",
            achieved
              ? "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-green-500"
              : "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500",
          )}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdjust(goal, -1)}
          disabled={progress <= 0}
          className="rounded-lg shrink-0 w-10"
          aria-label="Decrease progress"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>

        <Button
          size="sm"
          className="flex-1 gap-1.5 rounded-lg"
          onClick={() => onAdjust(goal, 1)}
          disabled={achieved}
        >
          <Plus className="w-3.5 h-3.5" />
          Log progress
        </Button>
      </div>
    </Card>
  );
};

/* ── Create dialog ── */
interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: GoalFormData) => Promise<void>;
}

const CreateDialog = ({ open, onOpenChange, onCreate }: CreateDialogProps) => {
  const [form, setForm] = useState<GoalFormData>({
    period: "daily",
    metric: "study_hours",
    target: 2,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.target < 1) {
      toast.error("Target must be at least 1");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(form);
      setForm({ period: "daily", metric: "study_hours", target: 2 });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set a Goal</DialogTitle>
          <DialogDescription>
            Define a recurring target and log progress to stay accountable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="goal-period" className="text-sm font-medium">
              Period
            </Label>
            <Select
              value={form.period}
              onValueChange={(v: Period) => setForm({ ...form, period: v })}
            >
              <SelectTrigger id="goal-period" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className={config.color}>{config.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric */}
          <div className="space-y-2">
            <Label htmlFor="goal-metric" className="text-sm font-medium">
              What to track
            </Label>
            <Select
              value={form.metric}
              onValueChange={(v: Metric) => setForm({ ...form, metric: v })}
            >
              <SelectTrigger id="goal-metric" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label htmlFor="goal-target" className="text-sm font-medium">
              Target ({METRIC_CONFIG[form.metric].unit})
            </Label>
            <Input
              id="goal-target"
              type="number"
              min={1}
              max={1000}
              value={form.target}
              onChange={(e) => setForm({ ...form, target: Math.max(1, Number(e.target.value)) })}
              required
              className="rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              How many {METRIC_CONFIG[form.metric].label.toLowerCase()} per{" "}
              {PERIOD_CONFIG[form.period].label.toLowerCase()}?
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || form.target < 1}
              className="rounded-xl gap-2"
            >
              {submitting ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  goal: Goal | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ goal, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!goal} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Delete Goal?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Remove the{" "}
          <strong>
            {goal ? `${PERIOD_CONFIG[goal.period].label} ${METRIC_CONFIG[goal.metric].label}` : ""}
          </strong>{" "}
          goal? Your progress will be lost and this cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel} className="rounded-xl">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="rounded-xl bg-destructive hover:bg-destructive/90"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Goals = () => {
  const { user } = useAuth();
  const { goals, loading, reload } = useGoals(user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Goal | null>(null);

  useEffect(() => {
    document.title = "Goals · Synapse Forge";
  }, []);

  /* ── Create goal ── */
  const handleCreate = async (data: GoalFormData) => {
    if (!user) return;

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      period: data.period,
      metric: data.metric,
      target: data.target,
    });

    if (error) {
      toast.error(error.message ?? "Failed to create goal");
      throw error;
    }

    toast.success("Goal created!");
    reload();
  };

  /* ── Adjust progress ── */
  const handleAdjust = async (goal: Goal, delta: number) => {
    const next = Math.max(0, Number(goal.progress) + delta);

    const { error } = await supabase
      .from("goals")
      .update({ progress: next })
      .eq("id", goal.id);

    if (error) {
      toast.error(error.message ?? "Failed to update progress");
      return;
    }

    // Only fire achievement toast when newly crossing the threshold
    if (next >= Number(goal.target) && Number(goal.progress) < Number(goal.target)) {
      toast.success(
        `🎯 ${METRIC_CONFIG[goal.metric].label} goal achieved! Great work!`,
      );
    } else if (delta > 0) {
      toast.success("Progress logged");
    }

    reload();
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("goals").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete goal");
    } else {
      toast.success("Goal removed");
      reload();
    }

    setToDelete(null);
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = goals.length;
    const achieved = goals.filter((g) => Number(g.progress) >= Number(g.target)).length;
    const inProgress = goals.filter(
      (g) => Number(g.progress) > 0 && Number(g.progress) < Number(g.target),
    ).length;
    return { total, achieved, inProgress };
  }, [goals]);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-40" />
            ) : goals.length > 0 ? (
              <>
                {goals.length} {goals.length === 1 ? "goal" : "goals"} · {stats.achieved} achieved
              </>
            ) : (
              "Set ambitious targets, win daily"
            )}
          </p>
        </div>

        <CreateDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
      </div>

      {/* Stats */}
      {!loading && goals.length > 0 && <StatsSummary {...stats} />}

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GoalCardSkeleton key={i} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAdjust={handleAdjust}
              onDelete={setToDelete}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteDialog goal={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Goals;