import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  RotateCcw,
  BookMarked,
  NotebookPen,
  MoreVertical,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  Calendar,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { STATUS_LABEL, STATUS_COLOR, nextRevisionDate } from "@/lib/study";
import { toast } from "sonner";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const MAX_CHAPTER_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 2000;

const STATUS_ICONS: Record<string, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  needs_revision: RotateCcw,
};

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Chapter {
  id: string;
  name: string;
  notes: string | null;
  status: string;
  is_weak: boolean;
  subject_id: string;
  next_revision_at: string | null;
  last_revised_at: string | null;
  revision_stage: number;
  created_at: string;
  subjects?: {
    name: string;
    color: string;
  };
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useChaptersData = (userId: string | undefined, subjectFilter: string) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [{ data: subs }, { data: chaps }] = await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, color")
          .eq("user_id", userId)
          .order("name"),
        (async () => {
          let q = supabase
            .from("chapters")
            .select("*, subjects(name, color)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          if (subjectFilter !== "all") {
            q = q.eq("subject_id", subjectFilter);
          }

          return q;
        })(),
      ]);

      setSubjects(subs ?? []);
      setChapters(chaps ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load chapters");
    } finally {
      setLoading(false);
    }
  }, [userId, subjectFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return { subjects, chapters, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const ChapterCardSkeleton = () => (
  <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  </Card>
);

/* ── Empty state ── */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => (
  <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
      {description}
    </p>
    {action && (
      <Button onClick={action.onClick} className="gap-2 rounded-xl">
        <Plus className="w-4 h-4" />
        {action.label}
      </Button>
    )}
  </Card>
);

/* ── Status badge with icon ── */
const StatusBadge = ({ status }: { status: string }) => {
  const Icon = STATUS_ICONS[status] ?? Circle;
  return (
    <Badge variant="outline" className={cn("gap-1.5 h-6", STATUS_COLOR[status])}>
      <Icon className="w-3 h-3" />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
};

/* ── Chapter card (used when a single subject is filtered) ── */
interface ChapterCardProps {
  chapter: Chapter;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
  onStatusChange: (id: string, status: string) => void;
  onToggleWeak: (chapter: Chapter) => void;
  onScheduleRevision: (chapter: Chapter) => void;
}

const ChapterCard = ({
  chapter,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleWeak,
  onScheduleRevision,
}: ChapterCardProps) => {
  const isRevisionOverdue = chapter.next_revision_at
    ? isPast(parseISO(chapter.next_revision_at))
    : false;

  return (
    <Card
      className={cn(
        "p-4 group overflow-hidden",
        "border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-lg hover:shadow-black/5",
        "transition-all duration-200",
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        {/* Left — metadata */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-sm leading-tight break-words">{chapter.name}</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={chapter.status} />

            {chapter.is_weak && (
              <Badge variant="outline" className="gap-1.5 h-6 border-amber-500/40 text-amber-600 bg-amber-500/5">
                <AlertTriangle className="w-3 h-3" />
                Weak
              </Badge>
            )}

            {chapter.next_revision_at && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 h-6",
                  isRevisionOverdue
                    ? "border-red-500/40 text-red-600 bg-red-500/5"
                    : "border-primary/40 text-primary bg-primary/5",
                )}
              >
                <Calendar className="w-3 h-3" />
                {isRevisionOverdue ? "Overdue" : format(parseISO(chapter.next_revision_at), "MMM d")}
              </Badge>
            )}
          </div>

          {chapter.subjects && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: chapter.subjects.color }}
              />
              <span
                className="text-xs font-medium truncate"
                style={{ color: chapter.subjects.color }}
              >
                {chapter.subjects.name}
              </span>
            </div>
          )}

          {chapter.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {chapter.notes}
            </p>
          )}
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Select value={chapter.status} onValueChange={(v) => onStatusChange(chapter.id, v)}>
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([value, label]) => {
                const Icon = STATUS_ICONS[value] ?? Circle;
                return (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3" />
                      {label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(chapter)} className="gap-2 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleWeak(chapter)} className="gap-2 cursor-pointer">
                <AlertTriangle className="w-3.5 h-3.5" />
                {chapter.is_weak ? "Mark as strong" : "Mark as weak"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScheduleRevision(chapter)} className="gap-2 cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" />
                Schedule revision
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(chapter)}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

/* ── Subject Table — groups chapters under a collapsible subject header ── */
interface SubjectTableProps {
  subject: Subject;
  chapters: Chapter[];
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
  onStatusChange: (id: string, status: string) => void;
  onToggleWeak: (chapter: Chapter) => void;
  onScheduleRevision: (chapter: Chapter) => void;
}

const SubjectTable = ({
  subject,
  chapters,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleWeak,
  onScheduleRevision,
}: SubjectTableProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = chapters.filter((c) => c.status === "completed").length;
  const weakCount = chapters.filter((c) => c.is_weak).length;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/40 backdrop-blur-sm">
      {/* Subject header row */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        {/* Colour dot */}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: subject.color }}
        />

        {/* Subject name */}
        <span className="font-semibold text-sm flex-1" style={{ color: subject.color }}>
          {subject.name}
        </span>

        {/* Mini stats */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{chapters.length} chapter{chapters.length !== 1 ? "s" : ""}</span>
          {completedCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] gap-1 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {completedCount} done
            </Badge>
          )}
          {weakCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] gap-1 border-amber-500/40 text-amber-600 bg-amber-500/5">
              <AlertTriangle className="w-2.5 h-2.5" />
              {weakCount} weak
            </Badge>
          )}
        </div>

        {/* Collapse chevron */}
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Chapter rows */}
      {!collapsed && (
        <div className="divide-y divide-border/40">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Chapter</span>
            <span className="w-28 text-center">Status</span>
            <span className="w-20 text-center">Flags</span>
            <span className="w-8" />
          </div>

          {chapters.map((chapter) => {
            const isRevisionOverdue = chapter.next_revision_at
              ? isPast(parseISO(chapter.next_revision_at))
              : false;

            return (
              <div
                key={chapter.id}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 hover:bg-muted/20 transition-colors group items-start sm:items-center"
              >
                {/* Chapter name + notes */}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{chapter.name}</p>
                  {chapter.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {chapter.notes}
                    </p>
                  )}
                  {/* Revision badge (shown inline on mobile too) */}
                  {chapter.next_revision_at && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 h-5 text-[10px] mt-1",
                        isRevisionOverdue
                          ? "border-red-500/40 text-red-600 bg-red-500/5"
                          : "border-primary/40 text-primary bg-primary/5",
                      )}
                    >
                      <Calendar className="w-2.5 h-2.5" />
                      {isRevisionOverdue
                        ? "Overdue"
                        : format(parseISO(chapter.next_revision_at), "MMM d")}
                    </Badge>
                  )}
                </div>

                {/* Status selector */}
                <div className="w-full sm:w-36">
                  <Select
                    value={chapter.status}
                    onValueChange={(v) => onStatusChange(chapter.id, v)}
                  >
                    <SelectTrigger className="h-7 w-full text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => {
                        const Icon = STATUS_ICONS[value] ?? Circle;
                        return (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-1.5 w-full sm:w-20 justify-start sm:justify-center">
                  {chapter.is_weak && (
                    <Badge
                      variant="outline"
                      className="h-5 text-[10px] gap-1 border-amber-500/40 text-amber-600 bg-amber-500/5"
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Weak
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end w-full sm:w-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg hover:bg-muted opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => onEdit(chapter)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onToggleWeak(chapter)}
                        className="gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {chapter.is_weak ? "Mark as strong" : "Mark as weak"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onScheduleRevision(chapter)}
                        className="gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Schedule revision
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(chapter)}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Edit/Create dialog ── */
interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  subjects: Subject[];
  onSave: (data: { name: string; subjectId: string; notes: string }) => Promise<void>;
}

const ChapterDialog = ({ open, onOpenChange, chapter, subjects, onSave }: ChapterDialogProps) => {
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(chapter?.name ?? "");
      setSubjectId(chapter?.subject_id ?? subjects[0]?.id ?? "");
      setNotes(chapter?.notes ?? "");
    }
  }, [open, chapter, subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectId) {
      toast.error("Chapter name and subject are required");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), subjectId, notes: notes.trim() });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{chapter ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
          <DialogDescription>
            {chapter
              ? "Update chapter details and notes."
              : "Create a new chapter to track your learning progress."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="chapter-name" className="text-sm font-medium">
              Chapter name
            </Label>
            <Input
              id="chapter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quadratic Equations"
              maxLength={MAX_CHAPTER_NAME_LENGTH}
              required
              autoFocus
              className="rounded-xl h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              {name.length}/{MAX_CHAPTER_NAME_LENGTH}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapter-subject" className="text-sm font-medium">
              Subject
            </Label>
            <Select value={subjectId} onValueChange={setSubjectId} required>
              <SelectTrigger id="chapter-subject" className="rounded-xl h-11">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
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

          <div className="space-y-2">
            <Label htmlFor="chapter-notes" className="text-sm font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="chapter-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key concepts, formulas, or reminders..."
              maxLength={MAX_NOTES_LENGTH}
              rows={4}
              className="rounded-xl resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              {notes.length}/{MAX_NOTES_LENGTH}
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
              disabled={submitting || !name.trim()}
              className="rounded-xl gap-2"
            >
              {submitting ? "Saving..." : chapter ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  chapter: Chapter | null;
  onConfirm: () => void;
  onCancel: () => void;
}
const DeleteDialog = ({ chapter, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!chapter} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          Delete Chapter?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Are you sure you want to delete <strong>{chapter?.name}</strong>? This action cannot be
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
const Chapters = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const subjectFilter = params.get("subject") ?? "all";
  const { subjects, chapters, loading, reload } = useChaptersData(user?.id, subjectFilter);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [toDelete, setToDelete] = useState<Chapter | null>(null);

  useEffect(() => {
    document.title = "Chapters · Synapse Forge";
  }, []);

  const defaultSubject = useMemo(() => {
    if (subjectFilter !== "all") return subjectFilter;
    return subjects[0]?.id ?? "";
  }, [subjectFilter, subjects]);

  const handleOpenNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (chapter: Chapter) => {
    setEditing(chapter);
    setDialogOpen(true);
  };

  const handleSave = async (data: { name: string; subjectId: string; notes: string }) => {
    if (!user) return;

    if (editing) {
      const { error } = await supabase
        .from("chapters")
        .update({
          name: data.name,
          subject_id: data.subjectId,
          notes: data.notes || null,
        })
        .eq("id", editing.id);

      if (error) {
        toast.error(error.message ?? "Failed to update chapter");
        throw error;
      }
      toast.success("Chapter updated");
    } else {
      const { error } = await supabase.from("chapters").insert({
        user_id: user.id,
        name: data.name,
        subject_id: data.subjectId,
        notes: data.notes || null,
      });

      if (error) {
        toast.error(error.message ?? "Failed to create chapter");
        throw error;
      }
      toast.success("Chapter added");
    }

    reload();
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("chapters").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message ?? "Failed to update status");
    } else {
      toast.success(`Status changed to "${STATUS_LABEL[status]}"`);
      reload();
    }
  };

  const handleToggleWeak = async (chapter: Chapter) => {
    const newValue = !chapter.is_weak;
    const { error } = await supabase
      .from("chapters")
      .update({ is_weak: newValue })
      .eq("id", chapter.id);

    if (error) {
      toast.error(error.message ?? "Failed to toggle weak flag");
    } else {
      toast.success(newValue ? "Marked as weak" : "Removed weak flag");
      reload();
    }
  };

  const handleScheduleRevision = async (chapter: Chapter) => {
    const stage = chapter.revision_stage ?? 0;
    const nextDate = nextRevisionDate(stage);

    const { error } = await supabase
      .from("chapters")
      .update({
        next_revision_at: nextDate.toISOString(),
        last_revised_at: new Date().toISOString(),
        revision_stage: Math.min(stage + 1, 3),
        status: "needs_revision",
      })
      .eq("id", chapter.id);

    if (error) {
      toast.error(error.message ?? "Failed to schedule revision");
    } else {
      toast.success(`Revision scheduled for ${format(nextDate, "MMM d, yyyy")}`);
      reload();
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("chapters").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete chapter");
    } else {
      toast.success(`"${toDelete.name}" deleted`);
      reload();
    }

    setToDelete(null);
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = chapters.length;
    const completed = chapters.filter((c) => c.status === "completed").length;
    const inProgress = chapters.filter((c) => c.status === "in_progress").length;
    const weak = chapters.filter((c) => c.is_weak).length;
    const revisionDue = chapters.filter(
      (c) => c.next_revision_at && isPast(parseISO(c.next_revision_at)),
    ).length;

    return { total, completed, inProgress, weak, revisionDue };
  }, [chapters]);

  /*
   * When viewing ALL subjects → group chapters by subject and render
   * one <SubjectTable> per subject (collapsible).
   * When a specific subject is selected → flat card list (original view).
   */
  const chaptersBySubject = useMemo(() => {
    if (subjectFilter !== "all") return null;

    const map = new Map<string, { subject: Subject; chapters: Chapter[] }>();

    // Preserve subject order (alphabetical from query)
    subjects.forEach((s) => {
      map.set(s.id, { subject: s, chapters: [] });
    });

    chapters.forEach((c) => {
      if (map.has(c.subject_id)) {
        map.get(c.subject_id)!.chapters.push(c);
      }
    });

    // Only keep subjects that actually have chapters
    return Array.from(map.values()).filter((g) => g.chapters.length > 0);
  }, [subjectFilter, subjects, chapters]);

  const actionHandlers = {
    onEdit: handleEdit,
    onDelete: setToDelete,
    onStatusChange: handleStatusChange,
    onToggleWeak: handleToggleWeak,
    onScheduleRevision: handleScheduleRevision,
  };

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Chapters</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                {stats.total} {stats.total === 1 ? "chapter" : "chapters"}
                {stats.completed > 0 && ` · ${stats.completed} completed`}
                {stats.weak > 0 && ` · ${stats.weak} weak`}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select
            value={subjectFilter}
            onValueChange={(v) => setParams(v === "all" ? {} : { subject: v })}
          >
            <SelectTrigger className="w-44 h-10 rounded-xl">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
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

          <Button
            onClick={handleOpenNew}
            disabled={subjects.length === 0}
            className="gap-2 rounded-xl h-10"
          >
            <Plus className="w-4 h-4" />
            Chapter
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && chapters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground mb-1">Completed</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{stats.completed}</div>
          </Card>
          <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground mb-1">In Progress</div>
            <div className="text-2xl font-bold tabular-nums text-blue-600">{stats.inProgress}</div>
          </Card>
          <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground mb-1">Weak Topics</div>
            <div className="text-2xl font-bold tabular-nums text-amber-600">{stats.weak}</div>
          </Card>
          <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground mb-1">Revision Due</div>
            <div className="text-2xl font-bold tabular-nums text-red-600">{stats.revisionDue}</div>
          </Card>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ChapterCardSkeleton key={i} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No subjects found"
          description="Create a subject first before adding chapters."
          action={{
            label: "Go to Subjects",
            onClick: () => (window.location.href = "/subjects?create=true"),
          }}
        />
      ) : chapters.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No chapters yet"
          description={
            subjectFilter === "all"
              ? "Start by adding your first chapter."
              : "No chapters found for this subject."
          }
          action={{ label: "Add Chapter", onClick: handleOpenNew }}
        />
      ) : subjectFilter === "all" ? (
        /* ── Grouped table view (all subjects) ── */
        <div className="space-y-4">
          {chaptersBySubject!.map(({ subject, chapters: subChapters }) => (
            <SubjectTable
              key={subject.id}
              subject={subject}
              chapters={subChapters}
              {...actionHandlers}
            />
          ))}
        </div>
      ) : (
        /* ── Flat card view (single subject filtered) ── */
        <div className="space-y-3">
          {chapters.map((c) => (
            <ChapterCard key={c.id} chapter={c} {...actionHandlers} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ChapterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        chapter={editing}
        subjects={subjects}
        onSave={handleSave}
      />

      <DeleteDialog chapter={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Chapters;