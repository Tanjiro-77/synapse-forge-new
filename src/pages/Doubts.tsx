import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Check, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const Doubts = () => {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", subject_id: "" });
  const [tab, setTab] = useState<"open"|"resolved">("open");

  const load = async () => {
    if (!user) return;
    const [{ data }, { data: s }] = await Promise.all([
      supabase.from("doubts").select("*, subjects(name,color)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("subjects").select("id,name").eq("user_id", user.id),
    ]);
    setDoubts(data ?? []); setSubjects(s ?? []);
  };
  useEffect(() => { document.title = "Doubts · Synapse Forge"; load(); /* eslint-disable-next-line */ }, [user?.id]);

  const create = async () => {
    if (!user || !form.question.trim()) { toast.error("Question required"); return; }
    const { error } = await supabase.from("doubts").insert({ user_id: user.id, question: form.question.trim(), subject_id: form.subject_id || null });
    if (error) toast.error(error.message); else { setOpen(false); setForm({ question: "", subject_id: "" }); load(); }
  };
  const resolve = async (id: string) => { await supabase.from("doubts").update({ resolved: true }).eq("id", id); load(); };
  const remove = async (id: string) => { await supabase.from("doubts").delete().eq("id", id); load(); };

  const filtered = doubts.filter(d => tab === "open" ? !d.resolved : d.resolved);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Doubts</h1>
          <p className="text-muted-foreground">Capture every question, resolve them faster</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="w-4 h-4" />Doubt</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New doubt</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Question</Label><Textarea value={form.question} onChange={(e) => setForm({...form, question: e.target.value})} maxLength={1000} rows={4} /></div>
              <div><Label>Subject</Label>
                <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({...form, subject_id: v === "none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button variant="hero" onClick={create}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "open" ? "hero" : "outline"} size="sm" onClick={() => setTab("open")}>Open ({doubts.filter(d => !d.resolved).length})</Button>
        <Button variant={tab === "resolved" ? "hero" : "outline"} size="sm" onClick={() => setTab("resolved")}>Resolved ({doubts.filter(d => d.resolved).length})</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center glass">
          <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{tab === "open" ? "No open doubts. Stay curious!" : "Nothing resolved yet."}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <Card key={d.id} className="p-4 glass group">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className={d.resolved ? "line-through text-muted-foreground" : ""}>{d.question}</p>
                  {d.subjects && <Badge variant="outline" className="mt-2" style={{ color: d.subjects.color, borderColor: d.subjects.color + "60" }}>{d.subjects.name}</Badge>}
                </div>
                <div className="flex gap-1">
                  {!d.resolved && <Button variant="ghost" size="icon" onClick={() => resolve(d.id)} title="Mark resolved"><Check className="w-4 h-4 text-success" /></Button>}
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Doubts;
