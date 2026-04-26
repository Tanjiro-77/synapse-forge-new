import { NavLink, useLocation } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/* ─── nav config ────────────────────────────────────────────────── */
const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, badge: null },
  { title: "Subjects", url: "/subjects", icon: BookOpen, badge: null },
  { title: "Chapters", url: "/chapters", icon: BookMarked, badge: null },
  { title: "Planner", url: "/planner", icon: CalendarDays, badge: null },
  { title: "Timetable", url: "/timetable", icon: ClipboardList, badge: null },
];

const study = [
  { title: "Focus Timer", url: "/focus", icon: Timer, badge: null },
  { title: "Mock Test", url: "/mock-test", icon: FlaskConical, badge: null },
  { title: "Micro-Goals", url: "/micro-goals", icon: Atom, badge: null },
  { title: "Homework", url: "/homework", icon: NotebookPen, badge: "3" },
  { title: "Exams", url: "/exams", icon: GraduationCap, badge: null },
  { title: "Goals", url: "/goals", icon: Target, badge: null },
  { title: "Doubts", url: "/doubts", icon: HelpCircle, badge: "2" },
  { title: "Reflections", url: "/reflections", icon: Sparkles, badge: null },
];

const insight = [
  { title: "AI Coach", url: "/coach", icon: Brain, badge: "new" },
  { title: "Challenges", url: "/challenges", icon: Swords, badge: null },
  { title: "Notifications", url: "/notifications", icon: Bell, badge: "5" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, badge: null },
  { title: "Rewards", url: "/rewards", icon: Trophy, badge: null },
];

/* ─── types ─────────────────────────────────────────────────────── */
interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge: string | null;
}

/* ─── component ─────────────────────────────────────────────────── */
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile } = useProfile();

  const xpToNext = 1000;
  const xpProgress = ((profile?.xp ?? 0) % xpToNext) / xpToNext * 100;

  /* ── single nav item ── */
  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.url;

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            className={cn(
              // base
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5",
              "text-sm font-medium transition-all duration-200",
              // idle
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent/60",
              // active
              isActive && [
                "bg-primary/10 text-primary",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
              ]
            )}
          >
            {/* active indicator bar */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
            )}

            {/* icon */}
            <item.icon
              className={cn(
                "w-4 h-4 shrink-0 transition-transform duration-200",
                "group-hover:scale-110",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />

            {/* label + badge */}
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.title}</span>

                {item.badge && (
                  <Badge
                    variant={item.badge === "new" ? "default" : "secondary"}
                    className={cn(
                      "h-4 min-w-4 px-1 text-[10px] font-bold leading-none",
                      item.badge === "new"
                        ? "bg-primary/20 text-primary border-0"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}

                {/* hover arrow */}
                <ChevronRight
                  className={cn(
                    "w-3 h-3 opacity-0 -translate-x-1 transition-all duration-200",
                    "group-hover:opacity-40 group-hover:translate-x-0",
                    isActive && "hidden"
                  )}
                />
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  /* ── section label ── */
  const SectionLabel = ({ label }: { label: string }) =>
    collapsed ? (
      <div className="my-2 h-px bg-border/60 mx-2" />
    ) : (
      <SidebarGroupLabel className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </SidebarGroupLabel>
    );

  /* ─────────────────────────────────────────────────── render ─── */
  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-sidebar-border/60",
        "bg-sidebar backdrop-blur-xl",
        "transition-all duration-300"
      )}
    >
      {/* ── Header ── */}
      <SidebarHeader className="px-3 py-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame className="w-4 h-4 text-primary-foreground" />
            </div>
            {/* online dot */}
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
                <span className="text-[11px] text-muted-foreground">
                  Lv {profile?.level ?? 1}
                </span>
                <span className="text-[11px] text-muted-foreground/40">·</span>
                <span className="text-[11px] font-semibold text-primary">
                  {profile?.xp ?? 0} XP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* XP Progress bar — expanded only */}
        {!collapsed && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>XP Progress</span>
              <span>{Math.round(xpProgress)}%</span>
            </div>
            <Progress
              value={xpProgress}
              className="h-1.5 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500"
            />
            {profile?.identity_label && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  {profile.identity_label}
                </span>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-2 py-3 gap-0">
        {/* Workspace */}
        <SidebarGroup className="p-0 mb-2">
          <SectionLabel label="Workspace" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {main.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Study */}
        <SidebarGroup className="p-0 mb-2">
          <SectionLabel label="Study" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {study.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Insights */}
        <SidebarGroup className="p-0">
          <SectionLabel label="Insights" />
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {insight.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer streak card ── */}
      {!collapsed && (
        <SidebarFooter className="px-3 py-3 border-t border-sidebar-border/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-500/30">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground">
                {profile?.streak ?? 0} Day Streak 🔥
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