import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BarChart3 } from "lucide-react";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))","hsl(var(--secondary))","hsl(var(--accent))","hsl(var(--warning))","hsl(var(--destructive))","hsl(var(--success))"];

const Analytics = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", score: 0, max_score: 100, subject_id: "", test_date: format(new Date(), "yyyy-MM-dd") });

  const load = async () => {
    if (!user) return;
    const since = format(subDays(new Date(), 29), "yyyy-MM-dd");
    const [a, b, c, d] = await Promise.all([
      supabase.from("focus_sessions").select("*").eq("user_id", user.id).gte("session_date", since),
      supabase.from("test_scores").select("*, subjects(name,color)").eq("user_id", user.id).order("test_date"),
      supabase.from("chapters").select("status, subject_id, subjects(name,color)").eq("user_id", user.id),
      supabase.from("subjects").select("*").eq("user_id", user.id),
    ]);
    setSessions(a.data ?? []); setScores(b.data ?? []);
    setChapters(c.data ?? []); setSubjects(d.data ?? []);
  };
  useEffect(() => { document.title = "Analytics · Synapse Forge"; load(); /* eslint-disable-next-line */ }, [user?.id]);

  const addScore = async () => {
    if (!user || !form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("test_scores").insert({
      user_id: user.id, title: form.title.trim(), score: form.score, max_score: form.max_score,
      subject_id: form.subject_id || null, test_date: form.test_date,
    });
    if (error) toast.error(error.message); else { toast.success("Score logged"); setOpen(false); setForm({...form, title: "", score: 0}); load(); }
  };

  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }).map(d => {
    const ds = format(d, "yyyy-MM-dd");
    const min = sessions.filter(s => s.session_date === ds).reduce((a, s) => a + s.duration_minutes, 0);
    return { date: format(d, "MMM d"), minutes: min };
  });

  const subjectMinutes = subjects.map(s => ({
    name: s.name,
    minutes: sessions.filter(x => x.subject_id === s.id).reduce((a, x) => a + x.duration_minutes, 0),
  })).filter(x => x.minutes > 0);

  const statusData = [
    { name: "Completed", v: chapters.filter(c => c.status === "completed").length },
    { name: "In Progress", v: chapters.filter(c => c.status === "in_progress").length },
    { name: "Needs Revision", v: chapters.filter(c => c.status === "needs_revision").length },
    { name: "Not Started", v: chapters.filter(c => c.status === "not_started").length },
  ].filter(x => x.v > 0);

  const scoreTrend = scores.map(s => ({
    date: format(parseISO(s.test_date), "MMM d"),
    pct: Math.round((Number(s.score) / Number(s.max_score)) * 100),
    title: s.title,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="w-7 h-7 text-primary" />Analytics</h1>
          <p className="text-muted-foreground">Insights to sharpen your strategy</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="w-4 h-4" />Test score</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log test score</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Test name</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} maxLength={150} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Score</Label><Input type="number" value={form.score} onChange={(e) => setForm({...form, score: Number(e.target.value)})} /></div>
                <div><Label>Out of</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({...form, max_score: Number(e.target.value)})} /></div>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.test_date} onChange={(e) => setForm({...form, test_date: e.target.value})} /></div>
              <div><Label>Subject</Label>
                <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({...form, subject_id: v === "none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button variant="hero" onClick={addScore}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5 glass">
        <h2 className="font-semibold mb-4">Study consistency (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={last30}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 glass">
          <h2 className="font-semibold mb-4">Time per subject</h2>
          {subjectMinutes.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> :
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={subjectMinutes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="minutes" fill="hsl(var(--secondary))" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        </Card>

        <Card className="p-5 glass">
          <h2 className="font-semibold mb-4">Chapter status</h2>
          {statusData.length === 0 ? <p className="text-sm text-muted-foreground">No chapters yet.</p> :
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          }
        </Card>
      </div>

      <Card className="p-5 glass">
        <h2 className="font-semibold mb-4">Test score trend</h2>
        {scoreTrend.length === 0 ? <p className="text-sm text-muted-foreground">Log your first test score to see the trend.</p> :
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={scoreTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="pct" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      </Card>
    </div>
  );
};

export default Analytics;
