import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/ai/stats
// Returns AI Tools dashboard statistics + recent generations
export async function GET() {
  try {
    const totalGenerations = await db.aiGeneration.count();
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentGens = await db.aiGeneration.findMany({
      where: { createdAt: { gte: last30Days } },
      select: { tokensUsed: true, tool: true },
    });
    const tokensUsed30d = recentGens.reduce((sum, g) => sum + g.tokensUsed, 0);

    // Count distinct tools used
    const toolCounts = await db.aiGeneration.groupBy({
      by: ["tool"],
      _count: { _all: true },
    });
    const activeTools = toolCounts.length;

    // Per-tool stats
    const toolStats = await Promise.all(
      [
        "product-writer",
        "blog-post",
        "seo-meta",
        "email-campaign",
        "banner",
        "customer-reply",
      ].map(async (tool) => {
        const count = await db.aiGeneration.count({ where: { tool } });
        const last = await db.aiGeneration.findFirst({
          where: { tool },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        return {
          tool,
          count,
          lastUsed: last?.createdAt || null,
        };
      })
    );

    // Recent generations (last 10)
    const recent = await db.aiGeneration.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        tool: true,
        input: true,
        createdAt: true,
        tokensUsed: true,
      },
    });

    return NextResponse.json({
      totalGenerations,
      tokensUsed30d,
      activeTools,
      toolStats,
      recent,
    });
  } catch (err) {
    console.error("[ai/stats] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch AI stats" },
      { status: 500 }
    );
  }
}
