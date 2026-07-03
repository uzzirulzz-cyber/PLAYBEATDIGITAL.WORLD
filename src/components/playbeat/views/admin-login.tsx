"use client";

import { useState } from "react";
import { useStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function AdminLoginGate() {
  const { adminLogin, goHome } = useStore();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    // tiny delay so the loading state is visible / feels deliberate
    setTimeout(() => {
      const ok = adminLogin(password);
      if (!ok) {
        setError(true);
        setLoading(false);
        toast.error("Incorrect password", { description: "Access to admin panel denied." });
      }
      // on success, the parent AdminView re-renders to show the dashboard
    }, 250);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 sm:px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-7 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold text-foreground">Admin panel locked</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This area is restricted to store operators. Enter the admin password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-sm text-foreground">Admin password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                autoFocus
                autoComplete="off"
                placeholder="Enter password"
                className={`pr-10 bg-secondary/40 ${error ? "border-destructive focus-visible:border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" /> Incorrect password. Please try again.
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading || !password}
          >
            <Lock className="mr-2 h-4 w-4" />
            {loading ? "Verifying…" : "Unlock admin panel"}
          </Button>
        </form>

        <Button variant="ghost" className="mt-4 w-full text-muted-foreground" onClick={goHome}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to store
        </Button>
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground/70">
        Protected area · unauthorized access is prohibited
      </p>
    </div>
  );
}
