import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEED_PRODUCTS } from "@/lib/store-config";

export const dynamic = "force-dynamic";

// POST /api/products/seed — idempotently seed the catalog.
export async function POST() {
  try {
    const existing = await db.product.count();
    if (existing > 0) {
      return NextResponse.json({ seeded: 0, total: existing });
    }

    await db.product.createMany({
      data: SEED_PRODUCTS.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        category: p.category,
        brand: p.brand,
        price: p.price,
        oldPrice: p.oldPrice ?? null,
        badge: p.badge ?? null,
        icon: p.icon,
        gradient: p.gradient,
        image: p.image ?? null,
        stock: p.stock,
        featured: p.featured ?? false,
      })),
    });

    const total = await db.product.count();
    return NextResponse.json({ seeded: SEED_PRODUCTS.length, total });
  } catch (err) {
    console.error("[products/seed] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to seed products" },
      { status: 500 }
    );
  }
}
