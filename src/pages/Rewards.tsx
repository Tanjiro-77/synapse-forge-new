import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { BADGES } from "@/lib/study";
import {
  Trophy,
  Flame,
  Star,
  Lock,
  Zap,
  CheckCircle2,
  Target,
  TrendingUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — existing schema only
═══════════════════════════════════════════════════════════════ */
const XP_PER_LEVEL = 500;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface EarnedBadge {
  id: string;
  code: string;
  earned_at: string;
}

type BadgeFilter = "all" | "earned" | "locked";

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Skeleton loaders ── */
const StatCardSkeleton = () => (
  <Card className="p-5 border-border/50 bg-card/60">
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  </Card>
);

const BadgeSkeleton = () => (
  <Card className="p-4 border-border/50 bg-card/60">
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="w-14 h-14 rounded-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  </Card>
);

/* ── Stat card ── */
interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  sub?: string;
  iconClass?: string;
  glowClass?: string;
}

const StatCard = ({ icon: Icon, value, label, sub, iconClass, glowClass }: StatCardProps) => (
  <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm text-center relative overflow-hidden">
    {glowClass && (
      <div
        className={cn(
          "absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none",
          glowClass,
        )}
      />
    )}
    <Icon className={cn("w-8 h-8 mx-auto mb-2 shrink-0", iconClass)} />
    <div className="text-4xl font-extrabold tabular-nums leading-none">{value}</div>
    <div className="text-xs text-muted-foreground mt-1.5">{label}</div>
    {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>}
  </Card>
);

/* ── XP progress bar ── */
interface XpBarProps {
  xp: number;
  level: number;
}

const XpBar = ({ xp, level }: XpBarProps) => {
  const xpInLevel = xp % XP_PER_LEVEL;
  const progress = (xpInLevel / XP_PER_LEVEL) * 100;
  const xpToNext = XP_PER_LEVEL - xpInLevel;

  return (
    <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between text-sm mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-semibold">Level Progress</span>
        </div>
        <span className="text-muted-foreground tabular-nums text-xs">
          {xpInLevel.toLocaleString()} / {XP_PER_LEVEL.toLocaleString()} XP
          <span className="ml-1 text-muted-foreground/60">
            ({xpToNext} to Lv {level + 1})
          </span>
        </span>
      </div>

      <Progress
        value={progress}
        className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500 [&>div]:transition-all [&>div]:duration-700"
      />

      <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-2">
        <span>Lv {level}</span>
        <span className="font-medium text-primary/60">{Math.round(progress)}% complete</span>
        <span>Lv {level + 1}</span>
      </div>
    </Card>
  );
};

/* ── Badge card ── */
interface BadgeCardProps {
  badge: { code: string; name: string; description: string };
  earned: EarnedBadge | undefined;
  isNew: boolean;
}

const BadgeCard = ({ badge, earned, isNew }: BadgeCardProps) => {
  const isEarned = !!earned;

  return (
    <Card
      className={cn(
        "p-4 text-center relative overflow-hidden",
        "border-border/50 bg-card/60 backdrop-blur-sm",
        "transition-all duration-200",
        isEarned
          ? "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
          : "opacity-55",
      )}
    >
      {/* New badge indicator */}
      {isNew && (
        <div className="absolute top-2 right-2">
          <Badge className="h-4 text-[9px] px-1.5 bg-primary text-primary-foreground animate-pulse">
            NEW
          </Badge>
        </div>
      )}

      {/* Badge icon */}
      <div
        className={cn(
          "w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3",
          "transition-all duration-200",
          isEarned
            ? "bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/30"
            : "bg-muted/60",
        )}
      >
        {isEarned ? (
          <Trophy className="w-7 h-7 text-primary-foreground" />
        ) : (
          <Lock className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Badge info */}
      <div className="font-semibold text-sm leading-snug">{badge.name}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
        {badge.description}
      </div>

      {/* Earned date */}
      {isEarned && earned && (
        <div className="text-[10px] font-medium text-primary mt-2 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {format(parseISO(earned.earned_at), "MMM d, yyyy")}
        </div>
      )}
    </Card>
  );
};

/* ── Progress summary bar ── */
interface BadgeProgressProps {
  earned: number;
  total: number;
}

const BadgeProgress = ({ earned, total }: BadgeProgressProps) => {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Badge Collection</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums text-primary">
            {earned}/{total}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "h-5 text-[10px]",
              pct === 100
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-primary/10 text-primary border-primary/20",
            )}
          >
            {pct === 100 ? "Complete! 🎉" : `${pct}%`}
          </Badge>
        </div>
      </div>
      <Progress
        value={pct}
        className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
      />
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Rewards = () => {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BadgeFilter>("all");

  /* ── Load badges ── */
  const loadBadges = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("id, code, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setEarned(data ?? []);
    } catch (error: any) {
      console.error("Failed to load badges:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    document.title = "Rewards · Synapse Forge";
    loadBadges();
  }, [loadBadges]);

  /* ── Derived data ── */
  const earnedMap = useMemo(
    () => new Map(earned.map((b) => [b.code, b])),
    [earned],
  );

  // Find newest badge (most recently earned)
  const newestBadgeCode = useMemo(
    () => (earned.length > 0 ? earned[0].code : null),
    [earned],
  );

  // Filtered badge list
  const filteredBadges = useMemo(() => {
    if (filter === "earned") return BADGES.filter((b) => earnedMap.has(b.code));
    if (filter === "locked") return BADGES.filter((b) => !earnedMap.has(b.code));
    return BADGES;
  }, [filter, earnedMap]);

  // XP progress
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" />
          Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discipline pays. Collect them all.
        </p>
      </div>

      {/* Stat cards */}
      {loading || !profile ? (
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard
            icon={Star}
            value={`Lv ${level}`}
            label="Current Level"
            sub={`${xp.toLocaleString()} XP total`}
            iconClass="text-primary"
            glowClass="bg-primary"
          />
          <StatCard
            icon={Trophy}
            value={xp.toLocaleString()}
            label="Total XP"
            sub={`${earned.length} badges earned`}
            iconClass="text-amber-500"
          />
          <StatCard
            icon={Flame}
            value={`${profile.current_streak ?? 0}d`}
            label="Current Streak"
            sub={`Best: ${profile.best_streak ?? 0} days`}
            iconClass="text-orange-500"
            glowClass="bg-orange-500"
          />
        </div>
      )}

      {/* XP progress */}
      {!loading && profile ? (
        <XpBar xp={xp} level={level} />
      ) : (
        <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </Card>
      )}

      {/* Badge collection progress */}
      {!loading && (
        <BadgeProgress earned={earned.length} total={BADGES.length} />
      )}

      {/* Badge section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Badges
            <Badge variant="secondary" className="text-xs">
              {earned.length}/{BADGES.length}
            </Badge>
          </h2>

          {/* Filter tabs */}
          <Tabs value={filter} onValueChange={(v: BadgeFilter) => setFilter(v)}>
            <TabsList className="h-8 rounded-lg">
              <TabsTrigger value="all" className="rounded-md text-xs px-3">
                All
              </TabsTrigger>
              <TabsTrigger value="earned" className="rounded-md text-xs px-3">
                Earned
                {earned.length > 0 && (
                  <Badge className="ml-1.5 h-4 text-[9px] px-1 bg-primary">
                    {earned.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="locked" className="rounded-md text-xs px-3">
                Locked
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Badge grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <BadgeSkeleton key={i} />
            ))}
          </div>
        ) : filteredBadges.length === 0 ? (
          <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {filter === "earned" ? "No badges earned yet" : "No locked badges"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {filter === "earned"
                ? "Complete challenges and hit study milestones to earn your first badge."
                : "You've earned all available badges! Incredible work."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredBadges.map((badge) => (
              <BadgeCard
                key={badge.code}
                badge={badge}
                earned={earnedMap.get(badge.code)}
                isNew={badge.code === newestBadgeCode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Rewards;