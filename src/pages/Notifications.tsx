import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  Info,
  Sparkles,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════
   Constants — mapped to existing DB enum values
═══════════════════════════════════════════════════════════════ */
const KIND_CONFIG = {
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "Warning",
  },
  success: {
    icon: Sparkles,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    label: "Success",
  },
  info: {
    icon: Info,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    label: "Info",
  },
  error: {
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Error",
  },
} as const;

type NotificationKind = keyof typeof KIND_CONFIG;
type FilterTab = "all" | "unread" | "read";

const DEFAULT_KIND: NotificationKind = "info";
const NOTIFICATIONS_LIMIT = 50;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  kind: NotificationKind;
  read: boolean;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATIONS_LIMIT);

      if (error) throw error;
      setNotifications(data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return { notifications, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const NotificationSkeleton = () => (
  <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="flex items-start gap-3">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
    </div>
  </Card>
);

/* ── Empty state ── */
const EmptyState = ({ filter }: { filter: FilterTab }) => {
  const messages = {
    all: {
      title: "All clear!",
      description: "You have no notifications yet. They'll appear here when triggered.",
    },
    unread: {
      title: "Nothing unread",
      description: "You're all caught up! No unread notifications.",
    },
    read: {
      title: "No read notifications",
      description: "Notifications you've read will appear here.",
    },
  };

  const msg = messages[filter];

  return (
    <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <BellOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{msg.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        {msg.description}
      </p>
    </Card>
  );
};

/* ── Stats summary ── */
interface StatsBannerProps {
  total: number;
  unread: number;
}

const StatsBanner = ({ total, unread }: StatsBannerProps) => {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="w-4 h-4" />
        <span>{total} total</span>
      </div>
      {unread > 0 && (
        <Badge
          variant="secondary"
          className="h-6 gap-1.5 bg-primary/10 text-primary border-primary/20"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {unread} unread
        </Badge>
      )}
      {unread === 0 && (
        <Badge
          variant="secondary"
          className="h-6 gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        >
          <CheckCircle2 className="w-3 h-3" />
          All read
        </Badge>
      )}
    </div>
  );
};

/* ── Notification item ── */
interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}

const NotificationItem = ({ notification, onMarkRead, onDelete }: NotificationItemProps) => {
  const kindConfig = KIND_CONFIG[notification.kind] ?? KIND_CONFIG[DEFAULT_KIND];
  const Icon = kindConfig.icon;

  return (
    <Card
      className={cn(
        "p-4 border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-md transition-all duration-200 group",
        !notification.read && [
          "border-l-4",
          kindConfig.borderColor,
          "bg-card/80",
        ],
      )}
      onClick={() => !notification.read && onMarkRead(notification)}
      role={!notification.read ? "button" : undefined}
      tabIndex={!notification.read ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !notification.read) onMarkRead(notification);
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            kindConfig.bgColor,
          )}
        >
          <Icon className={cn("w-4 h-4", kindConfig.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span
              className={cn(
                "font-semibold text-sm leading-snug",
                !notification.read ? "text-foreground" : "text-foreground/80",
              )}
            >
              {notification.title}
            </span>

            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
            )}
          </div>

          {notification.body && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {notification.body}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground/60">
              {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
            </span>

            <Badge
              variant="outline"
              className={cn(
                "h-4 text-[10px] px-1.5 font-medium capitalize",
                kindConfig.bgColor,
                kindConfig.color,
                "border-0",
              )}
            >
              {kindConfig.label}
            </Badge>

            {notification.read && (
              <span className="text-xs text-muted-foreground/40 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />
                Read
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification);
              }}
              aria-label="Mark as read"
              title="Mark as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification);
            }}
            aria-label={`Delete notification: ${notification.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

/* ── Clear all dialog ── */
interface ClearAllDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  count: number;
}

const ClearAllDialog = ({ open, onConfirm, onCancel, count }: ClearAllDialogProps) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Clear All Notifications?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          This will permanently delete all{" "}
          <strong>{count}</strong> notifications. This action cannot be undone.
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
          Clear All
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Notifications = () => {
  const { user } = useAuth();
  const { notifications, loading, reload } = useNotifications(user?.id);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Notifications · Synapse Forge";
  }, []);

  /* ── Mark single as read ── */
  const handleMarkRead = async (notification: Notification) => {
    if (notification.read) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    if (error) {
      toast.error(error.message ?? "Failed to mark as read");
    } else {
      reload();
    }
  };

  /* ── Mark all as read ── */
  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user!.id)
      .eq("read", false);

    if (error) {
      toast.error(error.message ?? "Failed to mark all as read");
    } else {
      toast.success("All notifications marked as read");
      reload();
    }
  };

  /* ── Delete single ── */
  const handleDelete = async (notification: Notification) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete notification");
    } else {
      toast.success("Notification deleted");
      reload();
    }
  };

  /* ── Clear all ── */
  const handleClearAll = async () => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user!.id);

    if (error) {
      toast.error(error.message ?? "Failed to clear notifications");
    } else {
      toast.success("All notifications cleared");
      reload();
    }

    setClearDialogOpen(false);
  };

  /* ── Filtered list ── */
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    if (filter === "read") return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, filter]);

  /* ── Stats ── */
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="h-6 text-sm bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Smart, AI-powered nudges. Never spam.
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2 rounded-xl h-9"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearDialogOpen(true)}
              className="gap-2 rounded-xl h-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Stats banner */}
      {!loading && <StatsBanner total={notifications.length} unread={unreadCount} />}

      {/* Filter tabs */}
      {!loading && notifications.length > 0 && (
        <Tabs value={filter} onValueChange={(v: FilterTab) => setFilter(v)}>
          <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-1.5 h-4 text-[10px] px-1 bg-primary text-primary-foreground">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="rounded-lg">
              Read
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Clear all confirmation */}
      <ClearAllDialog
        open={clearDialogOpen}
        onConfirm={handleClearAll}
        onCancel={() => setClearDialogOpen(false)}
        count={notifications.length}
      />
    </div>
  );
};

export default Notifications;