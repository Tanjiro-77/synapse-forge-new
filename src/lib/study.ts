export const QUOTES = [
  "The expert in anything was once a beginner.",
  "Small daily improvements compound into stunning results.",
  "Discipline is choosing what you want most over what you want now.",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus is saying no to a thousand good ideas.",
  "The future depends on what you do today.",
  "Hard work beats talent when talent doesn't work hard.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your only limit is the one you set for yourself.",
  "Don't watch the clock; do what it does — keep going.",
];

export const dailyQuote = () => {
  const idx = new Date().getDate() % QUOTES.length;
  return QUOTES[idx];
};

export const REVISION_INTERVALS = [1, 3, 7, 15];

export const nextRevisionDate = (stage: number): Date => {
  const days = REVISION_INTERVALS[Math.min(stage, REVISION_INTERVALS.length - 1)];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  needs_revision: "Needs Revision",
};

export const STATUS_COLOR: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-secondary/20 text-secondary border-secondary/30",
  completed: "bg-success/20 text-success border-success/30",
  needs_revision: "bg-warning/20 text-warning border-warning/30",
};

export const BADGES = [
  { code: "first_session", name: "First Spark", description: "Completed your first focus session" },
  { code: "streak_3", name: "Kindled", description: "3-day study streak" },
  { code: "streak_7", name: "Blazing", description: "7-day study streak" },
  { code: "streak_30", name: "Inferno", description: "30-day study streak" },
  { code: "level_5", name: "Apprentice", description: "Reached level 5" },
  { code: "level_10", name: "Scholar", description: "Reached level 10" },
  { code: "ten_chapters", name: "Chapter Crusher", description: "Completed 10 chapters" },
  { code: "revision_master", name: "Revision Master", description: "Revised 20 chapters" },
];
