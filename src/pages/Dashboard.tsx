import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBadgeAwarder } from "@/hooks/useBadgeAwarder";
import { dailyQuote, STATUS_LABEL, STATUS_COLOR } from "@/lib/study";
import {
  Flame, Trophy, Target, Timer, BookMarked, GraduationCap,
  CheckCircle2, Circle, ArrowRight, Sparkles, AlertTriangle,
  TrendingUp, Brain, Calendar, Zap, ChevronRight,
} from "lucide-react";
import { format, differenceInDays, parseISO, isToday } from "date-fns";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low" | null;
}
interface Exam {
  id: string;
  title: string;
  exam_date: string;
  syllabus_completion: number;
}
interface Chapter {
  id: string;
  name: string;
  next_revision_at: string | null;
  is_weak: boolean;
  subjects?: { name: string; color: string };
}
interface Homework {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   Stat card config — driven purely by profile/fetched data
═══════════════════════════════════════════════════════════════ */
const useStatCards = (
  profile: any,
  todayMinutes: number,
  tasks: Task[],
) =>
  useMemo(() => [
    {
      icon: Flame,
      label: "Current Streak",
      value: `${profile?.current_streak ?? 0}d`,
      sub: `Best ${profile?.best_streak ?? 0}d`,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-500",
      href: "/analytics",
    },
    {
      icon: Trophy,
      label: "Level",
      value: `Lv ${profile?.level ?? 1}`,
      sub: `${profile?.xp ?? 0} XP total`,
      colorClass: "text-primary",
      bgClass: "bg-primary",
      href: "/rewards",
    },
    {
      icon: Timer,
      label: "Focus Today",
      value: todayMinutes >= 60
        ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`
        : `${todayMinutes}m`,
      sub: "Time studied",
      colorClass: "text-violet-500",
      bgClass: "bg-violet-500",
      href: "/focus",
    },
    {
      icon: Target,
      label: "Tasks Done",
      value: `${tasks.filter((t) => t.completed).length}/${tasks.length}`,
      sub: "Today",
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500",
      href: "/planner",
    },
  ], [profile, todayMinutes, tasks]);

/* ═══════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════ */

/* ── Skeleton loader ── */
const CardSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full rounded-lg" />
    ))}
  </div>
);

/* ── Section header ── */
const SectionHeader = ({
  icon: Icon,
  title,
  href,
  iconClass,
}: {
  icon: React.ElementType;
  title: string;
  href?: string;
  iconClass?: string;
}) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-semibold flex items-center gap-2 text-sm">
      <Icon className={cn("w-4 h-4 shrink-0", iconClass)} />
      {title}
    </h2>
    {href && (
      <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
        <Link to={href}>
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </Button>
    )}
  </div>
);

/* ── Empty state ── */
const EmptyState = ({
  icon: Icon,
  text,
  cta,
}: {
  icon?: React.ElementType;
  text: string;
  cta?: { to: string; label: string };
}) => (
  <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
    {Icon && (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
    )}
    <p className="text-sm text-muted-foreground max-w-[180px] leading-relaxed">{text}</p>
    {cta && (
      <Button asChild variant="outline" size="sm" className="rounded-lg h-8 text-xs gap-1.5">
        <Link to={cta.to}>
          {cta.label}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </Button>
    )}
  </div>
);

/* ── Stat card ── */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  colorClass: string;
  bgClass: string;
  href: string;
}
const StatCard = ({ icon: Icon, label, value, sub, colorClass, bgClass, href }: StatCardProps) => (
  <Link to={href} className="block group">
    <Card className={cn(
      "p-4 relative overflow-hidden",
      "border-border/50 bg-card/60 backdrop-blur-sm",
      "hover:border-border hover:shadow-md",
      "transition-all duration-200",
    )}>
      {/* ambient blob */}
      <div className={cn(
        "absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10",
        "transition-opacity duration-200 group-hover:opacity-15",
        bgClass,
      )} />
      <Icon className={cn("w-4 h-4 mb-3 shrink-0", colorClass)} />
      <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs font-medium text-muted-foreground mt-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground/60 mt-1">{sub}</div>
    </Card>
  </Link>
);

/* ── XP progress bar ── */
const XpBar = ({ xp, level }: { xp: number; level: number }) => {
  const xpPerLevel = level * 500;
  const xpInLevel = xp % xpPerLevel;
  const progress = (xpInLevel / xpPerLevel) * 100;

  return (
    <Card className="px-5 py-4 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-medium">Progress to Level {level + 1}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {xpInLevel.toLocaleString()} / {xpPerLevel.toLocaleString()} XP
        </span>
      </div>
      <Progress
        value={progress}
        className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500 [&>div]:transition-all [&>div]:duration-700"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
        <span>Lv {level}</span>
        <span>{Math.round(progress)}% complete</span>
        <span>Lv {level + 1}</span>
      </div>
    </Card>
  );
};

/* ── Comeback banner ── */
const ComebackBanner = ({ daysSince }: { daysSince: number }) => (
  <Card className={cn(
    "p-5 border-amber-500/30 bg-amber-500/5",
    "animate-in slide-in-from-top-2 fade-in-0 duration-300",
  )}>
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">No problem — let's restart 💪</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          You've been away {daysSince} {daysSince === 1 ? "day" : "days"}.
          Forget the past — just do ONE 15-min focus session today. Small comeback wins.
        </p>
        <Button asChild size="sm" className="mt-3 h-8 text-xs rounded-lg gap-1.5">
          <Link to="/focus">
            <Timer className="w-3 h-3" />
            Start tiny session
          </Link>
        </Button>
      </div>
    </div>
  </Card>
);

/* ── Task item ── */
const TaskItem = ({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
}) => (
  <button
    onClick={() => onToggle(task.id, task.completed)}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
      "hover:bg-muted/50 active:bg-muted/70",
      "transition-all duration-150 text-left group",
    )}
  >
    {task.completed ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
    ) : (
      <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
    )}
    <span className={cn(
      "flex-1 text-sm truncate transition-colors duration-200",
      task.completed && "line-through text-muted-foreground",
    )}>
      {task.title}
    </span>
    {task.priority === "high" && !task.completed && (
      <Badge
        variant="outline"
        className="h-5 text-[10px] font-bold border-red-500/30 text-red-500 bg-red-500/5 shrink-0"
      >
        High
      </Badge>
    )}
  </button>
);

/* ── Exam countdown card ── */
const ExamCountdown = ({ exam }: { exam: Exam }) => {
  const daysLeft = differenceInDays(parseISO(exam.exam_date), new Date());
  const urgency = daysLeft <= 3 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-primary";

  return (
    <div className="space-y-4">
      <div>
        <div className="font-semibold text-sm">{exam.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {format(parseISO(exam.exam_date), "EEEE, MMM d yyyy")}
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span className={cn("text-4xl font-extrabold tabular-nums leading-none", urgency)}>
          {daysLeft}
        </span>
        <span className="text-sm text-muted-foreground mb-1">
          {daysLeft === 1 ? "day" : "days"} left
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Syllabus covered</span>
          <span className="font-semibold text-foreground">{exam.syllabus_completion}%</span>
        </div>
        <Progress
          value={exam.syllabus_completion}
          className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500"
        />
      </div>
      <Button asChild variant="outline" size="sm" className="w-full rounded-xl h-9 text-xs gap-1.5">
        <Link to="/exams">
          Manage exams
          <ArrowRight className="w-3 h-3" />
        </Link>
      </Button>
    </div>
  );
};

/* ── Chapter row ── */
const ChapterRow = ({
  chapter,
  href,
  variant = "default",
}: {
  chapter: Chapter;
  href: string;
  variant?: "default" | "warning" | "danger";
}) => {
  const styles = {
    default: "hover:bg-muted/40",
    warning: "bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10",
    danger: "bg-red-500/5 border border-red-500/15 hover:bg-red-500/10",
  };

  return (
    <Link
      to={href}
      className={cn(
        "block px-3 py-2.5 rounded-xl transition-colors duration-150",
        styles[variant],
      )}
    >
      <div className="flex items-center gap-2.5">
        {chapter.subjects?.color && (
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: chapter.subjects.color }}
          />
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{chapter.name}</div>
          {chapter.subjects?.name && (
            <div className="text-[11px] text-muted-foreground truncate">
              {chapter.subjects.name}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

/* ── Overdue homework row ── */
const OverdueRow = ({ hw }: { hw: Homework }) => {
  const daysOverdue = differenceInDays(new Date(), parseISO(hw.due_date));
  return (
    <Link
      to="/homework"
      className="block px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors duration-150"
    >
      <div className="text-sm font-medium truncate">{hw.title}</div>
      <div className="text-[11px] text-red-500 mt-0.5">
        Overdue {daysOverdue === 0 ? "today" : `${daysOverdue}d ago`} · {format(parseISO(hw.due_date), "MMM d")}
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Dashboard
═══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  useBadgeAwarder();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextExam, setNextExam] = useState<Exam | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [revisionDue, setRevisionDue] = useState<Chapter[]>([]);
  const [weakChapters, setWeakChapters] = useState<Chapter[]>([]);
  const [overdueHw, setOverdueHw] = useState<Homework[]>([]);

  /* ── fetch all dashboard data in one pass ── */
  useEffect(() => {
    document.title = "Dashboard · Synapse Forge";
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");

    (async () => {
      setLoading(true);
      const [t, e, fs, rev, weak, hw] = await Promise.all([
        supabase
          .from("planner_tasks")
          .select("id, title, completed, priority, task_date")
          .eq("user_id", user.id)
          .eq("task_date", today)
          .order("created_at"),
        supabase
          .from("exams")
          .select("id, title, exam_date, syllabus_completion")
          .eq("user_id", user.id)
          .gte("exam_date", today)
          .order("exam_date")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("focus_sessions")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .eq("session_date", today),
        supabase
          .from("chapters")
          .select("id, name, next_revision_at, is_weak, subjects(name, color)")
          .eq("user_id", user.id)
          .not("next_revision_at", "is", null)
          .lte("next_revision_at", new Date().toISOString())
          .limit(5),
        supabase
          .from("chapters")
          .select("id, name, next_revision_at, is_weak, subjects(name, color)")
          .eq("user_id", user.id)
          .eq("is_weak", true)
          .limit(5),
        supabase
          .from("homework")
          .select("id, title, due_date, completed")
          .eq("user_id", user.id)
          .eq("completed", false)
          .lt("due_date", today)
          .limit(5),
      ]);

      setTasks((t.data as Task[]) ?? []);
      setNextExam((e.data as Exam) ?? null);
      setTodayMinutes(
        ((fs.data ?? []) as { duration_minutes: number }[])
          .reduce((a, x) => a + x.duration_minutes, 0),
      );
      setRevisionDue((rev.data as Chapter[]) ?? []);
      setWeakChapters((weak.data as Chapter[]) ?? []);
      setOverdueHw((hw.data as Homework[]) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  /* ── toggle task ── */
  const toggleTask = async (id: string, completed: boolean) => {
    await supabase.from("planner_tasks").update({ completed: !completed }).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !completed } : t));
  };

  /* ── derived ── */
  const statCards = useStatCards(profile, todayMinutes, tasks);

  const daysSinceStudy = useMemo(() => {
    if (!profile?.last_study_date) return 0;
    return differenceInDays(new Date(), parseISO(profile.last_study_date));
  }, [profile?.last_study_date]);

  const showComeback = daysSinceStudy >= 3;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Hero banner ── */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl p-6 sm:p-8",
        "bg-gradient-to-br from-primary via-primary/90 to-violet-600",
        "shadow-xl shadow-primary/20",
      )}>
        {/* texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.15)_0%,_transparent_60%)]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/70 text-xs mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1">
            {greeting},{" "}
            <span className="text-white/90">
              {profile?.display_name ?? "Scholar"}
            </span>{" "}
            👋
          </h1>

          <p className="text-white/70 text-sm italic max-w-xl mt-2 leading-relaxed">
            "{dailyQuote()}"
          </p>

          {/* quick stats row */}
          <div className="flex flex-wrap gap-3 mt-5 mb-5">
            {profile?.current_streak != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                {profile.current_streak} day streak
              </div>
            )}
            {profile?.xp != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                {profile.xp} XP · Level {profile.level}
              </div>
            )}
            {todayMinutes > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
                <Timer className="w-3.5 h-3.5 text-green-300" />
                {todayMinutes}m focused today
              </div>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-2.5">
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-white text-primary hover:bg-white/90 font-semibold gap-1.5 shadow-lg"
            >
              <Link to="/focus">
                <Timer className="w-3.5 h-3.5" />
                Start Focus
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 font-medium gap-1.5"
            >
              <Link to="/coach">
                <Brain className="w-3.5 h-3.5" />
                AI Coach
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 font-medium gap-1.5"
            >
              <Link to="/planner">
                Plan today
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Comeback banner (conditional) ── */}
      {showComeback && <ComebackBanner daysSince={daysSinceStudy} />}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── XP bar ── */}
      <XpBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />

      {/* ── Tasks + Exam ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Tasks */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <SectionHeader
              icon={Target}
              title="Today's Tasks"
              href="/planner"
              iconClass="text-primary"
            />
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {loading ? (
              <CardSkeleton rows={4} />
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={Target}
                text="No tasks yet today. Plan your day to stay focused."
                cta={{ to: "/planner", label: "Open Planner" }}
              />
            ) : (
              <div className="space-y-0.5">
                {tasks.slice(0, 6).map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={toggleTask} />
                ))}
                {tasks.length > 6 && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs text-muted-foreground h-8 rounded-xl"
                  >
                    <Link to="/planner">
                      +{tasks.length - 6} more tasks
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next exam */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <SectionHeader
              icon={GraduationCap}
              title="Next Exam"
              href="/exams"
              iconClass="text-violet-500"
            />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <CardSkeleton rows={3} />
            ) : nextExam ? (
              <ExamCountdown exam={nextExam} />
            ) : (
              <EmptyState
                icon={GraduationCap}
                text="No upcoming exams scheduled."
                cta={{ to: "/exams", label: "Add Exam" }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Smart engine widgets ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revision due */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <SectionHeader
              icon={BookMarked}
              title="Revision Due"
              href="/chapters"
              iconClass="text-primary"
            />
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {loading ? (
              <CardSkeleton rows={3} />
            ) : revisionDue.length === 0 ? (
              <EmptyState
                icon={BookMarked}
                text="Nothing due. You're all caught up!"
              />
            ) : (
              <div className="space-y-1">
                {revisionDue.map((c) => (
                  <ChapterRow key={c.id} chapter={c} href="/chapters" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak topics */}
        <Card className="border-amber-500/20 bg-amber-500/3 backdrop-blur-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <SectionHeader
              icon={AlertTriangle}
              title="Weak Topics"
              href="/chapters"
              iconClass="text-amber-500"
            />
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {loading ? (
              <CardSkeleton rows={3} />
            ) : weakChapters.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                text="No weak topics flagged. Great work!"
              />
            ) : (
              <div className="space-y-1">
                {weakChapters.map((c) => (
                  <ChapterRow key={c.id} chapter={c} href="/chapters" variant="warning" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backlog */}
        <Card className="border-red-500/20 bg-red-500/3 backdrop-blur-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <SectionHeader
              icon={AlertTriangle}
              title="Overdue Homework"
              href="/homework"
              iconClass="text-red-500"
            />
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {loading ? (
              <CardSkeleton rows={3} />
            ) : overdueHw.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                text="No overdue work. You're on track!"
              />
            ) : (
              <div className="space-y-1">
                {overdueHw.map((h) => (
                  <OverdueRow key={h.id} hw={h} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;