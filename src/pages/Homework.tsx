import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Trash2,
  NotebookPen,
  Edit3,
  Calendar,
  Flag,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  XCircle,
} from "lucide-react";
import { format, parseISO, isPast, isFuture, differenceInDays, isToday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-muted" },
  medium: { label: "Medium", color: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  high: { label: "High", color: "text-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
} as const;

type Priority = keyof typeof PRIORITY_CONFIG;
type FilterTab = "all" | "active" | "completed";

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: Priority;
  completed: boolean;
  subject_id: string | null;
  created_at: string;
  subjects?: {
    name: string;
    color: string;
  };
}

interface HomeworkFormData {
  title: string;
  description: string;
  due_date: string;
  subject_id: string;
  priority: Priority;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useHomeworkData = (userId: string | undefined) => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [{ data: hwData }, { data: subjectsData }] = await Promise.all([
        supabase
          .from("homework")
          .select("*, subjects(name, color)")
          .eq("user_id", userId)
          .order("due_date", { nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("subjects")
          .select("id, name, color")
          .eq("user_id", userId)
          .order("name"),
      ]);

      setHomework(hwData ?? []);
      setSubjects(subjectsData ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load homework");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { homework, subjects, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const HomeworkCardSkeleton = () => (
  <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="flex items-start gap-3">
      <Skeleton className="w-4 h-4 rounded mt-1" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
  </Card>
);

/* ── Empty state ── */
const EmptyState = ({ filter, onAdd }: { filter: FilterTab; onAdd: () => void }) => {
  const messages = {
    all: {
      title: "No homework yet",
      description: "Add your first assignment to start tracking deadlines.",
    },
    active: {
      title: "All caught up!",
      description: "No active assignments right now. Great work!",
    },
    completed: {
      title: "No completed assignments",
      description: "Assignments you complete will appear here.",
    },
  };

  const msg = messages[filter];

  return (
    <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <NotebookPen className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{msg.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
        {msg.description}
      </p>
      {filter === "all" && (
        <Button onClick={onAdd} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          Add assignment
        </Button>
      )}
    </Card>
  );
};

/* ── Stats summary ── */
interface StatsSummaryProps {
  total: number;
  completed: number;
  overdue: number;
  dueToday: number;
}

const StatsSummary = ({ total, completed, overdue, dueToday }: StatsSummaryProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      <Card className="p-3 border-red-500/20 bg-red-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-red-600 mb-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </div>
        <div className="text-2xl font-bold tabular-nums text-red-600">{overdue}</div>
      </Card>

      <Card className="p-3 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-amber-600 mb-1">
          <Clock className="w-3 h-3" />
          Due Today
        </div>
        <div className="text-2xl font-bold tabular-nums text-amber-600">{dueToday}</div>
      </Card>
    </div>
  );
};

/* ── Homework card ── */
interface HomeworkCardProps {
  homework: Homework;
  onToggle: (homework: Homework) => void;
  onEdit: (homework: Homework) => void;
  onDelete: (homework: Homework) => void;
}

const HomeworkCard = ({ homework, onToggle, onEdit, onDelete }: HomeworkCardProps) => {
  const isOverdue =
    homework.due_date && !homework.completed && isPast(parseISO(homework.due_date));
  const isDueToday = homework.due_date && isToday(parseISO(homework.due_date));
  const priorityConfig = PRIORITY_CONFIG[homework.priority];

  const getDaysLabel = () => {
    if (!homework.due_date) return null;
    const dueDate = parseISO(homework.due_date);
    if (isToday(dueDate)) return "Due today";
    if (isPast(dueDate)) {
      const days = Math.abs(differenceInDays(new Date(), dueDate));
      return `${days}d overdue`;
    }
    const days = differenceInDays(dueDate, new Date());
    return `${days}d left`;
  };

  return (
    <Card
      className={cn(
        "p-4 group border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-md transition-all duration-200",
        isOverdue && "border-red-500/40 bg-red-500/5",
        isDueToday && !isOverdue && "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={homework.completed}
          onCheckedChange={() => onToggle(homework)}
          className="mt-1 shrink-0"
          aria-label={`Mark "${homework.title}" as ${homework.completed ? "incomplete" : "complete"}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex flex-wrap items-start gap-2 mb-1">
            <h3
              className={cn(
                "font-semibold text-sm leading-tight break-words",
                homework.completed && "line-through text-muted-foreground",
              )}
            >
              {homework.title}
            </h3>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {/* Subject badge */}
            {homework.subjects && (
              <Badge variant="outline" className="h-5 text-xs gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: homework.subjects.color }}
                />
                {homework.subjects.name}
              </Badge>
            )}

            {/* Priority badge (only for high/medium) */}
            {homework.priority !== "low" && (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 text-xs gap-1.5",
                  priorityConfig.bgColor,
                  priorityConfig.borderColor,
                  priorityConfig.color,
                )}
              >
                <Flag className="w-2.5 h-2.5" />
                {priorityConfig.label}
              </Badge>
            )}

            {/* Overdue badge */}
            {isOverdue && (
              <Badge variant="default" className="h-5 text-xs gap-1.5 bg-red-500">
                <AlertTriangle className="w-2.5 h-2.5" />
                Overdue
              </Badge>
            )}

            {/* Due date label */}
            {homework.due_date && !homework.completed && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{getDaysLabel()}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {homework.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
              {homework.description}
            </p>
          )}

          {/* Due date (full) */}
          {homework.due_date && (
            <p className="text-xs text-muted-foreground mt-2">
              Due: {format(parseISO(homework.due_date), "EEEE, MMM d, yyyy")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-muted"
            onClick={() => onEdit(homework)}
            aria-label={`Edit ${homework.title}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(homework)}
            aria-label={`Delete ${homework.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

/* ── Create/Edit dialog ── */
interface HomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework: Homework | null;
  subjects: Subject[];
  onSave: (data: HomeworkFormData) => Promise<void>;
}

const HomeworkDialog = ({ open, onOpenChange, homework, subjects, onSave }: HomeworkDialogProps) => {
  const [form, setForm] = useState<HomeworkFormData>({
    title: "",
    description: "",
    due_date: "",
    subject_id: "",
    priority: "medium",
  });
  const [submitting, setSubmitting] = useState(false);

  // Sync form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        title: homework?.title ?? "",
        description: homework?.description ?? "",
        due_date: homework?.due_date ?? "",
        subject_id: homework?.subject_id ?? "",
        priority: homework?.priority ?? "medium",
      });
    }
  }, [open, homework]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(form);
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
          Add Assignment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{homework ? "Edit Assignment" : "New Assignment"}</DialogTitle>
          <DialogDescription>
            {homework ? "Update assignment details." : "Create a new homework assignment."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="hw-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="hw-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Math homework Chapter 5"
              maxLength={MAX_TITLE_LENGTH}
              required
              autoFocus
              className="rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              {form.title.length}/{MAX_TITLE_LENGTH}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="hw-desc" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="hw-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details, notes, or requirements..."
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={3}
              className="rounded-xl resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {form.description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          {/* Due date & Priority */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-due" className="text-sm font-medium">
                Due date <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="hw-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hw-priority" className="text-sm font-medium">
                Priority
              </Label>
              <Select
                value={form.priority}
                onValueChange={(v: Priority) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger id="hw-priority" className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className={config.color}>{config.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="hw-subject" className="text-sm font-medium">
              Subject <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={form.subject_id || "none"}
              onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}
            >
              <SelectTrigger id="hw-subject" className="rounded-xl h-11">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No subject</span>
                </SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
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
            <Button type="submit" disabled={submitting || !form.title.trim()} className="rounded-xl gap-2">
              {submitting ? "Saving..." : homework ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  homework: Homework | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ homework, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!homework} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Delete Assignment?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Are you sure you want to delete <strong>"{homework?.title}"</strong>? This action cannot be
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

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Homework = () => {
  const { user } = useAuth();
  const { homework, subjects, loading, reload } = useHomeworkData(user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [toDelete, setToDelete] = useState<Homework | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    document.title = "Homework · Synapse Forge";
  }, []);

  /* ── Create/Update homework ── */
  const handleSave = async (data: HomeworkFormData) => {
    if (!user) return;

    if (editing) {
      // Update
      const { error } = await supabase
        .from("homework")
        .update({
          title: data.title.trim(),
          description: data.description.trim() || null,
          due_date: data.due_date || null,
          subject_id: data.subject_id || null,
          priority: data.priority,
        })
        .eq("id", editing.id);

      if (error) {
        toast.error(error.message ?? "Failed to update assignment");
        throw error;
      }

      toast.success("Assignment updated");
    } else {
      // Create
      const { error } = await supabase.from("homework").insert({
        user_id: user.id,
        title: data.title.trim(),
        description: data.description.trim() || null,
        due_date: data.due_date || null,
        subject_id: data.subject_id || null,
        priority: data.priority,
      });

      if (error) {
        toast.error(error.message ?? "Failed to create assignment");
        throw error;
      }

      toast.success("Assignment added");
    }

    reload();
    setEditing(null);
  };

  /* ── Toggle completion ── */
  const handleToggle = async (hw: Homework) => {
    const newValue = !hw.completed;
    const { error } = await supabase
      .from("homework")
      .update({ completed: newValue })
      .eq("id", hw.id);

    if (error) {
      toast.error(error.message ?? "Failed to update status");
    } else {
      toast.success(newValue ? "Assignment completed! 🎉" : "Marked as incomplete");
      reload();
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("homework").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete assignment");
    } else {
      toast.success("Assignment deleted");
      reload();
    }

    setToDelete(null);
  };

  /* ── Edit ── */
  const handleEdit = (hw: Homework) => {
    setEditing(hw);
    setDialogOpen(true);
  };

  /* ── Open new dialog ── */
  const handleOpenNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  /* ── Filtered & grouped homework ── */
  const filteredHomework = useMemo(() => {
    if (filter === "all") return homework;
    if (filter === "completed") return homework.filter((h) => h.completed);
    if (filter === "active") return homework.filter((h) => !h.completed);
    return homework;
  }, [homework, filter]);

  const groupedHomework = useMemo(() => {
    const overdue: Homework[] = [];
    const today: Homework[] = [];
    const upcoming: Homework[] = [];
    const noDue: Homework[] = [];
    const completed: Homework[] = [];

    filteredHomework.forEach((hw) => {
      if (hw.completed) {
        completed.push(hw);
      } else if (!hw.due_date) {
        noDue.push(hw);
      } else {
        const dueDate = parseISO(hw.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) {
          overdue.push(hw);
        } else if (isToday(dueDate)) {
          today.push(hw);
        } else {
          upcoming.push(hw);
        }
      }
    });

    return { overdue, today, upcoming, noDue, completed };
  }, [filteredHomework]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = homework.length;
    const completed = homework.filter((h) => h.completed).length;
    const overdue = homework.filter(
      (h) => h.due_date && !h.completed && isPast(parseISO(h.due_date)) && !isToday(parseISO(h.due_date)),
    ).length;
    const dueToday = homework.filter(
      (h) => h.due_date && !h.completed && isToday(parseISO(h.due_date)),
    ).length;

    return { total, completed, overdue, dueToday };
  }, [homework]);

  /* ── Render section ── */
  const renderSection = (title: string, items: Homework[], icon: React.ElementType) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          {React.createElement(icon, { className: "w-4 h-4" })}
          {title} ({items.length})
        </h2>
        <div className="space-y-2">
          {items.map((hw) => (
            <HomeworkCard
              key={hw.id}
              homework={hw}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={setToDelete}
            />
          ))}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Homework</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                {stats.total > 0
                  ? `${stats.total} ${stats.total === 1 ? "assignment" : "assignments"} · ${stats.completed} completed`
                  : "Track assignments and deadlines"}
              </>
            )}
          </p>
        </div>

        <HomeworkDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          homework={editing}
          subjects={subjects}
          onSave={handleSave}
        />
      </div>

      {/* Stats */}
      {!loading && homework.length > 0 && <StatsSummary {...stats} />}

      {/* Filter tabs */}
      {!loading && homework.length > 0 && (
        <Tabs value={filter} onValueChange={(v: FilterTab) => setFilter(v)}>
          <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">
              All
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg">
              Active
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <HomeworkCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredHomework.length === 0 ? (
        <EmptyState filter={filter} onAdd={handleOpenNew} />
      ) : (
        <div className="space-y-6">
          {renderSection("Overdue", groupedHomework.overdue, AlertTriangle)}
          {renderSection("Due Today", groupedHomework.today, Clock)}
          {renderSection("Upcoming", groupedHomework.upcoming, Calendar)}
          {renderSection("No Due Date", groupedHomework.noDue, Target)}
          {filter !== "active" && renderSection("Completed", groupedHomework.completed, CheckCircle2)}
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteDialog homework={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Homework;