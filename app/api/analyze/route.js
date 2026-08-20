import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { responseHasPlaceholderCode } from "../../../lib/parse-ai";

const MODELS = [
  { provider: "novita", model: "meta-llama/Llama-3.1-8B-Instruct" },
  { provider: "novita", model: "Qwen/Qwen2.5-72B-Instruct" },
  { provider: "together", model: "meta-llama/Llama-3.3-70B-Instruct" },
];

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const HF_TOKEN = process.env.HF_TOKEN ?? "";

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: "HF_TOKEN is not set in environment variables." },
        { status: 500 },
      );
    }

    // A model returning *something* isn't enough — smaller models often
    // abbreviate code with placeholders despite being told not to. Keep the
    // first placeholder-free response, but hang onto the best abbreviated
    // one too in case every model flakes, rather than failing outright.
    let fallback = null;

    for (const { provider, model } of MODELS) {
      try {
        console.log(`[analyze] Trying provider=${provider} model=${model}`);

        const client = new InferenceClient(HF_TOKEN);

        const result = await client.chatCompletion({
          provider,
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 3000,
          temperature: 0.25,
        });

        const text = result.choices?.[0]?.message?.content?.trim();

        if (text && text.length > 20) {
          if (!responseHasPlaceholderCode(text)) {
            console.log(
              `[analyze] ✅ Success — provider=${provider} model=${model}`,
            );
            return NextResponse.json({ result: text, provider, model });
          }
          console.log(
            `[analyze] ⚠️ ${provider}/${model} returned placeholder code, trying next model`,
          );
          if (!fallback) fallback = { text, provider, model };
          continue;
        }

        console.log(`[analyze] Empty response from ${provider}/${model}`);
      } catch (err) {
        console.log(`[analyze] ❌ ${provider}/${model} → ${err.message}`);
      }
    }

    if (fallback) {
      console.log(
        `[analyze] All models had placeholder code — returning best-effort from ${fallback.provider}/${fallback.model}`,
      );
      return NextResponse.json({
        result: fallback.text,
        provider: fallback.provider,
        model: fallback.model,
      });
    }

    return NextResponse.json(
      {
        error:
          "All AI models are currently busy. Please try again in a moment.",
      },
      { status: 503 },
    );
  } catch (err) {
    console.error("[analyze] Request error:", err);
    return NextResponse.json(
      { error: `Request error: ${err.message}` },
      { status: 400 },
    );
  }
}
