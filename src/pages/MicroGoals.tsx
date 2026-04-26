import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Atom,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — no hardcoded values in DB logic
═══════════════════════════════════════════════════════════════ */
const QUICK_PRESETS = [
  { title: "Solve 5 questions", target: 5, icon: Target },
  { title: "Revise 2 pages", target: 2, icon: Sparkles },
  { title: "Watch 1 lecture", target: 1, icon: TrendingUp },
  { title: "Make 3 flashcards", target: 3, icon: Atom },
] as const;

const MAX_TITLE_LENGTH = 120;
const MAX_TARGET = 100;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface MicroGoal {
  id: string;
  title: string;
  target_count: number;
  completed_count: number;
  goal_date: string;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useMicroGoals = (userId: string | undefined, date: string) => {
  const [goals, setGoals] = useState<MicroGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("micro_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("goal_date", date)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setGoals(data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load micro-goals");
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return { goals, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const GoalSkeleton = () => (
  <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <Skeleton className="flex-1 h-10 rounded-lg" />
      <Skeleton className="w-9 h-9 rounded-lg" />
      <Skeleton className="w-14 h-9 rounded-lg" />
      <Skeleton className="w-9 h-9 rounded-lg" />
      <Skeleton className="w-9 h-9 rounded-lg" />
    </div>
  </Card>
);

/* ── Empty state ── */
const EmptyState = () => (
  <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
      <Atom className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-2">No micro-goals today</h3>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
      Add quick wins above to build momentum and stay focused.
    </p>
  </Card>
);

/* ── Stats summary ── */
interface StatsSummaryProps {
  completed: number;
  total: number;
}

const StatsSummary = ({ completed, total }: StatsSummaryProps) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm text-muted-foreground">
          Today's progress:{" "}
          <span
            className={cn(
              "font-bold tabular-nums",
              pct === 100 ? "text-emerald-600" : "text-foreground",
            )}
          >
            {completed}/{total}
          </span>
        </span>
      </div>

      {pct === 100 && total > 0 && (
        <Badge className="h-5 gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          All done!
        </Badge>
      )}
    </div>
  );
};

/* ── Quick preset button ── */
interface PresetButtonProps {
  preset: typeof QUICK_PRESETS[number];
  onAdd: (title: string, target: number) => void;
  disabled: boolean;
}

const PresetButton = ({ preset, onAdd, disabled }: PresetButtonProps) => {
  const Icon = preset.icon;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onAdd(preset.title, preset.target)}
      disabled={disabled}
      className="gap-1.5 rounded-lg h-8 text-xs"
    >
      <Icon className="w-3 h-3" />
      {preset.title}
    </Button>
  );
};

/* ── Micro-goal card ── */
interface GoalCardProps {
  goal: MicroGoal;
  onUpdate: (id: string, delta: number) => void;
  onDelete: (goal: MicroGoal) => void;
}

const GoalCard = ({ goal, onUpdate, onDelete }: GoalCardProps) => {
  const progress = (goal.completed_count / goal.target_count) * 100;
  const isDone = goal.completed_count >= goal.target_count;
  const canDecrement = goal.completed_count > 0;
  const canIncrement = goal.completed_count < goal.target_count;

  return (
    <Card
      className={cn(
        "p-4 border-border/50 bg-card/60 backdrop-blur-sm group",
        "hover:border-border hover:shadow-md transition-all duration-200",
        isDone && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Progress + Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={cn(
                "font-semibold text-sm truncate",
                isDone && "text-muted-foreground",
              )}
            >
              {goal.title}
            </span>
            {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          </div>
          <Progress
            value={progress}
            className={cn(
              "h-1.5 [&>div]:transition-all [&>div]:duration-500",
              isDone
                ? "[&>div]:bg-emerald-500"
                : "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500",
            )}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Decrement */}
          <Button
            variant="outline"
            size="icon"
            className="w-9 h-9 rounded-lg"
            onClick={() => onUpdate(goal.id, -1)}
            disabled={!canDecrement}
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>

          {/* Count display */}
          <span
            className={cn(
              "font-bold tabular-nums w-14 text-center text-sm",
              isDone ? "text-emerald-600" : "text-foreground",
            )}
          >
            {goal.completed_count}/{goal.target_count}
          </span>

          {/* Increment */}
          <Button
            size="icon"
            className="w-9 h-9 rounded-lg"
            onClick={() => onUpdate(goal.id, 1)}
            disabled={!canIncrement}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-9 h-9 rounded-lg",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-destructive/10 hover:text-destructive",
            )}
            onClick={() => onDelete(goal)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Percentage indicator */}
      <div className="flex justify-end mt-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {Math.round(progress)}% complete
        </span>
      </div>
    </Card>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  goal: MicroGoal | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ goal, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!goal} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Delete Micro-Goal?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Remove <strong>"{goal?.title}"</strong> from today? This action cannot be undone.
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
const MicroGoals = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const { goals, loading, reload } = useMicroGoals(user?.id, today);

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("5");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<MicroGoal | null>(null);

  useEffect(() => {
    document.title = "Micro-Goals · Synapse Forge";
  }, []);

  /* ── Add micro-goal ── */
  const handleAdd = async (customTitle?: string, customTarget?: number) => {
    if (!user) return;

    const finalTitle = (customTitle ?? title).trim();
    const finalTarget = customTarget ?? Number(target);

    if (!finalTitle) {
      toast.error("Title is required");
      return;
    }
    if (finalTarget < 1 || finalTarget > MAX_TARGET) {
      toast.error(`Target must be between 1 and ${MAX_TARGET}`);
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.from("micro_goals").insert({
        user_id: user.id,
        title: finalTitle,
        target_count: finalTarget,
        goal_date: today,
      });

      if (error) throw error;

      toast.success("Micro-goal added!");
      setTitle("");
      setTarget("5");
      reload();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to add micro-goal");
    } finally {
      setAdding(false);
    }
  };

  /* ── Update progress ── */
  const handleUpdate = async (id: string, delta: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const next = Math.max(0, Math.min(goal.target_count, goal.completed_count + delta));

    const { error } = await supabase
      .from("micro_goals")
      .update({ completed_count: next })
      .eq("id", id);

    if (error) {
      toast.error(error.message ?? "Failed to update progress");
      return;
    }

    // Celebrate on completion
    if (next === goal.target_count && goal.completed_count < goal.target_count) {
      toast.success("🎉 Micro-goal smashed!");
    }

    reload();
  };

  /* ── Delete goal ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("micro_goals").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete micro-goal");
    } else {
      toast.success("Micro-goal removed");
      reload();
    }

    setToDelete(null);
  };

  /* ── Stats ── */
  const completedCount = useMemo(
    () => goals.filter((g) => g.completed_count >= g.target_count).length,
    [goals],
  );

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Atom className="w-7 h-7 text-primary" />
            Micro-Goals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tiny atomic wins. Build unstoppable momentum.
          </p>
        </div>

        {/* Today's date badge */}
        <Badge variant="outline" className="h-7 gap-1.5 text-xs">
          <Calendar className="w-3 h-3" />
          {format(new Date(), "MMM d")}
        </Badge>
      </div>

      {/* Stats */}
      {!loading && goals.length > 0 && (
        <StatsSummary completed={completedCount} total={goals.length} />
      )}

      {/* Add form */}
      <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
          Add Custom Micro-Goal
        </Label>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Solve 10 trig problems"
            maxLength={MAX_TITLE_LENGTH}
            disabled={adding}
            className="flex-1 rounded-xl h-10"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            type="number"
            min={1}
            max={MAX_TARGET}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={adding}
            className="w-20 rounded-xl h-10"
          />
          <Button
            onClick={() => handleAdd()}
            disabled={adding || !title.trim()}
            className="rounded-xl h-10 gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          {title.length}/{MAX_TITLE_LENGTH} characters
        </div>

        {/* Quick presets */}
        <div className="mt-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Quick Presets
          </Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => (
              <PresetButton
                key={preset.title}
                preset={preset}
                onAdd={handleAdd}
                disabled={adding}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Goals list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <GoalSkeleton key={i} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={handleUpdate}
              onDelete={setToDelete}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        goal={toDelete}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default MicroGoals;