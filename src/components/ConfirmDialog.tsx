import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmTone = "danger" | "default";

type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmState = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Diálogo de confirmación reutilizable (reemplaza al `confirm()` nativo).
 * Uso: `const confirm = useConfirm(); if (await confirm({ title })) { … }`
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      }),
    []
  );

  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok);
      setState(null);
    },
    [state]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmModal state={state} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = state.tone === "danger";

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Enter") onClose(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onClose(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="mt-0.5 flex-none text-red-400">
              <AlertTriangle size={20} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-medium leading-snug">{state.title}</h2>
            {state.message && (
              <p className="mt-1.5 text-sm text-muted">{state.message}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost text-sm" onClick={() => onClose(false)}>
            {state.cancelLabel ?? "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            className={`btn text-sm ${
              danger
                ? "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]"
                : "btn-primary"
            }`}
            onClick={() => onClose(true)}
          >
            {state.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
