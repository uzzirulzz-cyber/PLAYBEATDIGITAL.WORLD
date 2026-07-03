import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/products/[id] — fetch a single product by id OR slug.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (err) {
    console.error("[products/:id GET] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] — update a product by id (admin).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const data: Prisma.ProductUpdateInput = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.slug !== undefined) data.slug = String(body.slug);
    if (body.description !== undefined) data.description = String(body.description);
    if (body.category !== undefined) data.category = String(body.category);
    if (body.brand !== undefined) data.brand = String(body.brand);
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.oldPrice !== undefined) {
      data.oldPrice = body.oldPrice === null ? null : Number(body.oldPrice);
    }
    if (body.badge !== undefined) {
      data.badge = body.badge === null ? null : String(body.badge);
    }
    if (body.icon !== undefined) data.icon = String(body.icon);
    if (body.gradient !== undefined) data.gradient = String(body.gradient);
    if (body.stock !== undefined) data.stock = Number(body.stock);
    if (body.featured !== undefined) data.featured = Boolean(body.featured);

    // Resolve by id OR slug so callers can use either identifier
    const existing = await db.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await db.product.update({
      where: { id: existing.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[products/:id PUT] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — delete a product by id (admin).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    await db.product.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[products/:id DELETE] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete product" },
      { status: 500 }
    );
  }
}
