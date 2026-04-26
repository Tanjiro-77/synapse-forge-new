import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Lock,
  Unlock,
  Target,
  Zap,
  TrendingUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const PRESETS = {
  classic: { focus: 25, break: 5, label: "Classic Pomodoro" },
  deep: { focus: 50, break: 10, label: "Deep Work" },
  sprint: { focus: 15, break: 3, label: "Quick Sprint" },
} as const;

type PresetKey = keyof typeof PRESETS;
type TimerMode = "focus" | "break";

const MAX_NOTES_LENGTH = 500;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SessionQuality {
  focusLevel: number;
  distractionLevel: number;
  notes: string;
}

/* ═══════════════════════════════════════════════════════════════
   Audio Notification Helper
═══════════════════════════════════════════════════════════════ */
const playNotificationSound = () => {
  try {
    // Simple beep using Web Audio API
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (error) {
    console.warn("Audio notification failed:", error);
  }
};

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useSubjects = (userId: string | undefined) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("subjects")
        .select("id, name, color")
        .eq("user_id", userId)
        .order("name");
      setSubjects(data ?? []);
      setLoading(false);
    })();
  }, [userId]);

  return { subjects, loading };
};

const useTodaySessions = (userId: string | undefined) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("focus_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("session_date", today);
    setCount(data?.length ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { count, reload: load, loading };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Circular progress timer ── */
interface CircularTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  mode: TimerMode;
  size?: "sm" | "lg";
}

const CircularTimer = ({ secondsLeft, totalSeconds, mode, size = "sm" }: CircularTimerProps) => {
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const dimensions = size === "lg" ? "w-80 h-80" : "w-64 h-64";
  const textSize = size === "lg" ? "text-7xl" : "text-6xl";

  return (
    <div className={cn("relative mx-auto", dimensions)}>
      {/* SVG ring */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="4"
          opacity="0.2"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(262.1 83.3% 57.8%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={cn(
            "font-bold tabular-nums tracking-tight",
            "bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent",
            textSize,
          )}
        >
          {formatTime(secondsLeft)}
        </div>
        <div className="text-sm text-muted-foreground mt-2 capitalize font-medium">{mode}</div>
      </div>
    </div>
  );
};

/* ── Quality feedback dialog ── */
interface QualityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (quality: SessionQuality) => void;
  onSkip: () => void;
}

const QualityDialog = ({ open, onOpenChange, onSave, onSkip }: QualityDialogProps) => {
  const [focusLevel, setFocusLevel] = useState([7]);
  const [distractionLevel, setDistractionLevel] = useState([3]);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    onSave({
      focusLevel: focusLevel[0],
      distractionLevel: distractionLevel[0],
      notes: notes.trim(),
    });
    // Reset
    setFocusLevel([7]);
    setDistractionLevel([3]);
    setNotes("");
  };

  const handleSkip = () => {
    onSkip();
    // Reset
    setFocusLevel([7]);
    setDistractionLevel([3]);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            How was your session?
          </DialogTitle>
          <DialogDescription>
            Track your focus quality to identify patterns and improve over time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Focus level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Focus level</Label>
              <Badge variant="secondary" className="tabular-nums bg-primary/10 text-primary border-0">
                {focusLevel[0]}/10
              </Badge>
            </div>
            <Slider
              value={focusLevel}
              onValueChange={setFocusLevel}
              min={1}
              max={10}
              step={1}
              className="[&_[role=slider]]:bg-primary"
            />
            <p className="text-xs text-muted-foreground">
              How well did you maintain concentration?
            </p>
          </div>

          {/* Distraction level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Distraction level</Label>
              <Badge variant="secondary" className="tabular-nums bg-amber-500/10 text-amber-600 border-0">
                {distractionLevel[0]}/10
              </Badge>
            </div>
            <Slider
              value={distractionLevel}
              onValueChange={setDistractionLevel}
              min={1}
              max={10}
              step={1}
              className="[&_[role=slider]]:bg-amber-500"
            />
            <p className="text-xs text-muted-foreground">
              How often were you interrupted or distracted?
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Quick notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you work on? Any blockers or insights?"
              maxLength={MAX_NOTES_LENGTH}
              rows={3}
              className="resize-none rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/{MAX_NOTES_LENGTH}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip} className="flex-1 rounded-xl">
            Skip
          </Button>
          <Button onClick={handleSave} className="flex-1 rounded-xl gap-2">
            <Zap className="w-3.5 h-3.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Distraction-free fullscreen mode ── */
interface FullscreenModeProps {
  secondsLeft: number;
  totalSeconds: number;
  mode: TimerMode;
  running: boolean;
  onToggleRunning: () => void;
  onExit: () => void;
}

const FullscreenMode = ({
  secondsLeft,
  totalSeconds,
  mode,
  running,
  onToggleRunning,
  onExit,
}: FullscreenModeProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-8 animate-in fade-in-0 duration-300">
      <Badge variant="outline" className="uppercase tracking-widest text-xs px-3 py-1.5">
        Distraction-Free Mode
      </Badge>

      <CircularTimer secondsLeft={secondsLeft} totalSeconds={totalSeconds} mode={mode} size="lg" />

      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={onToggleRunning}
          className="gap-2 rounded-xl min-w-[140px]"
        >
          {running ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start
            </>
          )}
        </Button>

        <Button variant="outline" size="lg" onClick={onExit} className="gap-2 rounded-xl">
          <Unlock className="w-4 h-4" />
          Exit
        </Button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const Focus = () => {
  const { user } = useAuth();
  const { subjects, loading: subjectsLoading } = useSubjects(user?.id);
  const { count: completedToday, reload: reloadSessions, loading: sessionsLoading } = useTodaySessions(user?.id);

  // Timer state
  const [preset, setPreset] = useState<PresetKey>("classic");
  const [mode, setMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(PRESETS.classic.focus * 60);
  const [running, setRunning] = useState(false);

  // Config
  const [subjectId, setSubjectId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // UI state
  const [distractionFree, setDistractionFree] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Focus Timer · Synapse Forge";
  }, []);

  /* ── Reset timer when preset or mode changes ── */
  useEffect(() => {
    const duration = PRESETS[preset][mode];
    setSecondsLeft(duration * 60);
    setRunning(false);
  }, [preset, mode]);

  /* ── Timer countdown logic ── */
  useEffect(() => {
    if (!running) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setRunning(false);

          // Completion logic
          if (mode === "focus") {
            handleFocusComplete();
          } else {
            handleBreakComplete();
          }

          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  /* ── Handle focus session completion ── */
  const handleFocusComplete = async () => {
    if (!user) return;

    if (soundEnabled) playNotificationSound();

    const minutes = PRESETS[preset].focus;

    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: user.id,
        subject_id: subjectId || null,
        duration_minutes: minutes,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error(error.message ?? "Failed to save session");
    } else {
      toast.success(`🎉 Focus session complete! +${minutes} XP earned`);
      reloadSessions();
      setLastSessionId(data?.id ?? null);
      setQualityDialogOpen(true);
    }
  };

  /* ── Handle break completion ── */
  const handleBreakComplete = () => {
    if (soundEnabled) playNotificationSound();
    toast.success("Break complete! Ready for another session?");
    setMode("focus");
  };

  /* ── Save session quality ── */
  const handleSaveQuality = async (quality: SessionQuality) => {
    if (!lastSessionId) {
      setQualityDialogOpen(false);
      setMode("break");
      return;
    }

    const { error } = await supabase
      .from("focus_sessions")
      .update({
        focus_level: quality.focusLevel,
        distraction_level: quality.distractionLevel,
        notes: quality.notes || null,
      })
      .eq("id", lastSessionId);

    if (error) {
      toast.error(error.message ?? "Failed to save quality feedback");
    } else {
      toast.success("Session quality saved!");
    }

    setQualityDialogOpen(false);
    setMode("break");
  };

  /* ── Skip quality feedback ── */
  const handleSkipQuality = () => {
    setQualityDialogOpen(false);
    setMode("break");
  };

  /* ── Reset timer ── */
  const handleReset = () => {
    setRunning(false);
    const duration = PRESETS[preset][mode];
    setSecondsLeft(duration * 60);
  };

  /* ── Calculated values ── */
  const totalSeconds = PRESETS[preset][mode] * 60;
  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  /* ── Distraction-free mode ── */
  if (distractionFree) {
    return (
      <FullscreenMode
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        mode={mode}
        running={running}
        onToggleRunning={() => setRunning((r) => !r)}
        onExit={() => setDistractionFree(false)}
      />
    );
  }

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Focus Timer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Distraction-free deep work sessions
        </p>
      </div>

      {/* Main timer card */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden relative">
        {/* Gradient glow background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />

        <CardContent className="p-8 relative">
          {/* Mode toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={mode === "focus" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("focus")}
              className="gap-2 rounded-lg"
            >
              <Brain className="w-3.5 h-3.5" />
              Focus
            </Button>
            <Button
              variant={mode === "break" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("break")}
              className="gap-2 rounded-lg"
            >
              <Coffee className="w-3.5 h-3.5" />
              Break
            </Button>
          </div>

          {/* Timer display */}
          <CircularTimer
            secondsLeft={secondsLeft}
            totalSeconds={totalSeconds}
            mode={mode}
            size="sm"
          />

          {/* Controls */}
          <div className="flex justify-center gap-2 mt-8 flex-wrap">
            <Button
              size="lg"
              onClick={() => setRunning((r) => !r)}
              className="gap-2 rounded-xl min-w-[140px]"
            >
              {running ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleReset}
              disabled={running}
              className="gap-2 rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setDistractionFree(true)}
              className="gap-2 rounded-xl"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Lock UI</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled((s) => !s)}
              className="rounded-xl"
              title={soundEnabled ? "Mute notifications" : "Enable notifications"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Preset selector */}
        <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Preset
          </Label>
          <Select value={preset} onValueChange={(v: PresetKey) => setPreset(v)}>
            <SelectTrigger className="rounded-lg h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{config.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {config.focus}/{config.break}m
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Subject selector */}
        <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Subject <span className="normal-case">(optional)</span>
          </Label>
          {subjectsLoading ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : (
            <Select
              value={subjectId || "none"}
              onValueChange={(v) => setSubjectId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="rounded-lg h-10">
                <SelectValue placeholder="None" />
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
          )}
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 text-center border-border/50 bg-card/60 backdrop-blur-sm">
          {sessionsLoading ? (
            <Skeleton className="h-10 w-16 mx-auto mb-2" />
          ) : (
            <div className="text-4xl font-extrabold bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent tabular-nums">
              {completedToday}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium mt-1">
            Sessions today
          </div>
        </Card>

        <Card className="p-5 text-center border-border/50 bg-card/60 backdrop-blur-sm">
          {sessionsLoading ? (
            <Skeleton className="h-10 w-16 mx-auto mb-2" />
          ) : (
            <div className="text-4xl font-extrabold bg-gradient-to-br from-emerald-500 to-green-600 bg-clip-text text-transparent tabular-nums">
              {completedToday * PRESETS[preset].focus}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium mt-1">
            Minutes focused
          </div>
        </Card>
      </div>

      {/* Quality feedback dialog */}
      <QualityDialog
        open={qualityDialogOpen}
        onOpenChange={setQualityDialogOpen}
        onSave={handleSaveQuality}
        onSkip={handleSkipQuality}
      />
    </div>
  );
};

export default Focus;