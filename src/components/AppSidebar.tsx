import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, BookOpen, BookMarked, CalendarDays, BarChart3, Trophy,
  GraduationCap, Timer, Target, ClipboardList, HelpCircle, NotebookPen,
  Sparkles, Flame, Brain, Swords, FlaskConical, Atom, Bell, ChevronRight,
  Zap,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════
   Nav Config — no hardcoded badges
═══════════════════════════════════════════════════════════════ */
const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Chapters", url: "/chapters", icon: BookMarked },
  { title: "Planner", url: "/planner", icon: CalendarDays },
  { title: "Timetable", url: "/timetable", icon: ClipboardList },
];

const study = [
  { title: "Focus Timer", url: "/focus", icon: Timer },
  { title: "Mock Test", url: "/mock-test", icon: FlaskConical },
  { title: "Micro-Goals", url: "/micro-goals", icon: Atom },
  { title: "Homework", url: "/homework", icon: NotebookPen },
  { title: "Exams", url: "/exams", icon: GraduationCap },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Doubts", url: "/doubts", icon: HelpCircle },
  { title: "Reflections", url: "/reflections", icon: Sparkles },
];

const insight = [
  { title: "AI Coach", url: "/coach", icon: Brain },
  { title: "Challenges", url: "/challenges", icon: Swords },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Rewards", url: "/rewards", icon: Trophy },
];

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface DynamicBadges {
  homework?: number;
  doubts?: number;
  notifications?: number;
}

/* ═══════════════════════════════════════════════════════════════
   Hook to fetch dynamic badges
═══════════════════════════════════════════════════════════════ */
const useDynamicBadges = (userId: string | undefined): DynamicBadges => {
  const [badges, setBadges] = useState<DynamicBadges>({});

  useEffect(() => {
    if (!userId) return;

    const loadBadges = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [hwRes, doubtsRes, notifRes] = await Promise.all([
        // Incomplete homework overdue
        supabase
          .from("homework")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("completed", false)
          .lt("due_date", today),

        // Unresolved doubts
        supabase
          .from("doubts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("resolved", false),

        // Unread notifications
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false),
      ]);

      setBadges({
        homework: hwRes.count ?? 0,
        doubts: doubtsRes.count ?? 0,
        notifications: notifRes.count ?? 0,
      });
    };

    loadBadges();

    // Realtime subscription for notifications
    const channel = supabase
      .channel(`sidebar-badges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => loadBadges(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "homework",
          filter: `user_id=eq.${userId}`,
        },
        () => loadBadges(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doubts",
          filter: `user_id=eq.${userId}`,
        },
        () => loadBadges(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return badges;
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export function AppSidebar() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile } = useProfile();
  const dynamicBadges = useDynamicBadges(user?.id);

  // XP calculation
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpPerLevel = level * 500;
  const xpInLevel = xp % xpPerLevel;
  const xpProgress = (xpInLevel / xpPerLevel) * 100;

  /* ── Get badge value for item ── */
  const getBadge = (title: string): string | null => {
    if (title === "Homework" && (dynamicBadges.homework ?? 0) > 0)
      return String(dynamicBadges.homework);
    if (title === "Doubts" && (dynamicBadges.doubts ?? 0) > 0)
      return String(dynamicBadges.doubts);
    if (title === "Notifications" && (dynamicBadges.notifications ?? 0) > 0)
      return String(dynamicBadges.notifications);
    return null;
  };

  /* ── Render single nav item ── */
  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.url;
    const badge = getBadge(item.title);

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5",
              "text-sm font-medium transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-accent/60",
              isActive && "bg-primary/10 text-primary",
            )}
          >
            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
            )}

            {/* Icon */}
            <item.icon
              className={cn(
                "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
            />

            {/* Label + Badge */}
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.title}</span>

                {badge && (
                  <Badge
                    className={cn(
                      "h-4 min-w-4 px-1 text-[10px] font-bold leading-none",
                      "bg-red-500 text-white border-0 animate-pulse",
                    )}
                  >
                    {Number(badge) > 9 ? "9+" : badge}
                  </Badge>
                )}

                {/* Hover arrow */}
                <ChevronRight
                  className={cn(
                    "w-3 h-3 opacity-0 -translate-x-1 transition-all duration-200",
                    "group-hover:opacity-40 group-hover:translate-x-0",
                    isActive && "hidden",
                  )}
                />
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  /* ── Section label ── */
  const SectionLabel = ({ label }: { label: string }) =>
    collapsed ? (
      <div className="my-2 h-px bg-border/60 mx-2" />
    ) : (
      <SidebarGroupLabel className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </SidebarGroupLabel>
    );

  /* ─────────────────────────────────────────── render ── */
  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-sidebar-border/60",
        "bg-sidebar backdrop-blur-xl",
        "transition-all duration-300",
      )}
    >
      {/* Header */}
      <SidebarHeader className="px-3 py-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-foreground">
                  Synapse
                </span>
                <span className="font-extrabold text-sm tracking-tight text-primary">
                  Forge
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] text-muted-foreground">Lv {level}</span>
                <span className="text-[11px] text-muted-foreground/40">·</span>
                <span className="text-[11px] font-semibold text-primary">{xp} XP</span>
              </div>
            </div>
          )}
        </div>

        {/* XP Progress */}
        {!collapsed && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>To Lv {level + 1}</span>
              <span>{xpInLevel} / {xpPerLevel}</span>
            </div>
            <Progress
              value={xpProgress}
              className="h-1.5 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500"
            />
            {profile?.identity_label && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  {profile.identity_label}
                </span>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      {/* Nav — Custom scrollbar */}
      <SidebarContent
        className={cn(
          "px-2 py-3 gap-0",
          // Custom scrollbar styles
          "overflow-y-auto overflow-x-hidden",
          "[&::-webkit-scrollbar]:w-2",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:bg-border/40",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:border-2",
          "[&::-webkit-scrollbar-thumb]:border-transparent",
          "[&::-webkit-scrollbar-thumb]:bg-clip-padding",
          "hover:[&::-webkit-scrollbar-thumb]:bg-border/60",
        )}
      >
        <SidebarGroup className="p-0 mb-2">
          <SectionLabel label="Workspace" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0 mb-2">
          <SectionLabel label="Study" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{study.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0">
          <SectionLabel label="Insights" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{insight.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      {!collapsed && (
        <SidebarFooter className="px-3 py-3 border-t border-sidebar-border/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-500/30">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground">
                {profile?.current_streak ?? 0} Day Streak 🔥
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Keep it going!
              </div>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}