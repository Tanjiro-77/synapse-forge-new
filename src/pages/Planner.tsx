import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Trash2,
  CalendarDays,
  Flag,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit3,
  Calendar,
  Target,
  TrendingUp,
} from "lucide-react";
import { format, addDays, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const MAX_TASK_LENGTH = 200;

const PRIORITY_CONFIG = {
  low: {
    label: "Low",
    icon: Flag,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted",
  },
  medium: {
    label: "Medium",
    icon: Flag,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  high: {
    label: "High",
    icon: Flag,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  task_date: string;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const usePlanner = (userId: string | undefined, date: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("planner_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("task_date", date)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setTasks(data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return { tasks, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const TaskSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <Skeleton className="w-4 h-4 rounded" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-5 w-16 rounded-full" />
    <Skeleton className="w-8 h-8 rounded-lg" />
  </div>
);

/* ── Empty state ── */
const EmptyState = ({ date }: { date: string }) => {
  const dateObj = parseISO(date);
  const label = isToday(dateObj)
    ? "today"
    : isTomorrow(dateObj)
      ? "tomorrow"
      : isYesterday(dateObj)
        ? "yesterday"
        : format(dateObj, "MMM d");

  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <CalendarDays className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base mb-1">No tasks {label}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        Add your first task to plan your day and stay focused.
      </p>
    </div>
  );
};

/* ── Date navigation ── */
interface DateNavProps {
  date: string;
  onChange: (date: string) => void;
}

const DateNav = ({ date, onChange }: DateNavProps) => {
  const dateObj = parseISO(date);
  const displayLabel = isToday(dateObj)
    ? "Today"
    : isTomorrow(dateObj)
      ? "Tomorrow"
      : isYesterday(dateObj)
        ? "Yesterday"
        : format(dateObj, "EEEE, MMM d");

  const shift = (days: number) => {
    const newDate = format(addDays(dateObj, days), "yyyy-MM-dd");
    onChange(newDate);
  };

  const goToToday = () => {
    onChange(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => shift(-1)}
            className="h-9 rounded-lg gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          <Input
            type="date"
            value={date}
            onChange={(e) => onChange(e.target.value)}
            className="w-36 sm:w-44 h-9 rounded-lg"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => shift(1)}
            className="h-9 rounded-lg gap-1.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Center label */}
        <div className="flex items-center gap-2 order-first sm:order-none w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{displayLabel}</span>
        </div>

        {/* Today button */}
        {!isToday(dateObj) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-9 rounded-lg"
          >
            Today
          </Button>
        )}
      </div>
    </Card>
  );
};

/* ── Add task form ── */
interface AddTaskFormProps {
  onAdd: (title: string, priority: Priority) => Promise<void>;
}

const AddTaskForm = ({ onAdd }: AddTaskFormProps) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(title.trim(), priority);
      setTitle("");
      setPriority("medium");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
        <Input
          placeholder="Add a study task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TASK_LENGTH}
          disabled={submitting}
          className="flex-1 min-w-[200px] h-10 rounded-lg"
          autoFocus
        />

        <Select
          value={priority}
          onValueChange={(v: Priority) => setPriority(v)}
          disabled={submitting}
        >
          <SelectTrigger className="w-32 h-10 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3 h-3", config.color)} />
                    {config.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          disabled={submitting || !title.trim()}
          className="gap-2 h-10 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </form>

      <p className="text-[11px] text-muted-foreground mt-2">
        {title.length}/{MAX_TASK_LENGTH} characters
      </p>
    </Card>
  );
};

/* ── Priority badge ── */
const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  if (priority === "low") return null; // Don't show low priority badge

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 h-6", config.bgColor, config.borderColor, config.color)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

/* ── Task item ── */
interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const TaskItem = ({ task, onToggle, onDelete }: TaskItemProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-xl",
        "hover:bg-muted/40 active:bg-muted/60",
        "transition-all duration-150 group",
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task)}
        className="shrink-0"
        aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
      />

      {/* Title */}
      <span
        className={cn(
          "flex-1 text-sm leading-relaxed break-words",
          "transition-colors duration-200",
          task.completed && "line-through text-muted-foreground",
        )}
      >
        {task.title}
      </span>

      {/* Priority badge */}
      {!task.completed && <PriorityBadge priority={task.priority} />}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-8 h-8 shrink-0 rounded-lg",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-destructive/10 hover:text-destructive",
        )}
        onClick={() => onDelete(task)}
        aria-label={`Delete "${task.title}"`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  task: Task | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ task, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!task} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Delete Task?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Are you sure you want to delete <strong>"{task?.title}"</strong>? This action cannot be
          undone.
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

/* ── Stats summary ── */
interface StatsSummaryProps {
  total: number;
  completed: number;
}

const StatsSummary = ({ total, completed }: StatsSummaryProps) => {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  return (
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
          Done
        </div>
        <div className="text-2xl font-bold tabular-nums text-emerald-600">{completed}</div>
      </Card>

      <Card className="p-3 border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
          <Circle className="w-3 h-3" />
          Left
        </div>
        <div className="text-2xl font-bold tabular-nums text-blue-600">{remaining}</div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Planner = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { tasks, loading, reload } = usePlanner(user?.id, date);

  const [toDelete, setToDelete] = useState<Task | null>(null);

  useEffect(() => {
    document.title = "Planner · Synapse Forge";
  }, []);

  /* ── Add task ── */
  const handleAdd = async (title: string, priority: Priority) => {
    if (!user) return;

    const { error } = await supabase.from("planner_tasks").insert({
      user_id: user.id,
      title,
      task_date: date,
      priority,
    });

    if (error) {
      toast.error(error.message ?? "Failed to add task");
      throw error;
    }

    toast.success("Task added");
    reload();
  };

  /* ── Toggle completion ── */
  const handleToggle = async (task: Task) => {
    const newValue = !task.completed;
    const { error } = await supabase
      .from("planner_tasks")
      .update({ completed: newValue })
      .eq("id", task.id);

    if (error) {
      toast.error(error.message ?? "Failed to update task");
    } else {
      toast.success(newValue ? "Task completed! 🎉" : "Task marked incomplete");
      reload();
    }
  };

  /* ── Delete task ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("planner_tasks").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete task");
    } else {
      toast.success("Task deleted");
      reload();
    }

    setToDelete(null);
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const highPriority = tasks.filter((t) => t.priority === "high" && !t.completed).length;

    return { total, completed, highPriority };
  }, [tasks]);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Daily Planner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a focused, intentional day
          {stats.total > 0 && (
            <>
              {" · "}
              {stats.completed}/{stats.total} complete
            </>
          )}
        </p>
      </div>

      {/* Date navigation */}
      <DateNav date={date} onChange={setDate} />

      {/* Stats summary (only if tasks exist) */}
      {!loading && tasks.length > 0 && <StatsSummary total={stats.total} completed={stats.completed} />}

      {/* Add task form */}
      <AddTaskForm onAdd={handleAdd} />

      {/* Progress bar (if tasks exist) */}
      {!loading && tasks.length > 0 && (
        <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Daily Progress</span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round((stats.completed / stats.total) * 100)}%
            </span>
          </div>
          <Progress
            value={(stats.completed / stats.total) * 100}
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500 [&>div]:transition-all [&>div]:duration-700"
          />
        </Card>
      )}

      {/* Task list */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-2 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <TaskSkeleton key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState date={date} />
        ) : (
          <div className="p-2 space-y-1">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={setToDelete}
              />
            ))}
          </div>
        )}
      </Card>

      {/* High priority alert (if any incomplete high-priority tasks) */}
      {!loading && stats.highPriority > 0 && (
        <Card className="p-4 border-red-500/30 bg-red-500/5 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-red-600">
                {stats.highPriority} high-priority {stats.highPriority === 1 ? "task" : "tasks"}{" "}
                pending
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Focus on these first to maximize your productivity today.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Delete confirmation */}
      <DeleteDialog task={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Planner;