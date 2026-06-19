import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useInvitationPreview, useAcceptInvitation } from "@/data/groups";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { data: preview, isLoading } = useInvitationPreview(token);
  const accept = useAcceptInvitation();
  const [error, setError] = useState<string | null>(null);

  // Si no hay sesión, manda a login y vuelve aquí tras autenticarse.
  useEffect(() => {
    if (!loading && !session) {
      sessionStorage.setItem("postLoginRedirect", `/invite/${token}`);
    }
  }, [loading, session, token]);

  const onJoin = async () => {
    setError(null);
    try {
      await accept.mutateAsync(token);
      navigate({ to: "/groups" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo unir al grupo");
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <img src="/mark.svg" alt="Pribrew" className="mx-auto mb-4 h-14 w-14" />

        {isLoading && <p className="text-muted">Verificando invitación…</p>}

        {!isLoading && (!preview || !preview.valid) && (
          <>
            <h1 className="text-lg font-semibold">Invitación no válida</h1>
            <p className="mt-1 text-sm text-muted">
              El link expiró, fue revocado o ya no tiene usos disponibles.
            </p>
          </>
        )}

        {!isLoading && preview?.valid && (
          <>
            <h1 className="text-lg font-semibold">
              Te invitaron a <span className="text-extraction">{preview.group_name}</span>
            </h1>
            <p className="mt-1 text-sm text-muted">
              Al unirte compartirás tus recetas con el grupo y verás las de todos.
            </p>

            {error && <p className="mt-3 text-sm text-roast">{error}</p>}

            {session ? (
              <button className="btn-primary mt-5 w-full" onClick={onJoin} disabled={accept.isPending}>
                {accept.isPending ? "Uniéndote…" : "Unirme al grupo"}
              </button>
            ) : (
              <button className="btn-primary mt-5 w-full" onClick={() => navigate({ to: "/login" })}>
                Inicia sesión para unirte
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
