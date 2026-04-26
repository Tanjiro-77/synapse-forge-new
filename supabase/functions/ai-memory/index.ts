import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { mode = "memory" } = await req.json().catch(() => ({}));

    // Pull 30 days of behavior
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [focus, scores, plans, chapters, reflections] = await Promise.all([
      admin.from("focus_sessions").select("session_date,duration_minutes,focus_level,distraction_level,subject_id").eq("user_id", user.id).gte("session_date", since),
      admin.from("test_scores").select("score,max_score,test_date,subject_id").eq("user_id", user.id).gte("test_date", since),
      admin.from("planner_tasks").select("task_date,completed,priority").eq("user_id", user.id).gte("task_date", since),
      admin.from("chapters").select("name,is_weak,strength,subjects(name)").eq("user_id", user.id),
      admin.from("reflections").select("reflection_date,mood,studied,improve").eq("user_id", user.id).gte("reflection_date", since),
    ]);

    const tools = mode === "predict" ? [{
      type: "function",
      function: {
        name: "predict_future",
        description: "Predict future risks based on patterns",
        parameters: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prediction: { type: "string" },
                  risk_level: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string" },
                },
                required: ["prediction", "risk_level", "reason"],
              },
            },
          },
          required: ["predictions"],
        },
      },
    }] : [{
      type: "function",
      function: {
        name: "extract_patterns",
        description: "Find long-term behavioral patterns",
        parameters: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string", description: "Specific observation, e.g. 'You lose focus after 25 min'" },
                  category: { type: "string", enum: ["focus", "subject", "schedule", "mood", "performance"] },
                  confidence: { type: "integer" },
                  evidence: { type: "string" },
                },
                required: ["pattern", "category", "confidence", "evidence"],
              },
            },
          },
          required: ["patterns"],
        },
      },
    }];

    const systemPrompt = mode === "predict"
      ? "You are a predictive AI for a student. Based on their 30-day behavior data, predict 3-5 specific future risks (missed goals, backlog risk, weak subjects). Be specific, motivational, brief."
      : "You are a memory engine AI. Analyze 30 days of student behavior and extract 4-6 long-term patterns. Be very specific (mention day-of-week, durations, subjects). Hindi-English casual mix is fine.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ focus: focus.data, scores: scores.data, plans: plans.data, chapters: chapters.data, reflections: reflections.data }) },
        ],
        tools,
        tool_choice: { type: "function", function: { name: tools[0].function.name } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Add AI credits in workspace" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}");

    if (mode === "predict") {
      const expires = new Date(Date.now() + 3 * 86400000).toISOString();
      await admin.from("predictions").delete().eq("user_id", user.id);
      if (args.predictions?.length) {
        await admin.from("predictions").insert(args.predictions.map((p: any) => ({ ...p, user_id: user.id, expires_at: expires })));
        // Auto-generate notification for high risk
        for (const p of args.predictions.filter((x: any) => x.risk_level === "high").slice(0, 2)) {
          await admin.from("notifications").insert({ user_id: user.id, title: "⚠️ Risk detected", body: p.prediction, kind: "warning" });
        }
      }
    } else {
      await admin.from("memory_patterns").delete().eq("user_id", user.id);
      if (args.patterns?.length) {
        await admin.from("memory_patterns").insert(args.patterns.map((p: any) => ({ ...p, user_id: user.id })));
      }
    }

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-memory:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
