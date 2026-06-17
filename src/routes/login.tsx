import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo continuar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/icon.svg" alt="" className="h-12 w-12 rounded-xl" />
          <h1 className="text-2xl font-semibold tracking-tight">Pribrew</h1>
          <p className="text-sm text-muted">
            Tu bitácora de extracción, compartida con tu grupo.
          </p>
        </div>

        <div className="card p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1 text-sm">
            <button
              onClick={() => setMode("in")}
              className={`rounded-lg py-2 ${mode === "in" ? "bg-surface shadow-card font-medium" : "text-muted"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("up")}
              className={`rounded-lg py-2 ${mode === "up" ? "bg-surface shadow-card font-medium" : "text-muted"}`}
            >
              Crear cuenta
            </button>
          </div>

          <div className="flex flex-col gap-3">
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
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {error && <p className="text-sm text-roast">{error}</p>}

            <button className="btn-primary mt-1" onClick={submit} disabled={busy}>
              {busy ? "Un momento…" : mode === "in" ? "Entrar" : "Crear cuenta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
