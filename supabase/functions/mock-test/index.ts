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
    const { action, topic, num_questions = 5, difficulty = "medium", test_id, user_answers } = await req.json();

    // Generate questions
    if (action === "generate") {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You generate mock test questions for students. Difficulty: ${difficulty}. Return MCQs with 4 options each.` },
            { role: "user", content: `Topic: ${topic}. Generate ${num_questions} multiple choice questions.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_quiz",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correct_index: { type: "integer", description: "0-based index of correct option" },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correct_index", "explanation"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_quiz" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Add AI credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway ${aiResp.status}`);
      }
      const data = await aiResp.json();
      const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}");
      const { data: row } = await admin.from("mock_tests").insert({
        user_id: user.id, topic, questions: args.questions, total: args.questions.length,
        duration_minutes: Math.max(5, num_questions * 2),
      }).select().single();
      return new Response(JSON.stringify(row), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Submit answers + get analysis
    if (action === "submit") {
      const { data: test } = await admin.from("mock_tests").select("*").eq("id", test_id).eq("user_id", user.id).single();
      if (!test) throw new Error("Test not found");
      const qs = test.questions as any[];
      const score = qs.reduce((a, q, i) => a + (user_answers[i] === q.correct_index ? 1 : 0), 0);

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Student scored ${score}/${qs.length} on ${test.topic}. Wrong questions: ${qs.map((q, i) => user_answers[i] !== q.correct_index ? q.question : null).filter(Boolean).join("; ")}. Give 3-line performance analysis with strengths, weaknesses, next steps. Casual Hindi-English ok.`,
          }],
        }),
      });
      const adata = await aiResp.json();
      const analysis = adata.choices?.[0]?.message?.content || `You scored ${score}/${qs.length}.`;

      await admin.from("mock_tests").update({ user_answers, score, completed: true, analysis }).eq("id", test_id);
      // Save as test_score so it impacts weak topics
      await admin.from("test_scores").insert({ user_id: user.id, title: `Mock: ${test.topic}`, score, max_score: qs.length });
      return new Response(JSON.stringify({ score, total: qs.length, analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("mock-test:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
