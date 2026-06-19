import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isUsernameAvailable } from "@/data/profiles";
import { Logo } from "@/components/Logo";

// 3–20 caracteres: letras, números, guion y guion bajo.
const USERNAME_RE = /^[a-z0-9_-]{3,20}$/i;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  const switchMode = (m: "in" | "up") => {
    setMode(m);
    setError(null);
    setSent(false);
  };

  const submit = async () => {
    setError(null);
    const user = username.trim();
    if (mode === "up") {
      if (!USERNAME_RE.test(user)) {
        setError("Usuario: 3–20 caracteres (letras, números, - o _)");
        return;
      }
      if (password !== confirm) {
        setError("Las contraseñas no coinciden");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "in") {
        await signIn(email, password);
      } else {
        if (!(await isUsernameAvailable(user))) {
          setError("Ese usuario ya está en uso");
          return;
        }
        const needsConfirm = await signUp(email, password, user);
        if (needsConfirm) setSent(true);
      }
    } catch (e) {
      // Los errores de Supabase (PostgrestError/AuthError) son objetos planos
      // con .message, no instancias de Error: extraemos el mensaje de cualquier forma.
      const msg =
        typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : "No se pudo continuar";
      setError(msg);
      console.error("login/signup error:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="h-12" />
          <p className="text-sm text-muted">
            Tu bitácora de extracción, compartida con tu grupo.
          </p>
        </div>

        <div className="card p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1 text-sm">
            <button
              onClick={() => switchMode("in")}
              className={`rounded-lg py-2 ${mode === "in" ? "bg-surface shadow-card font-medium" : "text-muted"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchMode("up")}
              className={`rounded-lg py-2 ${mode === "up" ? "bg-surface shadow-card font-medium" : "text-muted"}`}
            >
              Crear cuenta
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-sm">
                Te enviamos un correo de confirmación a{" "}
                <span className="font-medium">{email}</span>. Ábrelo para activar
                tu cuenta y luego inicia sesión.
              </p>
              <button className="btn-ghost" onClick={() => switchMode("in")}>
                Volver a entrar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {mode === "up" && (
                <div>
                  <label className="label" htmlFor="username">Usuario</label>
                  <input
                    id="username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="field"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tu_usuario"
                  />
                </div>
              )}
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.cl"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && mode === "in" && submit()}
                />
              </div>
              {mode === "up" && (
                <div>
                  <label className="label" htmlFor="confirm">Confirmar contraseña</label>
                  <input
                    id="confirm"
                    type="password"
                    className="field"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                  />
                </div>
              )}

              {error && <p className="text-sm text-roast">{error}</p>}

              <button className="btn-primary mt-1" onClick={submit} disabled={busy}>
                {busy ? "Un momento…" : mode === "in" ? "Entrar" : "Crear cuenta"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
