"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Email atau kata sandi salah. Coba lagi.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>
            Silsilah Keluarga
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Arsip Genealogi Keluarga
          </p>
        </div>

        {/* Form */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "28px",
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@keluarga.id"
                  autoComplete="email"
                  required
                  style={{ marginTop: "6px" }}
                />
              </div>
              <div>
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ marginTop: "6px" }}
                />
              </div>
              <Button
                id="login-submit-button"
                type="submit"
                disabled={loading || !email || !password}
                style={{
                  background: "var(--foreground)",
                  color: "var(--surface)",
                  marginTop: "4px",
                }}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Masuk
              </Button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--muted)", marginTop: "16px" }}>
          Akses terbatas untuk anggota keluarga yang berwenang.
        </p>
      </div>
    </div>
  );
}
