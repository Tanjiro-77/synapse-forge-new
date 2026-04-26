import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { BADGES } from "@/lib/study";
import { Trophy, Flame, Star, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";

const Rewards = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [earned, setEarned] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Rewards · Synapse Forge";
    if (!user) return;
    supabase.from("badges").select("*").eq("user_id", user.id).then(({ data }) => setEarned(data ?? []));
  }, [user?.id]);

  const earnedCodes = new Set(earned.map(b => b.code));
  const xpInLevel = (profile?.xp ?? 0) % 500;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in-up">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="w-7 h-7 text-primary" />Rewards</h1>
        <p className="text-muted-foreground">Discipline pays. Collect them all.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 glass text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full gradient-primary opacity-30 blur-2xl" />
          <Star className="w-8 h-8 mx-auto text-primary mb-2" />
          <div className="text-4xl font-bold text-gradient">Lv {profile?.level ?? 1}</div>
          <div className="text-xs text-muted-foreground mt-1">Current level</div>
        </Card>
        <Card className="p-5 glass text-center">
          <Trophy className="w-8 h-8 mx-auto text-warning mb-2" />
          <div className="text-4xl font-bold">{profile?.xp ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Total XP</div>
        </Card>
        <Card className="p-5 glass text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full gradient-streak opacity-30 blur-2xl" />
          <Flame className="w-8 h-8 mx-auto text-streak flame-pulse mb-2" />
          <div className="text-4xl font-bold">{profile?.current_streak ?? 0}d</div>
          <div className="text-xs text-muted-foreground mt-1">Best: {profile?.best_streak ?? 0} days</div>
        </Card>
      </div>

      <Card className="p-5 glass">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Level progress</span>
          <span className="text-muted-foreground">{xpInLevel} / 500 XP to level {(profile?.level ?? 1) + 1}</span>
        </div>
        <Progress value={(xpInLevel / 500) * 100} className="h-3" />
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Badges ({earned.length}/{BADGES.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BADGES.map(b => {
            const got = earnedCodes.has(b.code);
            const meta = earned.find(e => e.code === b.code);
            return (
              <Card key={b.code} className={`p-4 glass text-center transition-all ${got ? "shadow-elegant" : "opacity-60"}`}>
                <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2 ${got ? "gradient-primary" : "bg-muted"}`}>
                  {got ? <Trophy className="w-7 h-7 text-primary-foreground" /> : <Lock className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="font-semibold text-sm">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{b.description}</div>
                {got && meta && <div className="text-[10px] text-primary mt-1">Earned {format(parseISO(meta.earned_at), "MMM d")}</div>}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Rewards;
