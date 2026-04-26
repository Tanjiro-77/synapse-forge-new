import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  Save,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  format,
  addDays,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants — Driven by existing DB enum values
═══════════════════════════════════════════════════════════════ */
const MOODS = [
  { value: 1, emoji: "😞", label: "Rough day" },
  { value: 2, emoji: "😐", label: "Average" },
  { value: 3, emoji: "🙂", label: "Pretty good" },
  { value: 4, emoji: "😄", label: "Great day" },
  { value: 5, emoji: "🚀", label: "Incredible" },
] as const;

const MAX_FIELD_LENGTH = 1000;

const REFLECTION_FIELDS = [
  {
    key: "studied" as const,
    label: "What did you study?",
    placeholder: "Topics, chapters, or subjects you covered today...",
    icon: BookOpen,
  },
  {
    key: "understood" as const,
    label: "What did you truly understand?",
    placeholder: "Concepts or insights that clicked today...",
    icon: Lightbulb,
  },
  {
    key: "improve" as const,
    label: "What needs more work?",
    placeholder: "Topics that need review or clarification...",
    icon: TrendingUp,
  },
] as const;

type ReflectionKey = "studied" | "understood" | "improve";

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Reflection {
  id: string;
  user_id: string;
  reflection_date: string;
  studied: string | null;
  understood: string | null;
  improve: string | null;
  mood: number | null;
}

interface ReflectionForm {
  studied: string;
  understood: string;
  improve: string;
  mood: number;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useReflections = (userId: string | undefined, date: string) => {
  const [current, setCurrent] = useState<Reflection | null>(null);
  const [history, setHistory] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [{ data: cur }, { data: list }] = await Promise.all([
        supabase
          .from("reflections")
          .select("*")
          .eq("user_id", userId)
          .eq("reflection_date", date)
          .maybeSingle(),
        supabase
          .from("reflections")
          .select("*")
          .eq("user_id", userId)
          .order("reflection_date", { ascending: false })
          .limit(7),
      ]);

      setCurrent(cur ?? null);
      setHistory(list ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load reflections");
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return { current, history, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Date navigation ── */
interface DateNavProps {
  date: string;
  onChange: (date: string) => void;
}

const DateNav = ({ date, onChange }: DateNavProps) => {
  const dateObj = parseISO(date);

  const displayLabel = isToday(dateObj)
    ? "Today"
    : isYesterday(dateObj)
      ? "Yesterday"
      : isTomorrow(dateObj)
        ? "Tomorrow"
        : format(dateObj, "EEEE, MMM d");

  const shift = (days: number) => {
    onChange(format(addDays(dateObj, days), "yyyy-MM-dd"));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => shift(-1)}
        className="h-9 rounded-lg gap-1"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Prev</span>
      </Button>

      <div className="flex items-center gap-2 flex-1 sm:flex-none">
        <Input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 h-9 rounded-lg"
        />
        <span className="text-sm font-semibold text-foreground hidden sm:block">
          {displayLabel}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => shift(1)}
        disabled={isToday(dateObj)}
        className="h-9 rounded-lg gap-1"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>

      {!isToday(dateObj) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(format(new Date(), "yyyy-MM-dd"))}
          className="h-9 rounded-lg"
        >
          Today
        </Button>
      )}
    </div>
  );
};

/* ── Mood picker ── */
interface MoodPickerProps {
  value: number;
  onChange: (value: number) => void;
}

const MoodPicker = ({ value, onChange }: MoodPickerProps) => {
  const selectedMood = MOODS.find((m) => m.value === value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            title={m.label}
            aria-label={m.label}
            className={cn(
              "relative text-3xl p-2.5 rounded-xl transition-all duration-200",
              "hover:bg-muted/50 hover:scale-105",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              value === m.value
                ? "bg-primary/15 scale-110 ring-2 ring-primary/30"
                : "opacity-60 hover:opacity-100",
            )}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      {selectedMood && (
        <p className="text-xs text-muted-foreground font-medium">
          {selectedMood.emoji} {selectedMood.label}
        </p>
      )}
    </div>
  );
};

/* ── Reflection text field ── */
interface ReflectionFieldProps {
  label: string;
  placeholder: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
}

const ReflectionField = ({
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
}: ReflectionFieldProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      {label}
    </Label>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      maxLength={MAX_FIELD_LENGTH}
      className="rounded-xl resize-none"
    />
    <p className="text-[11px] text-muted-foreground text-right">
      {value.length}/{MAX_FIELD_LENGTH}
    </p>
  </div>
);

/* ── History card skeleton ── */
const HistorySkeleton = () => (
  <Card className="p-4 border-border/50 bg-card/60">
    <div className="flex items-center justify-between mb-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-6 w-8" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4 mt-1" />
  </Card>
);

/* ── History entry card ── */
interface HistoryCardProps {
  reflection: Reflection;
  isActive: boolean;
  onSelect: (date: string) => void;
}

const HistoryCard = ({ reflection, isActive, onSelect }: HistoryCardProps) => {
  const mood = MOODS.find((m) => m.value === reflection.mood);
  const date = parseISO(reflection.reflection_date);

  const dateLabel = isToday(date)
    ? "Today"
    : isYesterday(date)
      ? "Yesterday"
      : format(date, "EEE, MMM d");

  const hasContent =
    reflection.studied || reflection.understood || reflection.improve;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer border-border/50 bg-card/60 backdrop-blur-sm",
        "hover:border-border hover:shadow-md transition-all duration-200",
        isActive && "border-primary/30 bg-primary/5 ring-1 ring-primary/20",
      )}
      onClick={() => onSelect(reflection.reflection_date)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm font-semibold">{dateLabel}</span>
          {isActive && (
            <Badge variant="outline" className="h-4 text-[9px] bg-primary/10 text-primary border-primary/20">
              Editing
            </Badge>
          )}
        </div>
        {mood && (
          <span className="text-xl" title={mood.label}>
            {mood.emoji}
          </span>
        )}
      </div>

      {hasContent ? (
        <div className="space-y-1">
          {reflection.studied && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              <span className="font-semibold text-foreground">Studied: </span>
              {reflection.studied}
            </p>
          )}
          {reflection.understood && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              <span className="font-semibold text-foreground">Understood: </span>
              {reflection.understood}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No content recorded</p>
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Reflections = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { current, history, loading, reload } = useReflections(user?.id, date);

  const [form, setForm] = useState<ReflectionForm>({
    studied: "",
    understood: "",
    improve: "",
    mood: 3,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Reflections · Synapse Forge";
  }, []);

  // Sync form from loaded reflection
  useEffect(() => {
    setForm({
      studied: current?.studied ?? "",
      understood: current?.understood ?? "",
      improve: current?.improve ?? "",
      mood: current?.mood ?? 3,
    });
  }, [current]);

  /* ── Save reflection ── */
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("reflections").upsert(
        {
          user_id: user.id,
          reflection_date: date,
          studied: form.studied.trim() || null,
          understood: form.understood.trim() || null,
          improve: form.improve.trim() || null,
          mood: form.mood,
        },
        { onConflict: "user_id,reflection_date" },
      );

      if (error) throw error;

      toast.success("Reflection saved ✨");
      reload();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to save reflection");
    } finally {
      setSaving(false);
    }
  };

  /* ── Field change helper ── */
  const setField = (key: ReflectionKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hasUnsavedChanges =
    (form.studied.trim() || null) !== (current?.studied ?? null) ||
    (form.understood.trim() || null) !== (current?.understood ?? null) ||
    (form.improve.trim() || null) !== (current?.improve ?? null) ||
    form.mood !== (current?.mood ?? 3);

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Daily Reflection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          End your day with intention — track growth and insights
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date selector */}
          <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
            <DateNav date={date} onChange={setDate} />
          </Card>

          {/* Reflection form */}
          <Card className="p-6 border-border/50 bg-card/60 backdrop-blur-sm">
            {loading ? (
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Dynamic reflection fields from config */}
                {REFLECTION_FIELDS.map((field) => (
                  <ReflectionField
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    icon={field.icon}
                    value={form[field.key]}
                    onChange={(value) => setField(field.key, value)}
                  />
                ))}

                {/* Mood */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    How did today feel?
                  </Label>
                  <MoodPicker
                    value={form.mood}
                    onChange={(mood) => setForm((prev) => ({ ...prev, mood }))}
                  />
                </div>

                {/* Save button */}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className={cn(
                    "w-full rounded-xl gap-2",
                    hasUnsavedChanges && "shadow-lg shadow-primary/20",
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {current ? "Update reflection" : "Save reflection"}
                    </>
                  )}
                </Button>

                {hasUnsavedChanges && !saving && (
                  <p className="text-xs text-center text-amber-600 font-medium">
                    You have unsaved changes
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar — history */}
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
              Recent Reflections
            </h2>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <HistorySkeleton key={i} />
                ))}
              </div>
            ) : history.length === 0 ? (
              <Card className="p-6 text-center border-border/50 bg-card/40">
                <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No reflections yet. Start today!
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {history.map((r) => (
                  <HistoryCard
                    key={r.id}
                    reflection={r}
                    isActive={r.reflection_date === date}
                    onSelect={(selectedDate) => setDate(selectedDate)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mood summary */}
          {!loading && history.length > 0 && (
            <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
              <h3 className="text-sm font-semibold mb-3">Recent Mood</h3>
              <div className="flex gap-1.5 flex-wrap">
                {history
                  .filter((r) => r.mood !== null)
                  .map((r) => {
                    const mood = MOODS.find((m) => m.value === r.mood);
                    return mood ? (
                      <span
                        key={r.id}
                        className="text-xl"
                        title={`${format(parseISO(r.reflection_date), "MMM d")} — ${mood.label}`}
                      >
                        {mood.emoji}
                      </span>
                    ) : null;
                  })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reflections;