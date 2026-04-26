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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { kind = "insights", brain_mode = false } = await req.json().catch(() => ({}));

    // Gather user data snapshot
    const today = new Date().toISOString().slice(0, 10);
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [subjects, chapters, focus, scores, exams, hw, plans] = await Promise.all([
      admin.from("subjects").select("id,name").eq("user_id", user.id),
      admin.from("chapters").select("name,status,is_weak,strength,revision_count,subjects(name)").eq("user_id", user.id).limit(50),
      admin.from("focus_sessions").select("session_date,duration_minutes,focus_level,subject_id").eq("user_id", user.id).gte("session_date", sevenAgo),
      admin.from("test_scores").select("title,score,max_score,test_date,subject_id").eq("user_id", user.id).order("test_date", { ascending: false }).limit(20),
      admin.from("exams").select("title,exam_date,syllabus_completion").eq("user_id", user.id).gte("exam_date", today).order("exam_date").limit(5),
      admin.from("homework").select("title,due_date,completed,priority").eq("user_id", user.id).eq("completed", false).limit(20),
      admin.from("planner_tasks").select("title,task_date,completed,priority").eq("user_id", user.id).gte("task_date", sevenAgo),
    ]);

    const snapshot = {
      subjects: subjects.data, chapters: chapters.data, focus_last_7d: focus.data,
      recent_scores: scores.data, upcoming_exams: exams.data, pending_homework: hw.data,
      planner_last_7d: plans.data, today, brain_mode,
    };

    const systemPrompt = `You are an elite study coach AI for "Synapse Forge". Analyze the student's data and return a JSON response. Be specific, motivational, action-oriented. Reference real subject/chapter names from the data. Hindi-English casual mix is fine. Keep each text field under 140 chars.`;

    const tool = {
      type: "function",
      function: {
        name: "coach_response",
        description: "Return personalized coaching insights",
        parameters: {
          type: "object",
          properties: {
            insights: {
              type: "array", description: "3-5 deep performance insights",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  detail: { type: "string" },
                  severity: { type: "string", enum: ["positive", "neutral", "warning", "critical"] },
                },
                required: ["title", "detail", "severity"],
              },
            },
            priority_tasks: {
              type: "array", description: "Top 5 tasks the student should do today, ordered by importance",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  reason: { type: "string" },
                  urgency: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["task", "reason", "urgency"],
              },
            },
            strategy: { type: "string", description: "Overall study strategy advice for today (2-3 sentences)" },
            weak_focus: { type: "array", items: { type: "string" }, description: "Specific weak chapters/subjects to focus on" },
            backlog_plan: {
              type: "array", description: "Catch-up plan for backlog (max 4 items)",
              items: { type: "object", properties: { day: { type: "string" }, action: { type: "string" } }, required: ["day", "action"] },
            },
            brain_mode_plan: {
              type: "string", description: "If brain_mode true, give intensive 7-day exam prep plan; else empty",
            },
          },
          required: ["insights", "priority_tasks", "strategy", "weak_focus", "backlog_plan", "brain_mode_plan"],
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Student data snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nKind: ${kind}. Brain mode: ${brain_mode}.` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "coach_response" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway:", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    if (!args) throw new Error("No structured output");

    // Cache it
    await admin.from("ai_insights").insert({ user_id: user.id, kind, payload: args });

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
