"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Invitation } from "@/lib/admin/types";
import { acceptInvitation } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/client";
import { GitBranch, CheckCircle, XCircle, Eye, EyeOff, Crown, User } from "lucide-react";

interface AcceptInviteClientProps {
  invitation: Invitation | null;
  token: string;
  serverError: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  family_member: "Anggota Keluarga",
  viewer: "Penonton",
};

const ROLE_DESCS: Record<string, string> = {
  super_admin: "Akses penuh ke sistem silsilah keluarga",
  family_member: "Dapat melihat & mengajukan perubahan data",
  viewer: "Hanya dapat melihat data silsilah",
};

export function AcceptInviteClient({ invitation, token, serverError }: AcceptInviteClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "register" | "success">("info");
  const [email, setEmail] = useState(invitation?.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  async function handleAccept() {
    if (!password.trim() || password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    setError(null);

    startTransition(async () => {
      let activeUser = null;

      // 1. Sign up akun dengan Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || undefined,
            invited_by_token: token,
          },
        },
      });

      if (authData?.user) {
        activeUser = authData.user;
      }

      if (signUpError) {
        // Jika akun sudah pernah dibuat sebelumnya, coba login
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signUpError.message || signInError.message);
          return;
        }
        if (signInData?.user) {
          activeUser = signInData.user;
        }
      }

      // 2. Terima undangan (memperbarui role & konfirmasi akun lewat RPC/server)
      const { error: acceptError } = await acceptInvitation(token, activeUser?.id, fullName);
      if (acceptError) {
        setError(acceptError);
        return;
      }

      // 3. Pastikan user masuk dengan kredensial yang baru dibuat
      await supabase.auth.signInWithPassword({ email, password });

      setStep("success");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    });
  }

  if (serverError || !invitation) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 40,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <XCircle size={28} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Undangan Tidak Valid
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px" }}>
            {serverError || "Link undangan tidak ditemukan, telah kadaluarsa, atau sudah digunakan."}
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "9px 20px",
              background: "var(--accent-color)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ke Halaman Login
          </a>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CheckCircle size={32} color="#22c55e" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            Selamat Datang!
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Akun berhasil dibuat. Mengalihkan ke halaman utama...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--accent-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <GitBranch size={22} color="var(--accent-color)" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>
            Bergabung ke Silsilah Keluarga
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            Anda diundang untuk bergabung sebagai{" "}
            <strong style={{ color: "var(--foreground)" }}>
              {ROLE_LABELS[invitation.role]}
            </strong>
          </p>
        </div>

        {/* Role info */}
        <div
          style={{
            background: "var(--accent-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 18 }}>
            {invitation.role === "super_admin" ? "👑" : invitation.role === "family_member" ? "👤" : "👁️"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              {ROLE_LABELS[invitation.role]}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {ROLE_DESCS[invitation.role]}
            </div>
          </div>
        </div>

        {invitation.message && (
          <div
            style={{
              borderLeft: "3px solid var(--accent-color)",
              paddingLeft: 12,
              marginBottom: 20,
              fontSize: 13,
              color: "var(--muted)",
              fontStyle: "italic",
            }}
          >
            &ldquo;{invitation.message}&rdquo;
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Nama Lengkap (opsional)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama Anda"
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--background)",
                fontSize: 13,
                color: "var(--foreground)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--subtle)",
                fontSize: 13,
                color: "var(--muted)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Password *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="invite-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                onKeyDown={(e) => e.key === "Enter" && handleAccept()}
                style={{
                  width: "100%",
                  padding: "9px 36px 9px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--background)",
                  fontSize: 13,
                  color: "var(--foreground)",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
              {error}
            </div>
          )}

          <button
            id="accept-invite-btn"
            onClick={handleAccept}
            disabled={!password.trim() || isPending}
            style={{
              padding: "11px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: password.trim() ? "var(--accent-color)" : "var(--subtle)",
              color: password.trim() ? "#fff" : "var(--muted)",
              fontSize: 14,
              fontWeight: 700,
              cursor: password.trim() ? "pointer" : "not-allowed",
              marginTop: 4,
            }}
          >
            {isPending ? "Memproses..." : "Bergabung Sekarang"}
          </button>

          <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: 0 }}>
            Sudah punya akun?{" "}
            <a href="/login" style={{ color: "var(--accent-color)", textDecoration: "none" }}>
              Masuk di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
