import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Trash2,
  BookOpen,
  ArrowRight,
  Palette,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const COLOR_PALETTE = [
  { hex: "#8b5cf6", name: "Purple" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#84cc16", name: "Lime" },
];

const MAX_SUBJECT_NAME_LENGTH = 60;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Subject {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface SubjectStats {
  total: number;
  done: number;
  inProgress: number;
  notStarted: number;
}

/* ═══════════════════════════════════════════════════════════════
   Utility Hooks
═══════════════════════════════════════════════════════════════ */
const useSubjects = (userId: string | undefined) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Record<string, SubjectStats>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [{ data: subs }, { data: chs }] = await Promise.all([
        supabase
          .from("subjects")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("chapters")
          .select("subject_id, status")
          .eq("user_id", userId),
      ]);

      setSubjects(subs ?? []);

      // Compute stats per subject
      const statMap: Record<string, SubjectStats> = {};
      (chs ?? []).forEach((ch: any) => {
        if (!statMap[ch.subject_id]) {
          statMap[ch.subject_id] = { total: 0, done: 0, inProgress: 0, notStarted: 0 };
        }
        statMap[ch.subject_id].total++;
        if (ch.status === "completed") statMap[ch.subject_id].done++;
        else if (ch.status === "in_progress") statMap[ch.subject_id].inProgress++;
        else statMap[ch.subject_id].notStarted++;
      });

      setStats(statMap);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { subjects, stats, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const SubjectCardSkeleton = () => (
  <Card className="p-5 border-border/50 bg-card/60 backdrop-blur-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
    <Skeleton className="h-2 w-full mb-4" />
    <Skeleton className="h-9 w-full rounded-lg" />
  </Card>
);

/* ── Empty state ── */
const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
      <BookOpen className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-2">No subjects yet</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
      Organize your studies by creating subjects. Track chapters, progress, and mastery.
    </p>
    <Button onClick={onAdd} className="gap-2 rounded-xl">
      <Plus className="w-4 h-4" />
      Add your first subject
    </Button>
  </Card>
);

/* ── Color picker ── */
interface ColorPickerProps {
  selected: string;
  onChange: (hex: string) => void;
}
const ColorPicker = ({ selected, onChange }: ColorPickerProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">Color</Label>
    <div className="flex gap-2.5 flex-wrap">
      {COLOR_PALETTE.map(({ hex, name }) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          className={cn(
            "relative w-10 h-10 rounded-xl transition-all duration-200",
            "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selected === hex && "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105",
          )}
          style={{ backgroundColor: hex }}
          aria-label={name}
          title={name}
        >
          {selected === hex && (
            <CheckCircle2 className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          )}
        </button>
      ))}
    </div>
  </div>
);

/* ── Subject card ── */
interface SubjectCardProps {
  subject: Subject;
  stats: SubjectStats;
  onDelete: (id: string) => void;
}
const SubjectCard = ({ subject, stats, onDelete }: SubjectCardProps) => {
  const progressPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <Card
      className={cn(
        "p-5 relative group overflow-hidden",
        "border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-lg hover:shadow-black/5",
        "transition-all duration-200",
      )}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: subject.color }}
      />

      <div className="flex items-start justify-between mb-4">
        {/* Icon + meta */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              backgroundColor: `${subject.color}20`,
              color: subject.color,
            }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{subject.name}</div>
            <div className="text-xs text-muted-foreground">
              {stats.total} {stats.total === 1 ? "chapter" : "chapters"}
            </div>
          </div>
        </div>

        {/* Delete button (hover-reveal) */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-8 h-8 shrink-0 rounded-lg",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "hover:bg-destructive/10 hover:text-destructive",
          )}
          onClick={() => onDelete(subject.id)}
          aria-label={`Delete ${subject.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Stats pills */}
      {stats.total > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap text-[10px]">
          {stats.done > 0 && (
            <Badge variant="secondary" className="h-5 gap-1 bg-emerald-500/10 text-emerald-600 border-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {stats.done} done
            </Badge>
          )}
          {stats.inProgress > 0 && (
            <Badge variant="secondary" className="h-5 gap-1 bg-blue-500/10 text-blue-600 border-0">
              <Clock className="w-2.5 h-2.5" />
              {stats.inProgress} in progress
            </Badge>
          )}
          {stats.notStarted > 0 && (
            <Badge variant="secondary" className="h-5 gap-1 bg-muted text-muted-foreground border-0">
              {stats.notStarted} not started
            </Badge>
          )}
        </div>
      )}

      {/* Progress bar */}
      {stats.total > 0 ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-semibold text-foreground tabular-nums">{progressPercent}%</span>
          </div>
          <Progress
            value={progressPercent}
            className="h-1.5 [&>div]:transition-all [&>div]:duration-500"
            style={
              {
                "--progress-background": subject.color,
              } as React.CSSProperties
            }
          />
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/60 italic py-2">
          No chapters added yet
        </div>
      )}

      {/* CTA */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="w-full mt-4 rounded-xl h-9 text-xs gap-1.5 group/btn"
      >
        <Link to={`/chapters?subject=${subject.id}`}>
          View chapters
          <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </Button>
    </Card>
  );
};

/* ── Create dialog ── */
interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, color: string) => Promise<void>;
}
const CreateDialog = ({ open, onOpenChange, onCreate }: CreateDialogProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0].hex);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Subject name is required");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(name.trim(), color);
      setName("");
      setColor(COLOR_PALETTE[0].hex);
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
          New Subject
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
          <DialogDescription>
            Create a subject to organize your chapters and track progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="subject-name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
              maxLength={MAX_SUBJECT_NAME_LENGTH}
              required
              autoFocus
              className="rounded-xl h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              {name.length}/{MAX_SUBJECT_NAME_LENGTH} characters
            </p>
          </div>

          {/* Color picker */}
          <ColorPicker selected={color} onChange={setColor} />

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
              {submitting ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  subject: Subject | null;
  onConfirm: () => void;
  onCancel: () => void;
}
const DeleteDialog = ({ subject, onConfirm, onCancel }: DeleteDialogProps) => (
  <AlertDialog open={!!subject} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          Delete Subject?
        </AlertDialogTitle>
        <AlertDialogDescription className="leading-relaxed">
          Are you sure you want to delete <strong>{subject?.name}</strong>? This will also remove all
          associated chapters and cannot be undone.
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
const Subjects = () => {
  const { user } = useAuth();
  const { subjects, stats, loading, reload } = useSubjects(user?.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  // Pre-open create dialog if ?create=true in URL
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setCreateOpen(true);
      searchParams.delete("create");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    document.title = "Subjects · Synapse Forge";
  }, []);

  /* ── Create subject ── */
  const handleCreate = async (name: string, color: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("subjects")
      .insert({ user_id: user.id, name, color });

    if (error) {
      toast.error(error.message ?? "Failed to create subject");
      throw error;
    }

    toast.success(`"${name}" added successfully`);
    reload();
  };

  /* ── Delete subject ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("subjects").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete subject");
    } else {
      toast.success(`"${toDelete.name}" removed`);
      reload();
    }

    setToDelete(null);
  };

  /* ── Aggregate stats ── */
  const totalStats = useMemo(() => {
    let total = 0,
      done = 0,
      inProgress = 0;
    Object.values(stats).forEach((s) => {
      total += s.total;
      done += s.done;
      inProgress += s.inProgress;
    });
    return { total, done, inProgress };
  }, [stats]);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-40" />
            ) : subjects.length > 0 ? (
              <>
                {subjects.length} {subjects.length === 1 ? "subject" : "subjects"} ·{" "}
                {totalStats.total} chapters total
                {totalStats.done > 0 && ` · ${totalStats.done} completed`}
              </>
            ) : (
              "Organize your studies by subject"
            )}
          </p>
        </div>

        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />
      </div>

      {/* Summary cards (if subjects exist) */}
      {!loading && subjects.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BookOpen className="w-3 h-3" />
              Total
            </div>
            <div className="text-2xl font-bold tabular-nums">{totalStats.total}</div>
            <div className="text-[11px] text-muted-foreground">chapters</div>
          </Card>

          <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-emerald-600 mb-1">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{totalStats.done}</div>
            <div className="text-[11px] text-muted-foreground">completed</div>
          </Card>

          <Card className="p-4 border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
              <Clock className="w-3 h-3" />
              Active
            </div>
            <div className="text-2xl font-bold tabular-nums text-blue-600">
              {totalStats.inProgress}
            </div>
            <div className="text-[11px] text-muted-foreground">in progress</div>
          </Card>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SubjectCardSkeleton key={i} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              stats={stats[s.id] ?? { total: 0, done: 0, inProgress: 0, notStarted: 0 }}
              onDelete={(id) => setToDelete(subjects.find((sub) => sub.id === id) ?? null)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteDialog subject={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Subjects;