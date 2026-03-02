import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

const MODELS = [
  { provider: "novita", model: "meta-llama/Llama-3.1-8B-Instruct" },
  { provider: "novita", model: "Qwen/Qwen2.5-72B-Instruct" },
  { provider: "sambanova", model: "Meta-Llama-3.1-8B-Instruct" },
  { provider: "together", model: "meta-llama/Llama-3.2-3B-Instruct-Turbo" },
  { provider: "together", model: "Qwen/Qwen2.5-7B-Instruct-Turbo" },
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

    for (const { provider, model } of MODELS) {
      try {
        console.log(`[analyze] Trying provider=${provider} model=${model}`);

        const client = new InferenceClient(HF_TOKEN);

        const result = await client.chatCompletion({
          provider,
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0.25,
        });

        const text = result.choices?.[0]?.message?.content?.trim();

        if (text && text.length > 20) {
          console.log(
            `[analyze] ✅ Success — provider=${provider} model=${model}`,
          );
          return NextResponse.json({ result: text, provider, model });
        }

        console.log(`[analyze] Empty response from ${provider}/${model}`);
      } catch (err) {
        console.log(`[analyze] ❌ ${provider}/${model} → ${err.message}`);
      }
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
