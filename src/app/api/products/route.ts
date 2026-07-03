import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/products — list products with optional filters.
// Query params: category, featured, q, limit
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const q = searchParams.get("q");
    const limitRaw = searchParams.get("limit");

    const where: Prisma.ProductWhereInput = {};
    if (category) where.category = category;
    if (featured === "true") where.featured = true;
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term } },
        { brand: { contains: term } },
        { description: { contains: term } },
      ];
    }

    const limit = limitRaw
      ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 100))
      : undefined;

    const products = await db.product.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error("[products GET] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products — create a product (admin).
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const required = [
      "name",
      "slug",
      "description",
      "category",
      "brand",
      "price",
      "icon",
      "gradient",
    ];
    for (const key of required) {
      if (body[key] === undefined || body[key] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${key}` },
          { status: 400 }
        );
      }
    }

    const product = await db.product.create({
      data: {
        name: String(body.name),
        slug: String(body.slug),
        description: String(body.description),
        category: String(body.category),
        brand: String(body.brand),
        price: Number(body.price),
        oldPrice:
          body.oldPrice !== undefined && body.oldPrice !== null
            ? Number(body.oldPrice)
            : null,
        badge: body.badge ? String(body.badge) : null,
        icon: String(body.icon),
        gradient: String(body.gradient),
        image:
          body.image !== undefined && body.image !== null
            ? String(body.image)
            : null,
        stock: body.stock !== undefined ? Number(body.stock) : 100,
        featured: Boolean(body.featured),
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[products POST] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create product" },
      { status: 500 }
    );
  }
}
