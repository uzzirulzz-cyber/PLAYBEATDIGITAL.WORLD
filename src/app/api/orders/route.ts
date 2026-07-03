import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { generateOrderRef } from "@/lib/format";

export const dynamic = "force-dynamic";

type CartItemInput = { productId: string; quantity: number };

// GET /api/orders — admin list of all orders with items.
// Query: status (PENDING|PAID|FAILED|REFUNDED), email
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const email = searchParams.get("email");

    const where: Prisma.OrderWhereInput = {};
    if (status && ["PENDING", "PAID", "FAILED", "REFUNDED"].includes(status)) {
      where.status = status;
    }
    if (email) {
      where.customerEmail = { contains: email };
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return NextResponse.json(orders);
  } catch (err) {
    console.error("[orders GET] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders — create an order from a cart.
// Body: { customerName, customerEmail, customerPhone, shippingAddress, items: [{productId, quantity}] }
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      shippingAddress?: string;
      items?: CartItemInput[];
    };

    const required = [
      "customerName",
      "customerEmail",
      "customerPhone",
      "shippingAddress",
      "items",
    ];
    for (const key of required) {
      if (body[key as keyof typeof body] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${key}` },
          { status: 400 }
        );
      }
    }

    const itemsInput = body.items!;
    if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Look up each product
    const productIds = itemsInput.map((i) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let amount = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    for (const item of itemsInput) {
      const product = productMap.get(item.productId);
      if (!product) continue; // skip missing product
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));
      amount += product.price * qty;
      orderItemsData.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        icon: product.icon,
        gradient: product.gradient,
        image: product.image,
        price: product.price,
        quantity: qty,
      });
    }

    if (orderItemsData.length === 0) {
      return NextResponse.json(
        { error: "No valid items in cart" },
        { status: 400 }
      );
    }

    const orderRef = generateOrderRef();

    const order = await db.order.create({
      data: {
        orderRef,
        customerName: body.customerName!,
        customerEmail: body.customerEmail!,
        customerPhone: body.customerPhone!,
        shippingAddress: body.shippingAddress!,
        amount,
        currency: "PKR",
        status: "PENDING",
        items: {
          createMany: { data: orderItemsData },
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ order, orderRef }, { status: 201 });
  } catch (err) {
    console.error("[orders POST] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
