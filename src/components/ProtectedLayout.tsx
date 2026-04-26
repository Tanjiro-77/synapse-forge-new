import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, SidebarIcon } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import {
  Flame, LogOut, Bell, Zap, ChevronDown,
  User, Settings, HelpCircle, Moon, Sun,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* ─── Loading Screen ──────────────────────────────────────────── */
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Flame className="w-7 h-7 text-primary animate-pulse" />
      </div>
      <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
    </div>
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm font-semibold text-foreground">Synapse Forge</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading your workspace…
      </p>
    </div>
  </div>
);

/* ─── Streak Pill ─────────────────────────────────────────────── */
const StreakPill = ({ streak }: { streak: number }) => (
  <div className={cn(
    "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full",
    "bg-gradient-to-r from-orange-500/10 to-red-500/10",
    "border border-orange-500/20",
    "transition-all duration-200 hover:border-orange-500/40 hover:from-orange-500/15 hover:to-red-500/15",
  )}>
    <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
    <span className="text-sm font-bold text-foreground tabular-nums">{streak}</span>
    <span className="text-xs text-muted-foreground">
      {streak === 1 ? "day" : "days"}
    </span>
  </div>
);

/* ─── XP Chip ─────────────────────────────────────────────────── */
const XpChip = ({ xp, level }: { xp: number; level: number }) => (
  <div className={cn(
    "hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full",
    "bg-primary/8 border border-primary/15",
    "transition-all duration-200 hover:bg-primary/12",
  )}>
    <Zap className="w-3 h-3 text-primary shrink-0" />
    <span className="text-xs font-bold text-primary tabular-nums">{xp} XP</span>
    <span className="text-xs text-muted-foreground/60">·</span>
    <span className="text-xs text-muted-foreground">Lv {level}</span>
  </div>
);

/* ─── Notification Bell ───────────────────────────────────────── */
const NotifBell = ({ unread }: { unread: number }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className={cn(
          "relative w-9 h-9 rounded-xl",
          "hover:bg-accent transition-all duration-200",
          unread > 0 && "text-foreground",
        )}
      >
        <Link to="/notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5",
              "min-w-[18px] h-[18px] px-1 rounded-full",
              "bg-red-500 text-white",
              "text-[10px] font-bold",
              "flex items-center justify-center",
              "shadow-sm shadow-red-500/50",
              "animate-in zoom-in-50 duration-200",
            )}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">
      {unread > 0 ? `${unread} unread notifications` : "Notifications"}
    </TooltipContent>
  </Tooltip>
);

/* ─── User Menu ───────────────────────────────────────────────── */
const UserMenu = ({
  initials,
  name,
  email,
  identityLabel,
  onSignOut,
}: {
  initials: string;
  name: string;
  email: string;
  identityLabel?: string;
  onSignOut: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className={cn(
        "flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl",
        "hover:bg-accent transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group",
      )}>
        <Avatar className="w-7 h-7 border-2 border-primary/20 shrink-0">
          <AvatarFallback className={cn(
            "text-[11px] font-bold",
            "bg-gradient-to-br from-primary to-violet-600 text-primary-foreground",
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground hidden sm:block",
          "transition-transform duration-200 group-data-[state=open]:rotate-180",
        )} />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-56 rounded-xl shadow-xl border border-border/60 p-1"
    >
      {/* User info */}
      <DropdownMenuLabel className="px-2 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 border border-border shrink-0">
            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-violet-600 text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{email}</p>
          </div>
        </div>
        {identityLabel && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              {identityLabel}
            </Badge>
          </div>
        )}
      </DropdownMenuLabel>

      <DropdownMenuSeparator className="my-1" />

      <DropdownMenuGroup>
        <DropdownMenuItem asChild className="rounded-lg gap-2.5 py-2 cursor-pointer">
          <Link to="/profile">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg gap-2.5 py-2 cursor-pointer">
          <Link to="/settings">
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg gap-2.5 py-2 cursor-pointer">
          <Link to="/doubts">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">Help & Doubts</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="my-1" />

      <DropdownMenuItem
        onClick={onSignOut}
        className="rounded-lg gap-2.5 py-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="text-sm font-medium">Sign out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

/* ─── Divider ─────────────────────────────────────────────────── */
const HeaderDivider = () => (
  <div className="w-px h-5 bg-border/60 rounded-full" />
);

/* ═══════════════════════════════════════════════════════════════
   ProtectedLayout
═══════════════════════════════════════════════════════════════ */
export const ProtectedLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);

  /* ── realtime notifications ── */
  useEffect(() => {
    if (!user) return;

    const fetchUnread = () =>
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnread(count ?? 0));

    fetchUnread();

    const ch = supabase
      .channel(`notif-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  /* ── guards ── */
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;

  const initials = (profile?.display_name || user.email || "U").slice(0, 2).toUpperCase();
  const displayName = profile?.display_name || user.email?.split("@")[0] || "User";
  const email = user.email ?? "";

  /* ─────────────────────────────────────────────── render ── */
  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider defaultOpen>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <div className="flex-1 flex flex-col min-w-0">

            {/* ── Top Header ── */}
            <header className={cn(
              "h-14 sticky top-0 z-30",
              "flex items-center justify-between",
              "px-3 sm:px-5",
              "border-b border-border/50",
              "bg-background/80 backdrop-blur-xl",
              "supports-[backdrop-filter]:bg-background/60",
            )}>

              {/* Left — trigger + breadcrumb hint */}
              <div className="flex items-center gap-2">
                <SidebarTrigger className={cn(
                  "w-8 h-8 rounded-lg",
                  "hover:bg-accent transition-colors duration-200",
                  "text-muted-foreground hover:text-foreground",
                )} />
                <HeaderDivider />
                {/* Current page pill */}
                <PageBreadcrumb pathname={loc.pathname} />
              </div>

              {/* Right — actions */}
              <div className="flex items-center gap-2">
                {/* XP chip */}
                <XpChip xp={profile?.xp ?? 0} level={profile?.level ?? 1} />

                {/* Streak */}
                <StreakPill streak={profile?.current_streak ?? 0} />

                <HeaderDivider />

                {/* Notifications */}
                <NotifBell unread={unread} />

                {/* User menu */}
                <UserMenu
                  initials={initials}
                  name={displayName}
                  email={email}
                  identityLabel={profile?.identity_label}
                  onSignOut={signOut}
                />
              </div>
            </header>

            {/* ── Main Content ── */}
            <main className={cn(
              "flex-1 overflow-x-hidden",
              "p-4 sm:p-6",
              "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
            )}>
              {children}
            </main>

          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

/* ─── Page Breadcrumb ─────────────────────────────────────────── */
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/subjects": "Subjects",
  "/chapters": "Chapters",
  "/planner": "Planner",
  "/timetable": "Timetable",
  "/focus": "Focus Timer",
  "/mock-test": "Mock Test",
  "/micro-goals": "Micro-Goals",
  "/homework": "Homework",
  "/exams": "Exams",
  "/goals": "Goals",
  "/doubts": "Doubts",
  "/reflections": "Reflections",
  "/coach": "AI Coach",
  "/challenges": "Challenges",
  "/notifications": "Notifications",
  "/analytics": "Analytics",
  "/rewards": "Rewards",
  "/profile": "Profile",
  "/settings": "Settings",
};

const PageBreadcrumb = ({ pathname }: { pathname: string }) => {
  const label = routeLabels[pathname] ?? "Page";
  return (
    <span className="hidden sm:inline-block text-sm font-semibold text-foreground/80">
      {label}
    </span>
  );
};