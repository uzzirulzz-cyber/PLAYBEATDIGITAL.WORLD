"use client";

// Client-side API helpers for the Playbeat storefront.

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  oldPrice: number | null;
  badge: string | null;
  icon: string;
  gradient: string;
  stock: number;
  featured: boolean;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  category: string;
  icon: string;
  gradient: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  ublOrderId: string | null;
  approvalCode: string | null;
  cardBrand: string | null;
  cardNumber: string | null;
  createdAt: string;
  items: OrderItem[];
};

export type AdminStats = {
  totalRevenue: number;
  orderCount: number;
  byStatus: { PENDING: number; PAID: number; FAILED: number; REFUNDED: number };
  recentOrders: Order[];
  topProducts: { name: string; category: string; sold: number; revenue: number }[];
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listProducts: (params: { category?: string; featured?: boolean; q?: string; limit?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.category) sp.set("category", params.category);
    if (params.featured) sp.set("featured", "true");
    if (params.q) sp.set("q", params.q);
    if (params.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return jsonFetch<Product[]>(`/api/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (idOrSlug: string) => jsonFetch<Product>(`/api/products/${idOrSlug}`),
  seedProducts: () => jsonFetch<{ seeded: number; total: number }>(`/api/products/seed`, { method: "POST" }),

  createOrder: (body: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    items: { productId: string; quantity: number }[];
  }) => jsonFetch<{ order: Order; orderRef: string }>(`/api/orders`, {
    method: "POST",
    body: JSON.stringify(body),
  }),
  getMyOrders: (email: string) => jsonFetch<Order[]>(`/api/orders/my?email=${encodeURIComponent(email)}`),
  listOrders: (params: { status?: string; email?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.email) sp.set("email", params.email);
    const qs = sp.toString();
    return jsonFetch<Order[]>(`/api/orders${qs ? `?${qs}` : ""}`);
  },
  updateOrder: (id: string, body: Partial<Order>) =>
    jsonFetch<Order>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  initiatePayment: (orderRef: string) =>
    jsonFetch<{ ok: boolean; demo: boolean; paymentUrl: string | null; orderRef: string; error?: string }>(
      `/api/payment/initiate`,
      { method: "POST", body: JSON.stringify({ orderRef }) }
    ),
  paymentCallback: (orderRef: string, demo = false) =>
    jsonFetch<{ status: string; orderRef: string; approvalCode?: string; cardBrand?: string; cardNumber?: string; error?: string }>(
      `/api/payment/callback?orderRef=${encodeURIComponent(orderRef)}${demo ? "&demo=1" : ""}`
    ),

  adminStats: () => jsonFetch<AdminStats>(`/api/admin/stats`),
};
