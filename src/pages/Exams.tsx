import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
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
  GraduationCap,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { differenceInDays, format, parseISO, isPast, isFuture, isToday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const MAX_TITLE_LENGTH = 150;
const MAX_NOTES_LENGTH = 500;

type FilterTab = "all" | "upcoming" | "past";

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Exam {
  id: string;
  title: string;
  exam_date: string;
  subject_id: string | null;
  notes: string | null;
  syllabus_completion: number;
  created_at: string;
  subjects?: {
    name: string;
    color: string;
  };
}

interface ExamFormData {
  title: string;
  exam_date: string;
  subject_id: string;
  notes: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useExamsData = (userId: string | undefined) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [{ data: examsData }, { data: subjectsData }] = await Promise.all([
        supabase
          .from("exams")
          .select("*, subjects(name, color)")
          .eq("user_id", userId)
          .order("exam_date", { ascending: true }),
        supabase
          .from("subjects")
          .select("id, name, color")
          .eq("user_id", userId)
          .order("name"),
      ]);

      setExams(examsData ?? []);
      setSubjects(subjectsData ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { exams, subjects, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const ExamCardSkeleton = () => (
  <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-20" />
      <Skeleton className="h-3 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-6 w-full rounded-lg" />
      </div>
    </div>
  </Card>
);

/* ── Empty state ── */
const EmptyState = ({ filter, onAdd }: { filter: FilterTab; onAdd: () => void }) => {
  const messages = {
    all: {
      title: "No exams scheduled",
      description: "Add your first exam to start tracking deadlines and syllabus completion.",
    },
    upcoming: {
      title: "No upcoming exams",
      description: "All your exams are in the past. Add new ones as they're scheduled.",
    },
    past: {
      title: "No past exams",
      description: "Exams that have passed will appear here.",
    },
  };

  const msg = messages[filter];

  return (
    <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <GraduationCap className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{msg.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
        {msg.description}
      </p>
      {filter === "all" && (
        <Button onClick={onAdd} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          Add exam
        </Button>
      )}
    </Card>
  );
};

/* ── Stats summary ── */
interface StatsSummaryProps {
  total: number;
  upcoming: number;
  urgent: number;
  avgCompletion: number;
}

const StatsSummary = ({ total, upcoming, urgent, avgCompletion }: StatsSummaryProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Target className="w-3 h-3" />
          Total
        </div>
        <div className="text-2xl font-bold tabular-nums">{total}</div>
      </Card>

      <Card className="p-3 border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
          <Calendar className="w-3 h-3" />
          Upcoming
        </div>
        <div className="text-2xl font-bold tabular-nums text-blue-600">{upcoming}</div>
      </Card>

      <Card className="p-3 border-red-500/20 bg-red-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-red-600 mb-1">
          <AlertTriangle className="w-3 h-3" />
          Urgent
        </div>
        <div className="text-2xl font-bold tabular-nums text-red-600">{urgent}</div>
      </Card>

      <Card className="p-3 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-emerald-600 mb-1">
          <TrendingUp className="w-3 h-3" />
          Avg Ready
        </div>
        <div className="text-2xl font-bold tabular-nums text-emerald-600">{avgCompletion}%</div>
      </Card>
    </div>
  );
};

/* ── Exam card ── */
interface ExamCardProps {
  exam: Exam;
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
  onUpdateProgress: (id: string, value: number) => void;
}

const ExamCard = ({ exam, onEdit, onDelete, onUpdateProgress }: ExamCardProps) => {
  const examDate = parseISO(exam.exam_date);
  const daysLeft = differenceInDays(examDate, new Date());
  const isUpcoming = isFuture(examDate) || isToday(examDate);
  const isUrgent = daysLeft >= 0 && daysLeft <= 7;
  const hasPassed = isPast(examDate) && !isToday(examDate);

  const getDaysLabel = () => {
    if (hasPassed) return "Completed";
    if (isToday(examDate)) return "Today!";
    if (daysLeft === 1) return "Tomorrow";
    return `${daysLeft} days`;
  };

  const getProgressColor = () => {
    if (exam.syllabus_completion >= 80) return "text-emerald-600";
    if (exam.syllabus_completion >= 50) return "text-blue-600";
    return "text-amber-600";
  };

  return (
    <Card
      className={cn(
        "p-5 group border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-lg transition-all duration-200",
        isUrgent && !hasPassed && "border-red-500/40 bg-red-500/5",
        isToday(examDate) && "border-amber-500/40 bg-amber-500/5",
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight break-words">{exam.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {exam.subjects && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: exam.subjects.color }}
                />
                <span className="text-xs font-medium" style={{ color: exam.subjects.color }}>
                  {exam.subjects.name}
                </span>
              </div>
            )}
            {isUrgent && !hasPassed && (
              <Badge variant="outline" className="h-5 text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                Urgent
              </Badge>
            )}
            {hasPassed && (
              <Badge variant="outline" className="h-5 text-[10px] bg-muted text-muted-foreground">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                Past
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-muted"
            onClick={() => onEdit(exam)}
            aria-label={`Edit ${exam.title}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(exam)}
            aria-label={`Delete ${exam.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Countdown */}
      <div
        className={cn(
          "text-4xl font-extrabold tabular-nums mb-1",
          hasPassed
            ? "text-muted-foreground"
            : isUrgent
              ? "text-red-600"
              : "bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent",
        )}
      >
        {getDaysLabel()}
      </div>

      {/* Full date */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <Calendar className="w-3 h-3" />
        {format(examDate, "EEEE, MMM d, yyyy")}
      </div>

      {/* Syllabus progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Syllabus Coverage</span>
          <span className={cn("font-bold tabular-nums", getProgressColor())}>
            {exam.syllabus_completion}%
          </span>
        </div>

        <Progress
          value={exam.syllabus_completion}
          className="h-2 [&>div]:transition-all [&>div]:duration-500"
        />

        <Slider
          value={[exam.syllabus_completion]}
          max={100}
          step={5}
          onValueChange={(v) => onUpdateProgress(exam.id, v[0])}
          className="py-2"
        />
      </div>

      {/* Notes */}
      {exam.notes && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground italic line-clamp-2 leading-relaxed">
            {exam.notes}
          </p>
        </div>
      )}
    </Card>
  );
};

/* ── Create/Edit dialog ── */
interface ExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Exam | null;
  subjects: Subject[];
  onSave: (data: ExamFormData) => Promise<void>;
}

const ExamDialog = ({ open, onOpenChange, exam, subjects, onSave }: ExamDialogProps) => {
  const [form, setForm] = useState<ExamFormData>({
    title: "",
    exam_date: "",
    subject_id: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Sync form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        title: exam?.title ?? "",
        exam_date: exam?.exam_date ?? "",
        subject_id: exam?.subject_id ?? "",
        notes: exam?.notes ?? "",
      });
    }
  }, [open, exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Exam title is required");
      return;
    }

    if (!form.exam_date) {
      toast.error("Exam date is required");
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
          Add Exam
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{exam ? "Edit Exam" : "New Exam"}</DialogTitle>
          <DialogDescription>
            {exam
              ? "Update exam details and track your preparation progress."
              : "Add a new exam to track deadlines and syllabus completion."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="exam-title" className="text-sm font-medium">
              Exam Title
            </Label>
            <Input
              id="exam-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Mathematics Final Exam"
              maxLength={MAX_TITLE_LENGTH}
              required
              autoFocus
              className="rounded-xl h-11"
            />
            <p className="text-xs text-muted-foreground">
              {form.title.length}/{MAX_TITLE_LENGTH}
            </p>
          </div>

          {/* Date & Subject */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-date" className="text-sm font-medium">
                Exam Date
              </Label>
              <Input
                id="exam-date"
                type="date"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-subject" className="text-sm font-medium">
                Subject <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select
                value={form.subject_id || "none"}
                onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}
              >
                <SelectTrigger id="exam-subject" className="rounded-xl h-11">
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
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="exam-notes" className="text-sm font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="exam-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Topics, chapters, or reminders..."
              maxLength={MAX_NOTES_LENGTH}
              rows={3}
              className="rounded-xl resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {form.notes.length}/{MAX_NOTES_LENGTH}
            </p>
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
            <Button
              type="submit"
              disabled={submitting || !form.title.trim() || !form.exam_date}
              className="rounded-xl gap-2"
            >
              {submitting ? "Saving..." : exam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  exam: Exam | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ exam, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!exam} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Delete Exam?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Are you sure you want to delete <strong>"{exam?.title}"</strong>? This action cannot be
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
const Exams = () => {
  const { user } = useAuth();
  const { exams, subjects, loading, reload } = useExamsData(user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [toDelete, setToDelete] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    document.title = "Exams · Synapse Forge";
  }, []);

  /* ── Create/Update exam ── */
  const handleSave = async (data: ExamFormData) => {
    if (!user) return;

    if (editing) {
      // Update
      const { error } = await supabase
        .from("exams")
        .update({
          title: data.title.trim(),
          exam_date: data.exam_date,
          subject_id: data.subject_id || null,
          notes: data.notes.trim() || null,
        })
        .eq("id", editing.id);

      if (error) {
        toast.error(error.message ?? "Failed to update exam");
        throw error;
      }

      toast.success("Exam updated");
    } else {
      // Create
      const { error } = await supabase.from("exams").insert({
        user_id: user.id,
        title: data.title.trim(),
        exam_date: data.exam_date,
        subject_id: data.subject_id || null,
        notes: data.notes.trim() || null,
      });

      if (error) {
        toast.error(error.message ?? "Failed to create exam");
        throw error;
      }

      toast.success("Exam added");
    }

    reload();
    setEditing(null);
  };

  /* ── Update progress ── */
  const handleUpdateProgress = async (id: string, value: number) => {
    const { error } = await supabase
      .from("exams")
      .update({ syllabus_completion: value })
      .eq("id", id);

    if (error) {
      toast.error(error.message ?? "Failed to update progress");
    } else {
      reload();
    }
  };

  /* ── Delete exam ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("exams").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete exam");
    } else {
      toast.success("Exam deleted");
      reload();
    }

    setToDelete(null);
  };

  /* ── Edit ── */
  const handleEdit = (exam: Exam) => {
    setEditing(exam);
    setDialogOpen(true);
  };

  /* ── Open new dialog ── */
  const handleOpenNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  /* ── Filtered exams ── */
  const filteredExams = useMemo(() => {
    if (filter === "all") return exams;
    if (filter === "upcoming")
      return exams.filter((e) => isFuture(parseISO(e.exam_date)) || isToday(parseISO(e.exam_date)));
    if (filter === "past")
      return exams.filter((e) => isPast(parseISO(e.exam_date)) && !isToday(parseISO(e.exam_date)));
    return exams;
  }, [exams, filter]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = exams.length;
    const upcoming = exams.filter(
      (e) => isFuture(parseISO(e.exam_date)) || isToday(parseISO(e.exam_date)),
    ).length;
    const urgent = exams.filter((e) => {
      const days = differenceInDays(parseISO(e.exam_date), new Date());
      return days >= 0 && days <= 7;
    }).length;
    const avgCompletion =
      total > 0
        ? Math.round(exams.reduce((sum, e) => sum + e.syllabus_completion, 0) / total)
        : 0;

    return { total, upcoming, urgent, avgCompletion };
  }, [exams]);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Exams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                {stats.total > 0
                  ? `${stats.total} ${stats.total === 1 ? "exam" : "exams"} · ${stats.upcoming} upcoming`
                  : "Track exam deadlines and syllabus completion"}
              </>
            )}
          </p>
        </div>

        <ExamDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          exam={editing}
          subjects={subjects}
          onSave={handleSave}
        />
      </div>

      {/* Stats */}
      {!loading && exams.length > 0 && <StatsSummary {...stats} />}

      {/* Filter tabs */}
      {!loading && exams.length > 0 && (
        <Tabs value={filter} onValueChange={(v: FilterTab) => setFilter(v)}>
          <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">
              All
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="rounded-lg">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg">
              Past
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ExamCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <EmptyState filter={filter} onAdd={handleOpenNew} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={handleEdit}
              onDelete={setToDelete}
              onUpdateProgress={handleUpdateProgress}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteDialog exam={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Exams;