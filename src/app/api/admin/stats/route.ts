import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
type OrderStatus = (typeof STATUSES)[number];

type TopProduct = {
  name: string;
  category: string;
  sold: number;
  revenue: number;
};

// GET /api/admin/stats — dashboard aggregates.
export async function GET() {
  try {
    // ---- totals ----
    const [allOrders, paidAgg, statusCounts, recentOrders] = await Promise.all([
      db.order.count(),
      db.order.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      db.order.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { items: true },
      }),
    ]);

    const byStatus: Record<OrderStatus, number> = {
      PENDING: 0,
      PAID: 0,
      FAILED: 0,
      REFUNDED: 0,
    };
    for (const row of statusCounts) {
      if (STATUSES.includes(row.status as OrderStatus)) {
        byStatus[row.status as OrderStatus] = row._count.status;
      }
    }

    const totalRevenue = paidAgg._sum.amount ?? 0;

    // ---- top products (by qty sold across PAID orders) ----
    const paidItems = await db.orderItem.findMany({
      where: { order: { status: "PAID" } },
      select: { name: true, category: true, price: true, quantity: true },
    });

    const agg = new Map<string, TopProduct>();
    for (const it of paidItems) {
      const key = it.name;
      const prev = agg.get(key) ?? {
        name: it.name,
        category: it.category,
        sold: 0,
        revenue: 0,
      };
      prev.sold += it.quantity;
      prev.revenue += it.price * it.quantity;
      agg.set(key, prev);
    }
    const topProducts = [...agg.values()]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    return NextResponse.json({
      totalRevenue,
      orderCount: allOrders,
      byStatus,
      recentOrders,
      topProducts,
    });
  } catch (err) {
    console.error("[admin/stats] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to compute stats" },
      { status: 500 }
    );
  }
}
