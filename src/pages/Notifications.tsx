import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCheck, AlertTriangle, Info, Sparkles, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Notifications = () => {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Notifications · Synapse Forge";
    if (user) load();
  }, [user?.id]);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    setList(data ?? []);
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    load();
  };

  const icon = (k: string) => k === "warning" ? <AlertTriangle className="w-4 h-4 text-warning" /> : k === "success" ? <Sparkles className="w-4 h-4 text-success" /> : <Info className="w-4 h-4 text-primary" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Bell className="w-7 h-7 text-primary" />Notifications</h1>
          <p className="text-muted-foreground">Smart, AI-powered nudges. Never spam.</p>
        </div>
        {list.some(n => !n.read) && <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="w-4 h-4" />Mark all read</Button>}
      </div>

      {list.length === 0 ? (
        <Card className="p-12 text-center glass"><Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No notifications yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {list.map(n => (
            <Card key={n.id} className={`p-4 glass flex items-start gap-3 ${!n.read ? "border-primary/40" : ""}`}>
              <div className="mt-0.5">{icon(n.kind)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-xs text-muted-foreground/70 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
