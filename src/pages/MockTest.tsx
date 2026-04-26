import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Calendar,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/* ═══════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════ */
const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const MAX_TOPIC_LENGTH = 100;

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
  medium: { label: "Medium", color: "text-blue-600", bgColor: "bg-blue-500/10" },
  hard: { label: "Hard", color: "text-red-600", bgColor: "bg-red-500/10" },
} as const;

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */
type Difficulty = typeof DIFFICULTIES[number];

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface MockTest {
  id: string;
  topic: string;
  difficulty: Difficulty;
  duration_minutes: number;
  questions: Question[];
}

interface TestResult {
  score: number;
  total: number;
  analysis: string;
  correct_indices: number[];
}

interface HistoryItem {
  id: string;
  topic: string;
  difficulty: Difficulty;
  score: number;
  total: number;
  created_at: string;
  completed: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   Hooks
═══════════════════════════════════════════════════════════════ */
const useTestHistory = (userId: string | undefined) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mock_tests")
        .select("id, topic, difficulty, score, total, created_at, completed")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data ?? []);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, loading, reload: load };
};

/* ═══════════════════════════════════════════════════════════════
   Sub-Components
═══════════════════════════════════════════════════════════════ */

/* ── Timer display ── */
interface TimerProps {
  secondsLeft: number;
  totalSeconds: number;
}

const Timer = ({ secondsLeft, totalSeconds }: TimerProps) => {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const isLowTime = secondsLeft < 60;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 font-bold tabular-nums text-lg",
          isLowTime && "text-red-500 animate-pulse",
        )}
      >
        <Clock className="w-4 h-4" />
        {formatTime(secondsLeft)}
      </div>
      <Progress
        value={progress}
        className="h-1 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-500"
      />
    </div>
  );
};

/* ── Question card ── */
interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selectedAnswer: number | undefined;
  onSelectAnswer: (optionIndex: number) => void;
  showResult?: boolean;
  userAnswer?: number;
}

const QuestionCard = ({
  question,
  index,
  total,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  userAnswer,
}: QuestionCardProps) => {
  const isCorrect = showResult && userAnswer === question.correct_index;
  const isIncorrect = showResult && userAnswer !== undefined && userAnswer !== question.correct_index;

  return (
    <Card
      className={cn(
        "border-border/50 bg-card/60 backdrop-blur-sm",
        showResult && isCorrect && "border-emerald-500/40 bg-emerald-500/5",
        showResult && isIncorrect && "border-red-500/40 bg-red-500/5",
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          {showResult && (
            <div className="shrink-0 mt-0.5">
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="h-5 text-xs">
                {index + 1}/{total}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm leading-relaxed">{question.question}</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === optionIndex;
          const isCorrectOption = optionIndex === question.correct_index;
          const showAsCorrect = showResult && isCorrectOption;
          const showAsWrong = showResult && isSelected && !isCorrectOption;

          return (
            <button
              key={optionIndex}
              onClick={() => !showResult && onSelectAnswer(optionIndex)}
              disabled={showResult}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all duration-200",
                "hover:bg-muted/40 active:scale-[0.99]",
                isSelected && !showResult && "border-primary bg-primary/10",
                !isSelected && !showResult && "border-border",
                showAsCorrect && "border-emerald-500 bg-emerald-500/10",
                showAsWrong && "border-red-500 bg-red-500/10",
                showResult && !showAsCorrect && !showAsWrong && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  {String.fromCharCode(65 + optionIndex)}.
                </span>
                <span className="text-sm">{option}</span>
                {showAsCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                {showAsWrong && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
              </div>
            </button>
          );
        })}

        {/* Explanation (only in result view) */}
        {showResult && question.explanation && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Explanation:</p>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              {question.explanation}
            </p>
          </div>
        )}

        {/* Show correct answer if wrong */}
        {showResult && userAnswer !== undefined && userAnswer !== question.correct_index && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-xs font-medium text-emerald-600 mb-1">Correct Answer:</p>
            <p className="text-sm text-foreground">{question.options[question.correct_index]}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Test configuration form ── */
interface ConfigFormProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onGenerate: () => void;
  loading: boolean;
}

const ConfigForm = ({
  topic,
  onTopicChange,
  questionCount,
  onQuestionCountChange,
  difficulty,
  onDifficultyChange,
  onGenerate,
  loading,
}: ConfigFormProps) => {
  return (
    <Card className="p-6 border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="space-y-5">
        {/* Topic */}
        <div className="space-y-2">
          <Label htmlFor="test-topic" className="text-sm font-medium">
            Topic
          </Label>
          <Input
            id="test-topic"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder="e.g. Quadratic Equations, Newton's Laws, Cell Biology"
            maxLength={MAX_TOPIC_LENGTH}
            disabled={loading}
            className="rounded-xl h-11"
          />
          <p className="text-xs text-muted-foreground">
            {topic.length}/{MAX_TOPIC_LENGTH} characters
          </p>
        </div>

        {/* Question count & Difficulty */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="question-count" className="text-sm font-medium">
              Number of Questions
            </Label>
            <Select
              value={String(questionCount)}
              onValueChange={(v) => onQuestionCountChange(Number(v))}
              disabled={loading}
            >
              <SelectTrigger id="question-count" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_COUNTS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-sm font-medium">
              Difficulty
            </Label>
            <Select
              value={difficulty}
              onValueChange={(v: Difficulty) => onDifficultyChange(v)}
              disabled={loading}
            >
              <SelectTrigger id="difficulty" className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => {
                  const config = DIFFICULTY_CONFIG[d];
                  return (
                    <SelectItem key={d} value={d}>
                      <span className={config.color}>{config.label}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={onGenerate}
          disabled={loading || !topic.trim()}
          className="w-full h-11 rounded-xl gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating test...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Mock Test
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

/* ── Results summary ── */
interface ResultsSummaryProps {
  result: TestResult;
  test: MockTest;
}

const ResultsSummary = ({ result, test }: ResultsSummaryProps) => {
  const percentage = Math.round((result.score / result.total) * 100);
  const passed = percentage >= 70;

  return (
    <Card className="p-8 text-center border-border/50 bg-card/60 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Trophy className={cn("w-8 h-8", passed ? "text-primary" : "text-muted-foreground")} />
      </div>

      <div className="text-6xl font-extrabold bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent mb-2 tabular-nums">
        {result.score}/{result.total}
      </div>

      <div className="text-lg font-semibold text-muted-foreground mb-1">
        {percentage}% Score
      </div>

      <Badge
        variant="outline"
        className={cn(
          "mt-2",
          passed
            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
            : "border-amber-500/40 text-amber-600 bg-amber-500/10",
        )}
      >
        {passed ? "Passed" : "Needs Improvement"}
      </Badge>

      {/* AI Analysis */}
      {result.analysis && (
        <div className="mt-6 p-4 rounded-xl bg-muted/30 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            AI Analysis
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {result.analysis}
          </p>
        </div>
      )}
    </Card>
  );
};

/* ── History item ── */
interface HistoryItemCardProps {
  item: HistoryItem;
}

const HistoryItemCard = ({ item }: HistoryItemCardProps) => {
  const percentage = Math.round((item.score / item.total) * 100);
  const passed = percentage >= 70;
  const difficultyConfig = DIFFICULTY_CONFIG[item.difficulty];

  return (
    <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm hover:border-border hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate mb-1">{item.topic}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(item.created_at), "MMM d, yyyy")}
            </div>
            <Badge variant="outline" className={cn("h-5 text-[10px]", difficultyConfig.bgColor, difficultyConfig.color, "border-0")}>
              {difficultyConfig.label}
            </Badge>
          </div>
        </div>

        <div className="text-right shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "h-7 px-2.5 text-sm font-bold tabular-nums",
              passed
                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                : "border-amber-500/40 text-amber-600 bg-amber-500/10",
            )}
          >
            {item.score}/{item.total}
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">{percentage}%</div>
        </div>
      </div>
    </Card>
  );
};

/* ── Submit confirmation dialog ── */
interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answeredCount: number;
  totalCount: number;
  onConfirm: () => void;
}

const SubmitDialog = ({
  open,
  onOpenChange,
  answeredCount,
  totalCount,
  onConfirm,
}: SubmitDialogProps) => {
  const unanswered = totalCount - answeredCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Submit Test?
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {unanswered > 0 ? (
              <>
                You have <strong>{unanswered}</strong> unanswered{" "}
                {unanswered === 1 ? "question" : "questions"}. Are you sure you want to submit?
              </>
            ) : (
              "All questions answered. Submit your test to see results?"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Keep Working</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-xl">
            Submit Test
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
const MockTest = () => {
  const { user } = useAuth();
  const { history, loading: historyLoading, reload: reloadHistory } = useTestHistory(user?.id);

  // Config state
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  // Test state
  const [test, setTest] = useState<MockTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Mock Test · Synapse Forge";
  }, []);

  /* ── Timer countdown ── */
  useEffect(() => {
    if (!test || result || secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, test, result]);

  /* ── Generate test ── */
  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setGenerating(true);
    setResult(null);
    setAnswers({});

    try {
      const { data, error } = await supabase.functions.invoke("mock-test", {
        body: {
          action: "generate",
          topic: topic.trim(),
          num_questions: questionCount,
          difficulty,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const testData = data as MockTest;
      setTest(testData);
      setSecondsLeft(testData.duration_minutes * 60);
      toast.success("Test generated! Timer started.");
    } catch (error: any) {
      toast.error(error.message ?? "Failed to generate test");
    } finally {
      setGenerating(false);
    }
  };

  /* ── Auto-submit when time runs out ── */
  const handleAutoSubmit = async () => {
    toast.warning("Time's up! Submitting test...");
    await handleSubmit();
  };

  /* ── Submit test ── */
  const handleSubmit = async () => {
    if (!test || !user) return;

    setSubmitting(true);
    try {
      const userAnswers = test.questions.map((_, i) => answers[i] ?? -1);

      const { data, error } = await supabase.functions.invoke("mock-test", {
        body: {
          action: "submit",
          test_id: test.id,
          user_answers: userAnswers,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setResult(data as TestResult);
      toast.success("Test submitted successfully!");
      reloadHistory();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to submit test");
    } finally {
      setSubmitting(false);
      setSubmitDialogOpen(false);
    }
  };

  /* ── Reset test ── */
  const handleReset = () => {
    setTest(null);
    setResult(null);
    setAnswers({});
    setTopic("");
    setQuestionCount(5);
    setDifficulty("medium");
  };

  /* ── Stats ── */
  const answeredCount = Object.keys(answers).length;
  const totalSeconds = test ? test.duration_minutes * 60 : 0;

  /* ─────────────────────────────────────────── render ── */
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center justify-center gap-2">
          <FlaskConical className="w-7 h-7 text-primary" />
          Mock Test
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated practice tests tailored to any topic
        </p>
      </div>

      {/* Config form (before test) */}
      {!test && (
        <ConfigForm
          topic={topic}
          onTopicChange={setTopic}
          questionCount={questionCount}
          onQuestionCountChange={setQuestionCount}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onGenerate={handleGenerate}
          loading={generating}
        />
      )}

      {/* Test header (during test) */}
      {test && !result && (
        <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm sticky top-16 z-20 shadow-lg">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{test.topic}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Target className="w-3 h-3" />
                {answeredCount}/{test.questions.length} answered
              </div>
            </div>

            <Timer secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
          </div>
        </Card>
      )}

      {/* Questions (during test) */}
      {test && !result && (
        <>
          <div className="space-y-4">
            {test.questions.map((q, i) => (
              <QuestionCard
                key={i}
                question={q}
                index={i}
                total={test.questions.length}
                selectedAnswer={answers[i]}
                onSelectAnswer={(optionIndex) =>
                  setAnswers((prev) => ({ ...prev, [i]: optionIndex }))
                }
              />
            ))}
          </div>

          {/* Submit button */}
          <Button
            onClick={() => setSubmitDialogOpen(true)}
            disabled={submitting}
            className="w-full h-12 rounded-xl gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Test
              </>
            )}
          </Button>
        </>
      )}

      {/* Results */}
      {result && test && (
        <>
          <ResultsSummary result={result} test={test} />

          {/* Question review */}
          <div className="space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Question Review
            </h2>
            {test.questions.map((q, i) => (
              <QuestionCard
                key={i}
                question={q}
                index={i}
                total={test.questions.length}
                selectedAnswer={answers[i]}
                onSelectAnswer={() => { }}
                showResult
                userAnswer={answers[i]}
              />
            ))}
          </div>

          {/* New test button */}
          <Button onClick={handleReset} variant="outline" className="w-full h-11 rounded-xl gap-2">
            <RotateCcw className="w-4 h-4" />
            Take Another Test
          </Button>
        </>
      )}

      {/* History (when no active test) */}
      {!test && history.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Recent Tests
          </h2>
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <HistoryItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit confirmation dialog */}
      <SubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        answeredCount={answeredCount}
        totalCount={test?.questions.length ?? 0}
        onConfirm={handleSubmit}
      />
    </div>
  );
};

export default MockTest;