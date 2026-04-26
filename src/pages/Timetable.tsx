import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, ClipboardList, Clock, Calendar, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — Monday-First Week
═══════════════════════════════════════════════════════════════ */
const DAYS_OF_WEEK = [
  { index: 1, short: "Mon", full: "Monday" },
  { index: 2, short: "Tue", full: "Tuesday" },
  { index: 3, short: "Wed", full: "Wednesday" },
  { index: 4, short: "Thu", full: "Thursday" },
  { index: 5, short: "Fri", full: "Friday" },
  { index: 6, short: "Sat", full: "Saturday" },
  { index: 0, short: "Sun", full: "Sunday" },
];

const MAX_LABEL_LENGTH = 100;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface TimetableBlock {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  label: string | null;
  subjects?: {
    name: string;
    color: string;
  };
}

interface BlockFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string;
  label: string;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useTimetableData = (userId: string | undefined) => {
  const [blocks, setBlocks] = useState<TimetableBlock[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [{ data: blocksData }, { data: subjectsData }] = await Promise.all([
        supabase
          .from("timetable_blocks")
          .select("*, subjects(name, color)")
          .eq("user_id", userId)
          .order("day_of_week")
          .order("start_time"),
        supabase.from("subjects").select("id, name, color").eq("user_id", userId).order("name"),
      ]);

      setBlocks(blocksData ?? []);
      setSubjects(subjectsData ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { blocks, subjects, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ── */
const DayCardSkeleton = () => (
  <Card className="p-3 border-border/50 bg-card/60 backdrop-blur-sm min-h-[240px]">
    <Skeleton className="h-5 w-12 mx-auto mb-3" />
    <div className="space-y-2">
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  </Card>
);

/* ── Empty state for day ── */
const EmptyDay = () => (
  <div className="text-center py-8 text-muted-foreground/40">
    <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
    <p className="text-xs">No classes</p>
  </div>
);

/* ── Time block card ── */
interface BlockCardProps {
  block: TimetableBlock;
  onDelete: (block: TimetableBlock) => void;
}

const BlockCard = ({ block, onDelete }: BlockCardProps) => {
  const color = block.subjects?.color ?? "#8b5cf6";
  const title = block.subjects?.name ?? block.label ?? "Study Block";
  const subtitle = block.label && block.subjects ? block.label : null;

  return (
    <div
      className={cn(
        "relative p-3 rounded-lg group",
        "border-l-[3px] transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02]",
      )}
      style={{
        backgroundColor: `${color}15`,
        borderLeftColor: color,
      }}
    >
      {/* Time range */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mb-1.5">
        <Clock className="w-3 h-3" />
        <span>
          {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
        </span>
      </div>

      {/* Title */}
      <div className="font-semibold text-sm truncate pr-6" style={{ color }}>
        {title}
      </div>

      {/* Subtitle (optional) */}
      {subtitle && (
        <div className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</div>
      )}

      {/* Delete button (hover-reveal) */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-1.5 right-1.5 h-6 w-6 rounded-md",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-destructive/20 hover:text-destructive",
        )}
        onClick={() => onDelete(block)}
        aria-label={`Delete ${title}`}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};

/* ── Day column ── */
interface DayColumnProps {
  day: { index: number; short: string; full: string };
  blocks: TimetableBlock[];
  onDeleteBlock: (block: TimetableBlock) => void;
  loading: boolean;
}

const DayColumn = ({ day, blocks, onDeleteBlock, loading }: DayColumnProps) => {
  const isToday = new Date().getDay() === day.index;

  return (
    <Card
      className={cn(
        "p-3 min-h-[240px] border-border/50 bg-card/60 backdrop-blur-sm",
        "transition-all duration-200",
        isToday && "ring-2 ring-primary/20 border-primary/30 bg-primary/5",
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <h3
          className={cn(
            "font-bold text-sm uppercase tracking-wider",
            isToday ? "text-primary" : "text-muted-foreground",
          )}
        >
          {day.short}
        </h3>
        {isToday && (
          <Badge variant="secondary" className="h-4 text-[9px] px-1.5 bg-primary/15 text-primary border-0">
            Today
          </Badge>
        )}
      </div>

      {/* Blocks */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : blocks.length === 0 ? (
        <EmptyDay />
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => (
            <BlockCard key={block.id} block={block} onDelete={onDeleteBlock} />
          ))}
        </div>
      )}
    </Card>
  );
};

/* ── Create/Edit dialog ── */
interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onCreate: (data: BlockFormData) => Promise<void>;
}

const BlockDialog = ({ open, onOpenChange, subjects, onCreate }: BlockDialogProps) => {
  const [form, setForm] = useState<BlockFormData>({
    day_of_week: 1, // Monday
    start_time: "09:00",
    end_time: "10:00",
    subject_id: "",
    label: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (form.start_time >= form.end_time) {
      toast.error("End time must be after start time");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(form);
      // Reset form
      setForm({
        day_of_week: 1,
        start_time: "09:00",
        end_time: "10:00",
        subject_id: "",
        label: "",
      });
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
          Add Block
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Time Block</DialogTitle>
          <DialogDescription>
            Schedule a recurring class or study session for your weekly timetable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Day selector */}
          <div className="space-y-2">
            <Label htmlFor="block-day" className="text-sm font-medium">
              Day of week
            </Label>
            <Select
              value={String(form.day_of_week)}
              onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}
            >
              <SelectTrigger id="block-day" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.index} value={String(day.index)}>
                    {day.full}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="block-start" className="text-sm font-medium">
                Start time
              </Label>
              <Input
                id="block-start"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end" className="text-sm font-medium">
                End time
              </Label>
              <Input
                id="block-end"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
          </div>

          {/* Subject (optional) */}
          <div className="space-y-2">
            <Label htmlFor="block-subject" className="text-sm font-medium">
              Subject <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={form.subject_id || "none"}
              onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}
            >
              <SelectTrigger id="block-subject" className="rounded-xl h-11">
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

          {/* Label (optional) */}
          <div className="space-y-2">
            <Label htmlFor="block-label" className="text-sm font-medium">
              Label <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="block-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Algebra revision, Group study"
              maxLength={MAX_LABEL_LENGTH}
              className="rounded-xl h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              {form.label.length}/{MAX_LABEL_LENGTH}
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
            <Button type="submit" disabled={submitting} className="rounded-xl gap-2">
              {submitting ? "Adding..." : "Add Block"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete confirmation ── */
interface DeleteDialogProps {
  block: TimetableBlock | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog = ({ block, onConfirm, onCancel }: DeleteDialogProps) => {
  const title = block?.subjects?.name ?? block?.label ?? "Study Block";
  const day = DAYS_OF_WEEK.find((d) => d.index === block?.day_of_week)?.full ?? "Unknown";

  return (
    <AlertDialog open={!!block} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Delete Time Block?
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            Remove <strong>{title}</strong> from your {day} schedule? This action cannot be undone.
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
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Timetable = () => {
  const { user } = useAuth();
  const { blocks, subjects, loading, reload } = useTimetableData(user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TimetableBlock | null>(null);

  useEffect(() => {
    document.title = "Timetable · Synapse Forge";
  }, []);

  /* ── Create block ── */
  const handleCreate = async (data: BlockFormData) => {
    if (!user) return;

    const { error } = await supabase.from("timetable_blocks").insert({
      user_id: user.id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      subject_id: data.subject_id || null,
      label: data.label.trim() || null,
    });

    if (error) {
      toast.error(error.message ?? "Failed to add block");
      throw error;
    }

    toast.success("Time block added");
    reload();
  };

  /* ── Delete block ── */
  const handleDelete = async () => {
    if (!toDelete) return;

    const { error } = await supabase.from("timetable_blocks").delete().eq("id", toDelete.id);

    if (error) {
      toast.error(error.message ?? "Failed to delete block");
    } else {
      toast.success("Block removed");
      reload();
    }

    setToDelete(null);
  };

  /* ── Group blocks by day ── */
  const blocksByDay = useMemo(() => {
    const grouped: Record<number, TimetableBlock[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      grouped[day.index] = blocks.filter((b) => b.day_of_week === day.index);
    });
    return grouped;
  }, [blocks]);

  /* ── Stats ── */
  const totalBlocks = blocks.length;

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Weekly Timetable
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                {totalBlocks > 0
                  ? `${totalBlocks} ${totalBlocks === 1 ? "block" : "blocks"} scheduled`
                  : "Build your perfect study rhythm"}
              </>
            )}
          </p>
        </div>

        <BlockDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          subjects={subjects}
          onCreate={handleCreate}
        />
      </div>

      {/* Week grid — Monday to Sunday */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAYS_OF_WEEK.map((day) => (
          <DayColumn
            key={day.index}
            day={day}
            blocks={blocksByDay[day.index] ?? []}
            onDeleteBlock={setToDelete}
            loading={loading}
          />
        ))}
      </div>

      {/* Empty state (if no blocks at all) */}
      {!loading && totalBlocks === 0 && (
        <Card className="p-12 text-center border-border/50 bg-card/40 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No classes scheduled yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
            Add recurring time blocks to visualize your weekly study routine.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            Add your first block
          </Button>
        </Card>
      )}

      {/* Delete confirmation */}
      <DeleteDialog block={toDelete} onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
};

export default Timetable;