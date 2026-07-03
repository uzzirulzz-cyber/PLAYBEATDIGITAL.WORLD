import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI generation can take a while

// POST /api/ai/generate
// Body: { tool: string, input: string, options?: Record<string, unknown> }
// Returns: { ok, output, imageUrl?, generationId }
//
// Tools:
//   product-writer   — generate product title + description from bullet points
//   blog-post        — write SEO blog post from topic
//   seo-meta         — generate meta title/description/slug from URL or topic
//   email-campaign   — write email sequence from product/campaign info
//   banner           — generate promotional banner image (returns base64 image)
//   customer-reply   — draft support reply from customer message
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      tool?: string;
      input?: string;
      options?: Record<string, unknown>;
    };

    const tool = body.tool;
    const input = body.input?.trim();

    if (!tool || !input) {
      return NextResponse.json(
        { ok: false, error: "Missing tool or input" },
        { status: 400 }
      );
    }

    const VALID_TOOLS = [
      "product-writer",
      "blog-post",
      "seo-meta",
      "email-campaign",
      "banner",
      "customer-reply",
    ];
    if (!VALID_TOOLS.includes(tool)) {
      return NextResponse.json(
        { ok: false, error: `Invalid tool. Must be one of: ${VALID_TOOLS.join(", ")}` },
        { status: 400 }
      );
    }

    // Banner tool uses image generation, all others use LLM
    if (tool === "banner") {
      return await generateBanner(input, body.options);
    }

    return await generateText(tool, input, body.options);
  } catch (err) {
    console.error("[ai/generate] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 }
    );
  }
}

// ── LLM text generation ───────────────────────────────────────────────────

async function generateText(
  tool: string,
  input: string,
  options?: Record<string, unknown>
) {
  const { systemPrompt, userPrompt } = buildPrompts(tool, input, options);

  // Dynamic import of z-ai-web-dev-sdk (server-only)
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  });

  const output = completion.choices[0]?.message?.content || "";
  const tokensUsed = completion.usage?.total_tokens || Math.ceil(output.length / 4);

  // Save generation to DB
  const gen = await db.aiGeneration.create({
    data: { tool, input, output, tokensUsed },
  });

  return NextResponse.json({
    ok: true,
    output,
    generationId: gen.id,
    tokensUsed,
  });
}

// ── Image generation (banner) ─────────────────────────────────────────────

async function generateBanner(
  input: string,
  options?: Record<string, unknown>
) {
  const size = (options?.size as string) || "1344x768";
  const style = (options?.style as string) || "modern, vibrant, professional";

  const prompt = `${input}. Style: ${style}. High quality, detailed, suitable for a website banner.`;

  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();

  const response = await zai.images.generations.create({
    prompt,
    size: size as
      | "1024x1024"
      | "768x1344"
      | "864x1152"
      | "1344x768"
      | "1152x864"
      | "1440x720"
      | "720x1440",
  });

  const imageBase64 = response.data[0]?.base64;
  if (!imageBase64) {
    return NextResponse.json(
      { ok: false, error: "Image generation returned no data" },
      { status: 502 }
    );
  }

  // Return as data URL so frontend can display directly
  const imageUrl = `data:image/png;base64,${imageBase64}`;

  // Save generation to DB (store a truncated reference, not the full base64)
  const gen = await db.aiGeneration.create({
    data: {
      tool: "banner",
      input,
      output: `[Generated banner image — ${size}]`,
      tokensUsed: 1,
    },
  });

  return NextResponse.json({
    ok: true,
    imageUrl,
    generationId: gen.id,
  });
}

// ── Prompt builders ───────────────────────────────────────────────────────

function buildPrompts(
  tool: string,
  input: string,
  options?: Record<string, unknown>
): { systemPrompt: string; userPrompt: string } {
  switch (tool) {
    case "product-writer":
      return {
        systemPrompt:
          "You are an expert e-commerce copywriter. Write compelling product titles and descriptions that drive sales. Use persuasive, benefit-focused language. Format output as: TITLE: <title>\nDESCRIPTION: <description>",
        userPrompt: `Generate a product title and description for a digital product. Key features/bullet points:\n\n${input}\n\nWrite an attention-grabbing title (max 60 chars) and a 2-3 paragraph description.`,
      };

    case "blog-post":
      return {
        systemPrompt:
          "You are a professional SEO content writer. Write engaging, well-structured blog posts with proper headings (H2, H3), optimized for search engines. Use markdown formatting.",
        userPrompt: `Write a blog post about: ${input}\n\nInclude:\n- An engaging title\n- Introduction\n- 3-5 main sections with H2 headings\n- A conclusion\n- Keep it 800-1200 words\n- Use markdown formatting`,
      };

    case "seo-meta":
      return {
        systemPrompt:
          "You are an SEO specialist. Generate optimized meta tags that improve click-through rates from search results. Be concise and keyword-focused.",
        userPrompt: `Generate SEO meta tags for: ${input}\n\nProvide:\nMETA TITLE: (50-60 chars, compelling, keyword-rich)\nMETA DESCRIPTION: (150-160 chars, persuasive, includes CTA)\nSLUG: (url-friendly, lowercase, hyphens)\nKEYWORDS: (5-7 comma-separated)\n\nFormat each on a new line.`,
      };

    case "email-campaign":
      return {
        systemPrompt:
          "You are an expert email marketing copywriter. Write high-converting email sequences that drive engagement and sales. Use proven frameworks like AIDA. Be personal and conversational.",
        userPrompt: `Write an email campaign for: ${input}\n\nCreate a 3-email sequence:\n\nEMAIL 1 (Welcome/Announcement):\nSubject: \nBody: (150-200 words)\n\nEMAIL 2 (Value/Benefit):\nSubject: \nBody: (150-200 words)\n\nEMAIL 3 (Call to Action/Urgency):\nSubject: \nBody: (150-200 words)\n\nUse markdown formatting with clear separators between emails.`,
      };

    case "customer-reply":
      return {
        systemPrompt:
          "You are a professional customer support agent. Write clear, empathetic, and helpful replies that resolve customer issues. Be polite, concise, and action-oriented.",
        userPrompt: `A customer sent this message:\n\n"${input}"\n\nDraft a professional support reply that:\n1. Acknowledges their concern\n2. Provides a clear solution or next steps\n3. Offers additional help\n\nKeep it 100-150 words, friendly and professional.`,
      };

    default:
      return {
        systemPrompt: "You are a helpful assistant.",
        userPrompt: input,
      };
  }
}
