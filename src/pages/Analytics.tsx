import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Target,
  Zap,
  Minus,
} from "lucide-react";
import {
  format,
  parseISO,
  subDays,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  TooltipProps,
} from "recharts";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — no hardcoded values, all driven by data
═══════════════════════════════════════════════════════════════ */
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(262.1 83.3% 57.8%)",
  "hsl(var(--secondary))",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(var(--destructive))",
];

const CHART_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
} as const;

const AXIS_STYLE = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const;

const GRID_COLOR = "hsl(var(--border) / 0.5)";

const MAX_TITLE_LENGTH = 150;
const DAYS_RANGE = 30;

/* Status config — matches existing DB enum values */
const STATUS_CONFIG = {
  completed: { label: "Completed", color: "hsl(160 84% 39%)" },
  in_progress: { label: "In Progress", color: "hsl(var(--primary))" },
  needs_revision: { label: "Needs Revision", color: "hsl(38 92% 50%)" },
  not_started: { label: "Not Started", color: "hsl(var(--muted-foreground))" },
} as const;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface FocusSession {
  id: string;
  session_date: string;
  duration_minutes: number;
  subject_id: string | null;
}

interface TestScore {
  id: string;
  title: string;
  score: number;
  max_score: number;
  test_date: string;
  subject_id: string | null;
  subjects?: { name: string; color: string };
}

interface Chapter {
  status: keyof typeof STATUS_CONFIG;
  subject_id: string;
  subjects?: { name: string; color: string };
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface TestScoreForm {
  title: string;
  score: number;
  max_score: number;
  subject_id: string;
  test_date: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useAnalyticsData = (userId: string | undefined) => {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [scores, setScores] = useState<TestScore[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const since = format(subDays(new Date(), DAYS_RANGE - 1), "yyyy-MM-dd");

      const [sessionsRes, scoresRes, chaptersRes, subjectsRes] = await Promise.all([
        supabase
          .from("focus_sessions")
          .select("id, session_date, duration_minutes, subject_id")
          .eq("user_id", userId)
          .gte("session_date", since),
        supabase
          .from("test_scores")
          .select("*, subjects(name, color)")
          .eq("user_id", userId)
          .order("test_date", { ascending: true }),
        supabase
          .from("chapters")
          .select("status, subject_id, subjects(name, color)")
          .eq("user_id", userId),
        supabase
          .from("subjects")
          .select("id, name, color")
          .eq("user_id", userId)
          .order("name"),
      ]);

      setSessions(sessionsRes.data ?? []);
      setScores(scoresRes.data ?? []);
      setChapters(chaptersRes.data ?? []);
      setSubjects(subjectsRes.data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, scores, chapters, subjects, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Chart helpers
═══════════════════════════════════════════════════════════════ */

/** Custom tooltip wrapper */
const ChartTooltip = ({ active, payload, label, unit = "" }: TooltipProps<number, string> & { unit?: string }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="px-3 py-2 rounded-xl text-sm shadow-xl"
      style={CHART_STYLE}
    >
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="tabular-nums">
          {entry.name}: <strong>{entry.value}{unit}</strong>
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Chart skeleton ── */
const ChartSkeleton = ({ height = 240 }: { height?: number }) => (
  <div className="space-y-3">
    <Skeleton className="h-5 w-48" />
    <Skeleton className={`w-full rounded-xl`} style={{ height }} />
  </div>
);

/* ── Summary stat card ── */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

const StatCard = ({ icon: Icon, label, value, sub, trend, color = "text-primary" }: StatCardProps) => {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <Icon className={cn("w-4 h-4 shrink-0", color)} />
        {trend && <TrendIcon className={cn("w-4 h-4", trendColor)} />}
      </div>
      <div className="text-2xl font-extrabold tabular-nums leading-none mb-1">{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>
    </Card>
  );
};

/* ── Empty chart state ── */
const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-60 flex flex-col items-center justify-center gap-3 text-center">
    <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
      <BarChart3 className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{message}</p>
  </div>
);

/* ── Add test score dialog ── */
interface AddScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSave: (form: TestScoreForm) => Promise<void>;
}

const AddScoreDialog = ({ open, onOpenChange, subjects, onSave }: AddScoreDialogProps) => {
  const [form, setForm] = useState<TestScoreForm>({
    title: "",
    score: 0,
    max_score: 100,
    subject_id: "",
    test_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [submitting, setSubmitting] = useState(false);

  const percentage = form.max_score > 0 ? Math.round((form.score / form.max_score) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Test name is required");
      return;
    }
    if (form.score < 0 || form.score > form.max_score) {
      toast.error("Score must be between 0 and max score");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(form);
      setForm({
        title: "",
        score: 0,
        max_score: 100,
        subject_id: "",
        test_date: format(new Date(), "yyyy-MM-dd"),
      });
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
          Log Test Score
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Test Score</DialogTitle>
          <DialogDescription>
            Track your test performance to visualise improvement over time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Test name */}
          <div className="space-y-2">
            <Label htmlFor="score-title" className="text-sm font-medium">
              Test name
            </Label>
            <Input
              id="score-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Chapter 5 Quiz, Mock Test 3"
              maxLength={MAX_TITLE_LENGTH}
              required
              autoFocus
              className="rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              {form.title.length}/{MAX_TITLE_LENGTH}
            </p>
          </div>

          {/* Score / Max */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score-val" className="text-sm font-medium">Score</Label>
              <Input
                id="score-val"
                type="number"
                min={0}
                max={form.max_score}
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="score-max" className="text-sm font-medium">Out of</Label>
              <Input
                id="score-max"
                type="number"
                min={1}
                max={10000}
                value={form.max_score}
                onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })}
                required
                className="rounded-xl h-11"
              />
            </div>
          </div>

          {/* Live percentage preview */}
          <div className="px-3 py-2 rounded-lg bg-muted/40 text-sm flex justify-between">
            <span className="text-muted-foreground">Score percentage</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                percentage >= 80
                  ? "text-emerald-600"
                  : percentage >= 60
                    ? "text-blue-600"
                    : "text-red-600",
              )}
            >
              {percentage}%
            </span>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="score-date" className="text-sm font-medium">Test date</Label>
            <Input
              id="score-date"
              type="date"
              value={form.test_date}
              onChange={(e) => setForm({ ...form, test_date: e.target.value })}
              required
              className="rounded-xl h-11"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="score-subject" className="text-sm font-medium">
              Subject <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={form.subject_id || "none"}
              onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}
            >
              <SelectTrigger id="score-subject" className="rounded-xl h-11">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No subject</span>
                </SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {submitting ? "Saving..." : "Save Score"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Analytics = () => {
  const { user } = useAuth();
  const { sessions, scores, chapters, subjects, loading, reload } = useAnalyticsData(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Analytics · Synapse Forge";
  }, []);

  /* ── Add test score ── */
  const handleAddScore = async (form: TestScoreForm) => {
    if (!user) return;

    const { error } = await supabase.from("test_scores").insert({
      user_id: user.id,
      title: form.title.trim(),
      score: form.score,
      max_score: form.max_score,
      subject_id: form.subject_id || null,
      test_date: form.test_date,
    });

    if (error) {
      toast.error(error.message ?? "Failed to save score");
      throw error;
    }

    toast.success("Score logged successfully!");
    reload();
  };

  /* ── Derived chart data — all computed, no hardcoded values ── */

  // 30-day daily focus minutes
  const last30Days = useMemo(() =>
    eachDayOfInterval({ start: subDays(new Date(), DAYS_RANGE - 1), end: new Date() }).map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      const minutes = sessions
        .filter((s) => s.session_date === ds)
        .reduce((acc, s) => acc + s.duration_minutes, 0);
      return {
        date: format(d, "MMM d"),
        minutes,
        hours: +(minutes / 60).toFixed(1),
      };
    }),
    [sessions],
  );

  // Minutes per subject
  const subjectMinutes = useMemo(() =>
    subjects
      .map((s) => ({
        name: s.name,
        color: s.color,
        minutes: sessions
          .filter((x) => x.subject_id === s.id)
          .reduce((acc, x) => acc + x.duration_minutes, 0),
        hours: +(
          sessions
            .filter((x) => x.subject_id === s.id)
            .reduce((acc, x) => acc + x.duration_minutes, 0) / 60
        ).toFixed(1),
      }))
      .filter((x) => x.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes),
    [sessions, subjects],
  );

  // Chapter status breakdown — config-driven
  const statusData = useMemo(() =>
    (Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>)
      .map((status) => ({
        name: STATUS_CONFIG[status].label,
        value: chapters.filter((c) => c.status === status).length,
        color: STATUS_CONFIG[status].color,
      }))
      .filter((x) => x.value > 0),
    [chapters],
  );

  // Score trend
  const scoreTrend = useMemo(() =>
    scores.map((s) => ({
      date: format(parseISO(s.test_date), "MMM d"),
      pct: Math.round((Number(s.score) / Number(s.max_score)) * 100),
      title: s.title,
      score: s.score,
      maxScore: s.max_score,
    })),
    [scores],
  );

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalMinutes = sessions.reduce((a, s) => a + s.duration_minutes, 0);
    const totalHours = +(totalMinutes / 60).toFixed(1);
    const totalSessions = sessions.length;
    const activeDays = new Set(sessions.map((s) => s.session_date)).size;
    const avgPct =
      scores.length > 0
        ? Math.round(
          scores.reduce(
            (acc, s) => acc + (Number(s.score) / Number(s.max_score)) * 100,
            0,
          ) / scores.length,
        )
        : 0;
    const completedChapters = chapters.filter((c) => c.status === "completed").length;

    // Trend: compare last 7 days vs previous 7 days
    const last7 = sessions
      .filter((s) => s.session_date >= format(subDays(new Date(), 6), "yyyy-MM-dd"))
      .reduce((a, s) => a + s.duration_minutes, 0);
    const prev7 = sessions
      .filter(
        (s) =>
          s.session_date >= format(subDays(new Date(), 13), "yyyy-MM-dd") &&
          s.session_date < format(subDays(new Date(), 6), "yyyy-MM-dd"),
      )
      .reduce((a, s) => a + s.duration_minutes, 0);

    const studyTrend: "up" | "down" | "neutral" =
      last7 > prev7 ? "up" : last7 < prev7 ? "down" : "neutral";

    return {
      totalHours,
      totalSessions,
      activeDays,
      avgPct,
      completedChapters,
      studyTrend,
    };
  }, [sessions, scores, chapters]);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Insights to sharpen your study strategy
          </p>
        </div>
        <AddScoreDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          subjects={subjects}
          onSave={handleAddScore}
        />
      </div>

      {/* Summary stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Clock}
            label="Total Focus"
            value={`${summaryStats.totalHours}h`}
            sub={`${summaryStats.totalSessions} sessions`}
            trend={summaryStats.studyTrend}
            color="text-primary"
          />
          <StatCard
            icon={Zap}
            label="Active Days"
            value={`${summaryStats.activeDays}`}
            sub={`of last ${DAYS_RANGE}`}
            color="text-violet-500"
          />
          <StatCard
            icon={Target}
            label="Avg Test Score"
            value={summaryStats.avgPct > 0 ? `${summaryStats.avgPct}%` : "—"}
            sub={`${scores.length} tests logged`}
            trend={summaryStats.avgPct >= 75 ? "up" : summaryStats.avgPct > 0 ? "down" : undefined}
            color="text-emerald-500"
          />
          <StatCard
            icon={BookOpen}
            label="Chapters Done"
            value={`${summaryStats.completedChapters}`}
            sub={`of ${chapters.length} total`}
            color="text-blue-500"
          />
        </div>
      )}

      {/* Study consistency — area chart */}
      <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
        {loading ? (
          <ChartSkeleton height={260} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-sm">
                Study Consistency
                <span className="text-muted-foreground font-normal ml-2">(last {DAYS_RANGE} days)</span>
              </h2>
              <Badge variant="secondary" className="text-xs">
                {summaryStats.activeDays} active days
              </Badge>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={last30Days} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="date"
                  tick={AXIS_STYLE}
                  stroke="transparent"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={AXIS_STYLE}
                  stroke="transparent"
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip content={<ChartTooltip unit="m" />} />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  name="Minutes"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#focusGradient)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      {/* Subject time + Chapter status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Time per subject */}
        <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <>
              <h2 className="font-semibold text-sm mb-4">
                Time Per Subject
              </h2>

              {subjectMinutes.length === 0 ? (
                <EmptyChart message="Log focus sessions with a subject selected to see breakdown." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={subjectMinutes}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                    <XAxis dataKey="name" tick={AXIS_STYLE} stroke="transparent" />
                    <YAxis
                      tick={AXIS_STYLE}
                      stroke="transparent"
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip content={<ChartTooltip unit="m" />} />
                    <Bar dataKey="minutes" name="Minutes" radius={[8, 8, 0, 0]}>
                      {subjectMinutes.map((entry, i) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </Card>

        {/* Chapter status pie */}
        <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <>
              <h2 className="font-semibold text-sm mb-4">
                Chapter Status Breakdown
              </h2>

              {statusData.length === 0 ? (
                <EmptyChart message="Add chapters to see your progress breakdown." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_STYLE}
                      formatter={(value, name) => [`${value} chapters`, name]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => (
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Test score trend */}
      <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
        {loading ? (
          <ChartSkeleton height={260} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-sm">
                Test Score Trend
              </h2>
              {scoreTrend.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    summaryStats.avgPct >= 75
                      ? "bg-emerald-500/10 text-emerald-600"
                      : summaryStats.avgPct >= 50
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-red-500/10 text-red-600",
                  )}
                >
                  Avg: {summaryStats.avgPct}%
                </Badge>
              )}
            </div>

            {scoreTrend.length === 0 ? (
              <EmptyChart message="Log your first test score to see your performance trend." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={scoreTrend}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(262.1 83.3% 57.8%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="date" tick={AXIS_STYLE} stroke="transparent" />
                  <YAxis
                    domain={[0, 100]}
                    tick={AXIS_STYLE}
                    stroke="transparent"
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="px-3 py-2 rounded-xl text-sm shadow-xl" style={CHART_STYLE}>
                          <p className="font-semibold text-foreground mb-1">{d.title}</p>
                          <p className="text-muted-foreground">{label}</p>
                          <p className="font-bold tabular-nums mt-1" style={{ color: "hsl(262.1 83.3% 57.8%)" }}>
                            {d.pct}% ({d.score}/{d.maxScore})
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    name="Score %"
                    stroke="hsl(262.1 83.3% 57.8%)"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: "hsl(262.1 83.3% 57.8%)", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Analytics;