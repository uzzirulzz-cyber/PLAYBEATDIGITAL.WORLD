"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type AiStats, type AiToolId } from "@/lib/api";
import { useStore } from "@/store/cart";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Sparkles,
  PenLine,
  FileText,
  Search,
  Mail,
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Clock,
  Zap,
  Hash,
  Layers,
  Timer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type ToolMeta = {
  id: AiToolId;
  name: string;
  category: "CONTENT" | "SEO" | "MARKETING" | "DESIGN" | "SUPPORT";
  description: string;
  icon: typeof PenLine;
  /** Tailwind gradient classes for the icon tile, e.g. "from-blue-500 to-cyan-500" */
  gradient: string;
  /** placeholder text for the input box inside the modal */
  placeholder: string;
  /** optional label shown above the input area */
  inputLabel: string;
  /** whether to use a single-line Input vs a multi-line Textarea */
  multiline?: boolean;
  /** tool kind — banner produces an image, others produce text */
  kind: "text" | "image";
};

const TOOLS: ToolMeta[] = [
  {
    id: "product-writer",
    name: "AI Product Writer",
    category: "CONTENT",
    description:
      "Generate compelling product titles, descriptions, and marketing copy from a few bullet points.",
    icon: PenLine,
    gradient: "from-blue-500 to-cyan-500",
    placeholder: "Enter product features, one per line...\n\n• Wireless noise-cancelling headphones\n• 40-hour battery life\n• USB-C fast charging",
    inputLabel: "Product features / brief",
    multiline: true,
    kind: "text",
  },
  {
    id: "blog-post",
    name: "Blog Post Generator",
    category: "CONTENT",
    description:
      "Long-form SEO-optimized blog posts from a topic, outline, or keyword cluster.",
    icon: FileText,
    gradient: "from-purple-500 to-fuchsia-500",
    placeholder: "Enter a topic, outline, or keyword cluster...\n\ne.g. \"Best gaming laptops under PKR 300,000 for 2026\"",
    inputLabel: "Topic / outline",
    multiline: true,
    kind: "text",
  },
  {
    id: "seo-meta",
    name: "SEO Meta Generator",
    category: "SEO",
    description:
      "Bulk-generate meta titles, descriptions, and slug suggestions for any URL.",
    icon: Search,
    gradient: "from-teal-500 to-emerald-500",
    placeholder: "Enter a URL or page title...\n\ne.g. https://playbeat.store/games/ea-fc-25-pc",
    inputLabel: "URL or page title",
    multiline: true,
    kind: "text",
  },
  {
    id: "email-campaign",
    name: "Email Campaign Writer",
    category: "MARKETING",
    description:
      "High-converting email sequences, newsletters, and abandoned-cart reminders.",
    icon: Mail,
    gradient: "from-pink-500 to-rose-500",
    placeholder: "Describe the email campaign...\n\ne.g. \"Abandoned cart recovery for Steam Gift Card $50, friendly tone, 3-email sequence\"",
    inputLabel: "Campaign brief",
    multiline: true,
    kind: "text",
  },
  {
    id: "banner",
    name: "AI Banner Generator",
    category: "DESIGN",
    description:
      "Design promotional banners, hero images, and social graphics with AI.",
    icon: ImageIcon,
    gradient: "from-green-500 to-lime-500",
    placeholder: "Describe the banner you want...\n\ne.g. \"Black Friday sale banner with bold typography and lightning bolts\"",
    inputLabel: "Banner prompt",
    multiline: true,
    kind: "image",
  },
  {
    id: "customer-reply",
    name: "Customer Reply Assistant",
    category: "SUPPORT",
    description:
      "Draft professional support replies, refunds, and follow-ups instantly.",
    icon: MessageSquare,
    gradient: "from-orange-500 to-amber-500",
    placeholder: "Paste the customer message and context...\n\ne.g. \"Customer says they didn't receive their Steam code after 2 hours. Order PB-XXXXXX.\"",
    inputLabel: "Customer message",
    multiline: true,
    kind: "text",
  },
];

const BANNER_SIZES = ["1024x1024", "1344x768", "1440x720"] as const;
type BannerSize = (typeof BANNER_SIZES)[number];

const CATEGORY_STYLE: Record<ToolMeta["category"], string> = {
  CONTENT: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  SEO: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  MARKETING: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  DESIGN: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  SUPPORT: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

/** Format a number with thousands separators (e.g. 1,400,000). */
function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}

/** Compact relative-time formatter — "just now", "5m ago", "3h ago", "2d ago". */
function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "never";
  const diff = Date.now() - ts;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/** Truncate a long string to `n` chars with an ellipsis. */
function truncate(s: string, n = 80): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean;
}

export function AiToolsView() {
  const goAdmin = useStore((s) => s.goAdmin);
  const [stats, setStats] = useState<AiStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Initial stats load — fetch inlined so setState only fires from the
  // async .then/.catch callbacks (avoids cascading renders).
  useEffect(() => {
    let cancelled = false;
    api
      .aiStats()
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setStatsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const s = await api.aiStats();
      setStats(s);
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
    setRefreshing(false);
    toast.success("AI stats refreshed");
  }

  // Silent reload used after a generation completes (modal close).
  async function reloadStats() {
    try {
      const s = await api.aiStats();
      setStats(s);
      setStatsError(false);
    } catch {
      /* keep existing stats on silent reload failure */
    }
  }

  function launchTool(tool: ToolMeta) {
    setActiveTool(tool);
    setModalOpen(true);
  }

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open);
    if (!open) {
      // Reset active tool slightly after close so the modal contents don't
      // disappear mid-transition.
      window.setTimeout(() => setActiveTool(null), 200);
      // Refresh stats so any new generation shows up in counts/recent.
      reloadStats();
    }
  }

  // Build a lookup map for per-tool stats.
  const toolStatsMap = useMemo(() => {
    const m = new Map<string, { count: number; lastUsed: string | null }>();
    for (const t of stats?.toolStats ?? []) {
      m.set(t.tool, { count: t.count, lastUsed: t.lastUsed });
    }
    return m;
  }, [stats]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          variant="ghost"
          onClick={goAdmin}
          className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">AI Tools</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              AI-powered content generators for your marketplace.
            </p>
          </div>
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

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label="Total Generations"
          value={stats ? formatTokens(stats.totalGenerations) : null}
          accent="text-chart-2"
        />
        <StatCard
          icon={<Hash className="h-4 w-4" />}
          label="Tokens Used 30d"
          value={stats ? formatTokens(stats.tokensUsed30d) : null}
          accent="text-chart-4"
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Active Tools"
          value={stats ? String(stats.activeTools) : null}
          accent="text-chart-1"
        />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Avg Time"
          value={stats && stats.totalGenerations > 0 ? "2.4s" : "N/A"}
          accent="text-chart-5"
        />
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const ts = toolStatsMap.get(tool.id);
          const count = ts?.count ?? 0;
          const last = ts?.lastUsed ?? null;
          return (
            <div
              key={tool.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md",
                    tool.gradient
                  )}
                >
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "mb-1.5 border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider",
                      CATEGORY_STYLE[tool.category]
                    )}
                  >
                    {tool.category}
                  </Badge>
                  <h3 className="text-base font-semibold text-foreground">
                    {tool.name}
                  </h3>
                </div>
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tool.description}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{count}</span>{" "}
                  generations
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last: {timeAgo(last)}
                </span>
              </div>

              <Button
                onClick={() => launchTool(tool)}
                className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
              >
                <Sparkles className="h-4 w-4" />
                Launch Tool
              </Button>
            </div>
          );
        })}
      </div>

      {/* Recent generations */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Recent generations
          </h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        {statsError && stats === null ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive/70" />
            <p className="text-xs text-muted-foreground">
              Failed to load AI stats.
            </p>
            <Button variant="outline" size="sm" onClick={() => reloadStats()}>
              Retry
            </Button>
          </div>
        ) : stats === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-secondary" />
            ))}
          </div>
        ) : stats.recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No generations yet. Launch a tool to get started.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {stats.recent.slice(0, 10).map((g) => {
              const tool = TOOLS.find((t) => t.id === g.tool);
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white",
                      tool?.gradient ?? "from-secondary to-secondary"
                    )}
                  >
                    {tool ? (
                      <tool.icon className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tool?.name ?? g.tool}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {truncate(g.input, 90)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-muted-foreground">
                      {timeAgo(g.createdAt)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {g.tokensUsed > 0 ? `${formatTokens(g.tokensUsed)} tok` : "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Tool modal */}
      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          {activeTool && (
            <ToolModalBody tool={activeTool} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Tool modal body — handles input, generation, and output display
// ─────────────────────────────────────────────────────────────────────────────

function ToolModalBody({ tool }: { tool: ToolMeta }) {
  const [input, setInput] = useState("");
  const [bannerSize, setBannerSize] = useState<BannerSize>("1024x1024");
  const [bannerStyle, setBannerStyle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetResults() {
    setOutput(null);
    setImageUrl(null);
    setTokensUsed(null);
    setError(null);
    setCopied(false);
  }

  async function handleGenerate() {
    if (!input.trim()) {
      toast.error("Please enter some input first");
      return;
    }
    setGenerating(true);
    resetResults();
    try {
      const options: Record<string, unknown> =
        tool.kind === "image"
          ? { size: bannerSize, style: bannerStyle.trim() || undefined }
          : {};
      const res = await api.aiGenerate(tool.id, input.trim(), options);
      if (!res.ok || res.error) {
        throw new Error(res.error || "Generation failed");
      }
      if (tool.kind === "image") {
        if (!res.imageUrl) throw new Error("No image returned");
        setImageUrl(res.imageUrl);
        toast.success("Image generated");
      } else {
        if (!res.output) throw new Error("No output returned");
        setOutput(res.output);
        toast.success("Content generated", {
          description:
            res.tokensUsed != null
              ? `${formatTokens(res.tokensUsed)} tokens used`
              : undefined,
        });
      }
      if (res.tokensUsed != null) setTokensUsed(res.tokensUsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      setError(msg);
      toast.error("Generation failed", { description: msg });
    } finally {
      setGenerating(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  function downloadImage() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `playbeat-${tool.id}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white",
              tool.gradient
            )}
          >
            <tool.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="truncate">{tool.name}</DialogTitle>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </div>
        </div>
      </DialogHeader>

      {/* Input area */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {tool.inputLabel}
          </label>
          {tool.multiline === false ? (
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tool.placeholder}
              className="bg-background/60"
              disabled={generating}
            />
          ) : (
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tool.placeholder}
              rows={6}
              className="resize-y bg-background/60 font-mono text-sm"
              disabled={generating}
            />
          )}
        </div>

        {/* Banner-only options */}
        {tool.kind === "image" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Image size
              </label>
              <Select
                value={bannerSize}
                onValueChange={(v) => setBannerSize(v as BannerSize)}
                disabled={generating}
              >
                <SelectTrigger className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANNER_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Style (optional)
              </label>
              <Input
                value={bannerStyle}
                onChange={(e) => setBannerStyle(e.target.value)}
                placeholder="e.g. minimalist, neon, retro..."
                className="bg-background/60"
                disabled={generating}
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating || !input.trim()}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Output: text */}
      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Output
              {tokensUsed != null && (
                <span className="ml-2 normal-case text-muted-foreground/70">
                  · {formatTokens(tokensUsed)} tokens
                </span>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyOutput}
              className="h-7 bg-card"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground">
            {output}
          </pre>
        </div>
      )}

      {/* Output: image */}
      {imageUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Generated image
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadImage}
              className="h-7 bg-card"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-background/60">
            <img
              src={imageUrl}
              alt={`AI-generated ${tool.name} output`}
              className="h-auto w-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
