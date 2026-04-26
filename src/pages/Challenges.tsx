import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Swords,
  Plus,
  Trophy,
  Trash2,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Flame,
  Target,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isAfter,
  isBefore,
  addDays,
} from "date-fns";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — weekly refresh cycle
═══════════════════════════════════════════════════════════════ */

/**
 * Weekly preset pool — each week a deterministic subset is shown
 * using the ISO week number as seed. No new DB columns needed.
 */
const WEEKLY_PRESET_POOL = [
  {
    id: "consistency-7",
    title: "7-Day Consistency",
    description: "Study every day for a full week",
    goal_type: "study_hours",
    goal_value: 7,
    days: 7,
    reward_xp: 200,
    icon: Flame,
    difficulty: "medium" as Difficulty,
  },
  {
    id: "deep-sprint",
    title: "Deep Sprint",
    description: "10 hours of focused study in 3 days",
    goal_type: "study_hours",
    goal_value: 10,
    days: 3,
    reward_xp: 300,
    icon: Zap,
    difficulty: "hard" as Difficulty,
  },
  {
    id: "marathon-week",
    title: "Marathon Week",
    description: "20 hours of study in a single week",
    goal_type: "study_hours",
    goal_value: 20,
    days: 7,
    reward_xp: 500,
    icon: Trophy,
    difficulty: "hard" as Difficulty,
  },
  {
    id: "steady-pace",
    title: "Steady Pace",
    description: "5 hours spread across 5 days",
    goal_type: "study_hours",
    goal_value: 5,
    days: 5,
    reward_xp: 150,
    icon: Target,
    difficulty: "easy" as Difficulty,
  },
  {
    id: "weekend-warrior",
    title: "Weekend Warrior",
    description: "6 hours of study in 2 days",
    goal_type: "study_hours",
    goal_value: 6,
    days: 2,
    reward_xp: 180,
    icon: Swords,
    difficulty: "medium" as Difficulty,
  },
  {
    id: "power-hour",
    title: "Power Hour ×3",
    description: "3 focused 1-hour sessions in one day",
    goal_type: "study_hours",
    goal_value: 3,
    days: 1,
    reward_xp: 100,
    icon: Flame,
    difficulty: "easy" as Difficulty,
  },
] as const;

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  medium: {
    label: "Medium",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  hard: {
    label: "Hard",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
} as const;

type Difficulty = keyof typeof DIFFICULTY_CONFIG;
type WeeklyPreset = typeof WEEKLY_PRESET_POOL[number];

const MAX_TITLE_LENGTH = 120;
const PRESETS_PER_WEEK = 3;

/* ═══════════════════════════════════════════════════════════════
   Weekly preset rotation — deterministic, no DB needed
═══════════════════════════════════════════════════════════════ */

/** ISO week number (1-53) */
const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/** Pick 3 presets for the current week using week number as seed */
const getWeeklyPresets = (date: Date): WeeklyPreset[] => {
  const week = getISOWeekNumber(date);
  const pool = [...WEEKLY_PRESET_POOL];
  // Rotate pool based on week number
  const offset = week % pool.length;
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  return rotated.slice(0, PRESETS_PER_WEEK);
};

/** Next Monday (start of next week) */
const getNextWeekRefreshDate = (): Date =>
  startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  goal_value: number;
  progress: number;
  end_date: string;
  reward_xp: number;
  completed: boolean;
  created_at: string;
}

interface CustomChallengeForm {
  title: string;
  goalValue: string;
  days: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useChallenges = (userId: string | undefined) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChallenges(data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { challenges, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const ChallengeSkeleton = () => (
  <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="flex justify-between mb-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
    <Skeleton className="h-2 w-full mt-4 mb-3" />
    <div className="flex justify-between">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  </Card>
);

/* ── Weekly refresh countdown ── */
const WeeklyRefreshBanner = () => {
  const nextRefresh = getNextWeekRefreshDate();
  const daysUntil = differenceInDays(nextRefresh, new Date());

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <RefreshCw className="w-3 h-3" />
      <span>
        Weekly challenges refresh in{" "}
        <span className="font-semibold text-foreground">
          {daysUntil === 0 ? "tomorrow" : `${daysUntil}d`}
        </span>{" "}
        · Next: {format(nextRefresh, "MMM d")}
      </span>
    </div>
  );
};

/* ── Preset challenge card ── */
interface PresetCardProps {
  preset: WeeklyPreset;
  alreadyAccepted: boolean;
  onAccept: (preset: WeeklyPreset) => void;
  disabled: boolean;
}

const PresetCard = ({ preset, alreadyAccepted, onAccept, disabled }: PresetCardProps) => {
  const Icon = preset.icon;
  const diffConfig = DIFFICULTY_CONFIG[preset.difficulty];

  return (
    <Card
      className={cn(
        "p-5 border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-lg transition-all duration-200 group",
        alreadyAccepted && "opacity-60 pointer-events-none border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-bold text-sm">{preset.title}</h3>
            {alreadyAccepted && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {preset.description}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge
          variant="outline"
          className={cn("h-5 text-[10px] font-semibold", diffConfig.bgColor, diffConfig.color, "border-0")}
        >
          {diffConfig.label}
        </Badge>
        <Badge variant="outline" className="h-5 text-[10px] gap-1">
          <Clock className="w-2.5 h-2.5" />
          {preset.days} {preset.days === 1 ? "day" : "days"}
        </Badge>
        <Badge variant="outline" className="h-5 text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
          <Zap className="w-2.5 h-2.5" />
          +{preset.reward_xp} XP
        </Badge>
      </div>

      <Button
        size="sm"
        className="w-full rounded-lg gap-1.5"
        onClick={() => onAccept(preset)}
        disabled={disabled || alreadyAccepted}
      >
        {alreadyAccepted ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accepted
          </>
        ) : (
          <>
            <Swords className="w-3.5 h-3.5" />
            Accept Challenge
          </>
        )}
      </Button>
    </Card>
  );
};

/* ── Active challenge card ── */
interface ChallengeCardProps {
  challenge: Challenge;
  onClaim: (challenge: Challenge) => void;
  onDelete: (challenge: Challenge) => void;
}

const ChallengeCard = ({ challenge, onClaim, onDelete }: ChallengeCardProps) => {
  const progress = Number(challenge.progress);
  const goalValue = Number(challenge.goal_value);
  const pct = Math.min(100, Math.round((progress / goalValue) * 100));
  const daysLeft = differenceInDays(parseISO(challenge.end_date), new Date());
  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 2;

  return (
    <Card
      className={cn(
        "p-5 group border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-md transition-all duration-200",
        challenge.completed && "border-emerald-500/30 bg-emerald-500/5",
        isExpired && !challenge.completed && "border-red-500/30 bg-red-500/5 opacity-80",
        isUrgent && !challenge.completed && !isExpired && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-bold text-sm">{challenge.title}</h3>
            {challenge.completed && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          {challenge.description && (
            <p className="text-xs text-muted-foreground">{challenge.description}</p>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive shrink-0 transition-all"
          onClick={() => onDelete(challenge)}
          aria-label={`Delete ${challenge.title}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="mt-4 mb-2 space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {progress.toFixed(1)}h / {goalValue}h
          </span>
          <span
            className={cn(
              "font-medium tabular-nums",
              isExpired && "text-red-500",
              isUrgent && !isExpired && "text-amber-500 font-semibold",
            )}
          >
            {isExpired
              ? "Expired"
              : daysLeft === 0
                ? "Last day!"
                : `${daysLeft}d left`}
          </span>
        </div>
        <Progress
          value={pct}
          className={cn(
            "h-2 [&>div]:transition-all [&>div]:duration-500",
            challenge.completed
              ? "[&>div]:bg-emerald-500"
              : "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500",
          )}
        />
        <div className="text-xs text-muted-foreground text-right tabular-nums">
          {pct}% complete
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3">
        <Badge
          variant="outline"
          className="h-6 text-xs gap-1 bg-primary/10 text-primary border-primary/20"
        >
          <Zap className="w-3 h-3" />
          +{challenge.reward_xp} XP
        </Badge>

        <div className="flex items-center gap-2">
          {isExpired && !challenge.completed && (
            <span className="text-xs text-red-500 font-medium">Failed</span>
          )}
          {challenge.completed && (
            <Button
              size="sm"
              className="h-8 rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onClaim(challenge)}
            >
              <Trophy className="w-3.5 h-3.5" />
              Claim XP
            </Button>
          )}
        </div>
      </div>

      {/* End date */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        Ends {format(parseISO(challenge.end_date), "MMM d, yyyy")}
      </div>
    </Card>
  );
};

/* ── Custom challenge dialog ── */
interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (form: CustomChallengeForm) => Promise<void>;
}

const CustomChallengeDialog = ({ open, onOpenChange, onCreate }: CustomDialogProps) => {
  const [form, setForm] = useState<CustomChallengeForm>({
    title: "",
    goalValue: "5",
    days: "7",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (Number(form.goalValue) < 1) {
      toast.error("Goal must be at least 1 hour");
      return;
    }
    if (Number(form.days) < 1) {
      toast.error("Duration must be at least 1 day");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(form);
      setForm({ title: "", goalValue: "5", days: "7" });
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
          Custom Challenge
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Challenge</DialogTitle>
          <DialogDescription>
            Set your own challenge goal and duration to earn XP.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="ch-title" className="text-sm font-medium">
              Challenge title
            </Label>
            <Input
              id="ch-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Math Marathon"
              maxLength={MAX_TITLE_LENGTH}
              required
              autoFocus
              className="rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              {form.title.length}/{MAX_TITLE_LENGTH}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ch-goal" className="text-sm font-medium">
                Hours goal
              </Label>
              <Input
                id="ch-goal"
                type="number"
                min={1}
                max={500}
                value={form.goalValue}
                onChange={(e) => setForm({ ...form, goalValue: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-days" className="text-sm font-medium">
                Duration (days)
              </Label>
              <Input
                id="ch-days"
                type="number"
                min={1}
                max={30}
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
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
            <Button type="submit" disabled={submitting} className="rounded-xl gap-2">
              {submitting ? "Creating..." : (
                <>
                  <Swords className="w-4 h-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  challenge: Challenge | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ challenge, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!challenge} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Abandon Challenge?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Are you sure you want to abandon{" "}
          <strong>"{challenge?.title}"</strong>? Your progress will be lost.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel} className="rounded-xl">
          Keep Going
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="rounded-xl bg-destructive hover:bg-destructive/90"
        >
          Abandon
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/* ── Empty active challenges ── */
const EmptyActive = () => (
  <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
      <Swords className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-2">No active challenges</h3>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
      Pick a weekly challenge above or create a custom one to start earning XP.
    </p>
  </Card>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Challenges = () => {
  const { user } = useAuth();
  const { challenges, loading, reload } = useChallenges(user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Challenge | null>(null);

  useEffect(() => {
    document.title = "Challenges · Synapse Forge";
  }, []);

  /* ── Weekly presets (deterministic rotation) ── */
  const weeklyPresets = useMemo(() => getWeeklyPresets(new Date()), []);

  /* ── IDs of already accepted presets this cycle ── */
  const acceptedPresetTitles = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return new Set(
      challenges
        .filter((c) => {
          const created = new Date(c.created_at);
          return isAfter(created, weekStart);
        })
        .map((c) => c.title),
    );
  }, [challenges]);

  /* ── Create challenge from preset ── */
  const handleAcceptPreset = async (preset: WeeklyPreset) => {
    if (!user) return;

    const endDate = addDays(new Date(), preset.days);

    const { error } = await supabase.from("challenges").insert({
      user_id: user.id,
      title: preset.title,
      description: preset.description,
      goal_type: preset.goal_type,
      goal_value: preset.goal_value,
      end_date: format(endDate, "yyyy-MM-dd"),
      reward_xp: preset.reward_xp,
    });

    if (error) {
      toast.error(error.message ?? "Failed to accept challenge");
    } else {
      toast.success(`⚔️ "${preset.title}" accepted! Good luck!`);
      reload();
    }
  };

  /* ── Create custom challenge ── */
  const handleCreateCustom = async (form: CustomChallengeForm) => {
    if (!user) return;

    const endDate = addDays(new Date(), Number(form.days));

    const { error } = await supabase.from("challenges").insert({
      user_id: user.id,
      title: form.title.trim(),
      description: `Study ${form.goalValue}h in ${form.days} days`,
      goal_type: "study_hours",
      goal_value: Number(form.goalValue),
      end_date: format(endDate, "yyyy-MM-dd"),
      reward_xp: Math.round(Number(form.goalValue) * 10 + Number(form.days) * 5),
    });

    if (error) {
      toast.error(error.message ?? "Failed to create challenge");
      throw error;
    }

    toast.success("⚔️ Custom challenge created!");
    reload();
  };

  /* ── Claim completed challenge XP ── */
  const handleClaim = async (challenge: Challenge) => {
    if (!user) return;

    try {
      // Delete challenge
      await supabase.from("challenges").delete().eq("id", challenge.id);

      // Award XP using existing profiles schema
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .maybeSingle();

      await supabase
        .from("profiles")
        .update({ xp: (profile?.xp ?? 0) + challenge.reward_xp })
        .eq("id", user.id);

      toast.success(`🏆 +${challenge.reward_xp} XP claimed! Outstanding work!`);
      reload();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to claim XP");
    }
  };

  /* ── Delete challenge ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("challenges").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete challenge");
    } else {
      toast.success("Challenge abandoned");
      reload();
    }

    setToDelete(null);
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = challenges.length;
    const completed = challenges.filter((c) => c.completed).length;
    const active = challenges.filter(
      (c) => !c.completed && differenceInDays(parseISO(c.end_date), new Date()) >= 0,
    ).length;
    return { total, completed, active };
  }, [challenges]);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Swords className="w-7 h-7 text-primary" />
            Challenges
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Push your limits. Earn massive XP. Refresh every Monday.
          </p>
        </div>

        <CustomChallengeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={handleCreateCustom}
        />
      </div>

      {/* Stats bar */}
      {!loading && challenges.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm text-center">
            <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className="p-3 border-blue-500/20 bg-blue-500/5 backdrop-blur-sm text-center">
            <div className="text-2xl font-bold tabular-nums text-blue-600">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </Card>
          <Card className="p-3 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm text-center">
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </Card>
        </div>
      )}

      {/* Weekly presets section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            This Week's Challenges
          </h2>
          <WeeklyRefreshBanner />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {weeklyPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              alreadyAccepted={acceptedPresetTitles.has(preset.title)}
              onAccept={handleAcceptPreset}
              disabled={loading}
            />
          ))}
        </div>
      </div>

      {/* Active challenges */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          Your Active Challenges
          {!loading && challenges.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 text-xs">
              {challenges.length}
            </Badge>
          )}
        </h2>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ChallengeSkeleton key={i} />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <EmptyActive />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onClaim={handleClaim}
                onDelete={setToDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <DeleteDialog
        challenge={toDelete}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default Challenges;