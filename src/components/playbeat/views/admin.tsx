"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AdminStats, type Order } from "@/lib/api";
import { useStore } from "@/store/cart";
import { CategoryIcon } from "../icon";
import { formatPrice } from "@/lib/format";
import { CATEGORIES } from "@/lib/store-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

type Status = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
type Filter = "ALL" | Status;

const STATUS_STYLE: Record<Status, string> = {
  PENDING: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  PAID: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
  REFUNDED: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

const STATUS_DOT: Record<Status, string> = {
  PENDING: "bg-chart-3",
  PAID: "bg-chart-1",
  FAILED: "bg-destructive",
  REFUNDED: "bg-chart-2",
};

const STATUSES: Status[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "PAID", label: "Paid" },
  { id: "FAILED", label: "Failed" },
  { id: "REFUNDED", label: "Refunded" },
];

function findCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

export function AdminView() {
  const goHome = useStore((s) => s.goHome);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [statsError, setStatsError] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.adminStats();
      setStats(s);
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  const loadOrders = useCallback(
    async (f: Filter, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setOrders(null);
      setOrdersError(false);
      try {
        const list = await api.listOrders({
          status: f === "ALL" ? undefined : f,
        });
        setOrders(list);
      } catch {
        setOrdersError(true);
        setOrders([]);
      }
    },
    []
  );

  // Initial stats load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Load orders whenever filter changes (also runs on initial mount)
  useEffect(() => {
    loadOrders(filter);
  }, [filter, loadOrders]);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([loadStats(), loadOrders(filter, { silent: true })]);
    setRefreshing(false);
    toast.success("Data refreshed");
  }

  async function changeStatus(order: Order, next: Status) {
    if (next === order.status) return;
    setUpdatingId(order.id);
    try {
      await api.updateOrder(order.id, { status: next });
      toast.success("Order status updated", {
        description: `${order.orderRef} → ${next}`,
      });
      await Promise.all([loadStats(), loadOrders(filter, { silent: true })]);
    } catch (e) {
      toast.error("Failed to update order", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const countFor = (f: Filter): number | null => {
    if (!stats) return null;
    if (f === "ALL") return stats.orderCount;
    return stats.byStatus[f];
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goHome}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground">Admin dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage orders, revenue and fulfilment.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="bg-card"
        >
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total revenue"
          value={stats ? formatPrice(stats.totalRevenue) : null}
          accent="text-chart-1"
        />
        <StatCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Total orders"
          value={stats ? String(stats.orderCount) : null}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Paid orders"
          value={stats ? String(stats.byStatus.PAID) : null}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending orders"
          value={stats ? String(stats.byStatus.PENDING) : null}
          accent="text-chart-3"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: filter chips + orders table */}
        <div className="min-w-0">
          {/* Filter chips */}
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const c = countFor(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {f.id !== "ALL" && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        STATUS_DOT[f.id as Status]
                      )}
                    />
                  )}
                  {f.label}
                  {c !== null && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        active
                          ? "bg-primary-foreground/15 text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {c}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Orders panel */}
          <div className="rounded-xl border border-border bg-card">
            {ordersError && orders === null ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive/70" />
                <p className="text-sm text-muted-foreground">
                  Failed to load orders.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(filter)}
                >
                  Retry
                </Button>
              </div>
            ) : orders === null ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full bg-secondary" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Package className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No orders{filter !== "ALL" ? ` with status ${filter}` : ""} yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Order
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Customer
                      </TableHead>
                      <TableHead className="text-center text-xs uppercase tracking-wide text-muted-foreground">
                        Items
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                        Update
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => {
                      const itemCount = o.items.reduce(
                        (n, i) => n + i.quantity,
                        0
                      );
                      return (
                        <TableRow key={o.id} className="border-border">
                          <TableCell>
                            <p className="font-mono text-xs font-semibold text-foreground">
                              {o.orderRef}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {new Date(o.createdAt).toLocaleString("en-PK", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-foreground">
                              {o.customerName}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {o.customerEmail}
                            </p>
                            {o.approvalCode && (
                              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="font-mono">
                                  {o.approvalCode}
                                </span>
                                {o.cardBrand && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="inline-flex items-center gap-0.5">
                                      <CreditCard className="h-2.5 w-2.5" />
                                      {o.cardBrand}
                                      {o.cardNumber ? ` ${o.cardNumber}` : ""}
                                    </span>
                                  </>
                                )}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-secondary px-1.5 text-xs font-medium text-foreground">
                              {itemCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatPrice(o.amount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {o.currency}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={STATUS_STYLE[o.status]}
                            >
                              <span
                                className={cn(
                                  "mr-1 h-1.5 w-1.5 rounded-full",
                                  STATUS_DOT[o.status]
                                )}
                              />
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={o.status}
                              onValueChange={(v) => changeStatus(o, v as Status)}
                              disabled={updatingId === o.id}
                            >
                              <SelectTrigger
                                size="sm"
                                className="h-8 w-[130px] bg-background/60"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    <span
                                      className={cn(
                                        "mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle",
                                        STATUS_DOT[s]
                                      )}
                                    />
                                    <span className="align-middle">{s}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Right: top products + recent orders mini */}
        <div className="space-y-6">
          <TopProductsCard
            stats={stats}
            error={statsError}
            onRetry={() => loadStats()}
          />
          <RecentOrdersCard stats={stats} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-primary">
          {icon}
        </span>
        {accent && value !== null && (
          <span className={cn("text-xs", accent)} aria-hidden>
            ●
          </span>
        )}
      </div>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {value === null ? (
        <Skeleton className="mt-1.5 h-7 w-24 bg-secondary" />
      ) : (
        <p
          className={cn(
            "mt-1 text-2xl font-bold text-foreground",
            accent ?? ""
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function TopProductsCard({
  stats,
  error,
  onRetry,
}: {
  stats: AdminStats | null;
  error: boolean;
  onRetry: () => void;
}) {
  const top = stats?.topProducts ?? [];
  const max = Math.max(...top.map((p) => p.revenue), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Top products</h3>
        <TrendingUp className="h-4 w-4 text-chart-1" />
      </div>
      <Separator className="my-4" />

      {error && stats === null ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive/70" />
          <p className="text-xs text-muted-foreground">Failed to load.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : stats === null ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No sales yet.
        </p>
      ) : (
        <ol className="space-y-3.5">
          {top.map((p, i) => {
            const cat = findCategory(p.category);
            const pct = Math.max(4, (p.revenue / max) * 100);
            return (
              <li key={`${p.name}-${i}`} className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white",
                      cat?.gradient ?? "from-secondary to-secondary"
                    )}
                  >
                    <CategoryIcon
                      name={cat?.icon ?? "Zap"}
                      className="h-4 w-4"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      <span className="mr-1.5 text-muted-foreground">
                        {i + 1}.
                      </span>
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {cat?.name ?? p.category} · sold {p.sold}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-foreground">
                    {formatPrice(p.revenue)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function RecentOrdersCard({ stats }: { stats: AdminStats | null }) {
  const recent = stats?.recentOrders ?? [];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent orders</h3>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <Separator className="my-4" />

      {stats === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-secondary" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No orders yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {recent.map((o) => (
            <li key={o.id} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  STATUS_DOT[o.status]
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-medium text-foreground">
                  {o.orderRef}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {o.customerName}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-foreground">
                {formatPrice(o.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
