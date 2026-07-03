"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { checkAdminPassword } from "@/lib/admin-auth";

export type StoreView =
  | { name: "home" }
  | { name: "shop"; category?: string }
  | { name: "product"; slug: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "payment-callback"; orderRef?: string; status?: string }
  | { name: "orders" }
  | { name: "admin" };

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  icon: string;
  gradient: string;
  price: number;
  quantity: number;
};

type StoreState = {
  view: StoreView;
  cart: CartItem[];
  cartOpen: boolean;
  // navigation
  setView: (view: StoreView) => void;
  goHome: () => void;
  goShop: (category?: string) => void;
  goProduct: (slug: string) => void;
  goCart: () => void;
  goCheckout: () => void;
  goOrders: () => void;
  goAdmin: () => void;
  goPaymentCallback: (orderRef?: string, status?: string) => void;
  // cart
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  // selectors
  cartCount: () => number;
  cartTotal: () => number;
  // admin gate (session-only — NOT persisted; resets on full reload)
  adminAuthed: boolean;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      view: { name: "home" },
      cart: [],
      cartOpen: false,

      setView: (view) => {
        set({ view });
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      },
      goHome: () => get().setView({ name: "home" }),
      goShop: (category) => get().setView({ name: "shop", category }),
      goProduct: (slug) => get().setView({ name: "product", slug }),
      goCart: () => get().setView({ name: "cart" }),
      goCheckout: () => get().setView({ name: "checkout" }),
      goOrders: () => get().setView({ name: "orders" }),
      goAdmin: () => get().setView({ name: "admin" }),
      goPaymentCallback: (orderRef, status) =>
        get().setView({ name: "payment-callback", orderRef, status }),

      addToCart: (item, quantity = 1) => {
        const cart = get().cart;
        const existing = cart.find((c) => c.productId === item.productId);
        if (existing) {
          set({
            cart: cart.map((c) =>
              c.productId === item.productId
                ? { ...c, quantity: c.quantity + quantity }
                : c
            ),
            cartOpen: true,
          });
        } else {
          set({ cart: [...cart, { ...item, quantity }], cartOpen: true });
        }
      },
      removeFromCart: (productId) =>
        set({ cart: get().cart.filter((c) => c.productId !== productId) }),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set({
          cart: get().cart.map((c) =>
            c.productId === productId ? { ...c, quantity } : c
          ),
        });
      },
      clearCart: () => set({ cart: [] }),
      setCartOpen: (open) => set({ cartOpen: open }),

      cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
      cartTotal: () => get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0),

      // admin gate — session-only, never persisted
      adminAuthed: false,
      adminLogin: (password) => {
        if (checkAdminPassword(password)) {
          set({ adminAuthed: true });
          return true;
        }
        return false;
      },
      adminLogout: () => set({ adminAuthed: false }),
    }),
    {
      name: "playbeat-store",
      partialize: (s) => ({ cart: s.cart }) as StoreState,
    }
  )
);
