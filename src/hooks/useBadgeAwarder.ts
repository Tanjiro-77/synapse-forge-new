import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BADGES } from "@/lib/study";
import { toast } from "sonner";

export const useBadgeAwarder = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [{ data: profile }, { data: badges }, { count: chCount }, { data: sessions }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("badges").select("code").eq("user_id", user.id),
        supabase.from("chapters").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("focus_sessions").select("id").eq("user_id", user.id).limit(1),
      ]);
      const owned = new Set((badges ?? []).map((b: any) => b.code));
      const toAdd: any[] = [];
      const tryAdd = (code: string) => {
        if (!owned.has(code)) {
          const b = BADGES.find(x => x.code === code);
          if (b) toAdd.push({ user_id: user.id, code: b.code, name: b.name, description: b.description });
        }
      };
      if ((sessions?.length ?? 0) > 0) tryAdd("first_session");
      if ((profile?.current_streak ?? 0) >= 3) tryAdd("streak_3");
      if ((profile?.current_streak ?? 0) >= 7) tryAdd("streak_7");
      if ((profile?.current_streak ?? 0) >= 30) tryAdd("streak_30");
      if ((profile?.level ?? 1) >= 5) tryAdd("level_5");
      if ((profile?.level ?? 1) >= 10) tryAdd("level_10");
      if ((chCount ?? 0) >= 10) tryAdd("ten_chapters");

      if (toAdd.length > 0) {
        await supabase.from("badges").insert(toAdd);
        toAdd.forEach(b => toast.success(`🏆 Badge unlocked: ${b.name}`));
      }
    };
    check();
  }, [user?.id]);
};
