import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Atom, Plus, Minus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const QUICK = [
  { title: "Solve 5 questions", target: 5 },
  { title: "Revise 2 pages", target: 2 },
  { title: "Watch 1 lecture", target: 1 },
  { title: "Make 3 flashcards", target: 3 },
];

const MicroGoals = () => {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("5");

  useEffect(() => {
    document.title = "Micro-Goals · Synapse Forge";
    if (user) load();
  }, [user?.id]);

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const { data } = await supabase.from("micro_goals").select("*").eq("user_id", user!.id).eq("goal_date", today).order("created_at");
    setList(data ?? []);
  };

  const add = async (t?: string, tg?: number) => {
    const finalTitle = t || title;
    const finalTarget = tg || Number(target);
    if (!finalTitle) return toast.error("Add a title");
    await supabase.from("micro_goals").insert({ user_id: user!.id, title: finalTitle, target_count: finalTarget });
    setTitle("");
    load();
  };

  const update = async (id: string, delta: number, current: number, target: number) => {
    const next = Math.max(0, Math.min(target, current + delta));
    await supabase.from("micro_goals").update({ completed_count: next }).eq("id", id);
    if (next === target && current < target) toast.success("🎉 Micro-goal smashed!");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("micro_goals").delete().eq("id", id);
    load();
  };

  const done = list.filter(g => g.completed_count >= g.target_count).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in-up">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Atom className="w-7 h-7 text-primary" />Micro-Goals</h1>
        <p className="text-muted-foreground">Tiny atomic wins. Today: <span className="font-semibold text-success">{done}/{list.length}</span></p>
      </div>

      <Card className="p-5 glass">
        <Label className="text-xs uppercase text-muted-foreground">Add custom</Label>
        <div className="flex gap-2 mt-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Solve 10 trig problems" />
          <Input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-24" />
          <Button variant="hero" onClick={() => add()}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK.map(q => (
            <Button key={q.title} variant="outline" size="sm" onClick={() => add(q.title, q.target)}>
              <Sparkles className="w-3 h-3" />{q.title}
            </Button>
          ))}
        </div>
      </Card>

      {list.length === 0 ? (
        <Card className="p-12 text-center glass"><p className="text-muted-foreground">No micro-goals today. Add some above! ✨</p></Card>
      ) : (
        <div className="space-y-3">
          {list.map(g => {
            const pct = (g.completed_count / g.target_count) * 100;
            const done = g.completed_count >= g.target_count;
            return (
              <Card key={g.id} className={`p-4 glass ${done ? "border-success/40" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{g.title}</div>
                    <Progress value={pct} className="h-1.5 mt-1" />
                  </div>
                  <Button size="icon" variant="outline" onClick={() => update(g.id, -1, g.completed_count, g.target_count)}><Minus className="w-4 h-4" /></Button>
                  <span className="font-bold tabular-nums w-14 text-center">{g.completed_count}/{g.target_count}</span>
                  <Button size="icon" variant="hero" onClick={() => update(g.id, 1, g.completed_count, g.target_count)}><Plus className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MicroGoals;
