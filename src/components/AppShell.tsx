import { type ReactNode, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Coffee, Bean, Users, LogOut, Plus, Sun, Moon, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const NAV = [
  { to: "/", label: "Bitácora", icon: Home },
  { to: "/brews", label: "Recetas", icon: Coffee },
  { to: "/beans", label: "Granos", icon: Bean },
  { to: "/groups", label: "Grupos", icon: Users },
] as const;

// Sidebar desktop incluye Moledores; el bottom-nav móvil es grid fijo (5 slots)
// y se llega a moledores desde el inventario de granos.
const SIDEBAR_EXTRA = [{ to: "/grinders", label: "Moledores", icon: SlidersHorizontal }] as const;

function ThemeToggle({ inline }: { inline?: boolean }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Moon : Sun;
  if (inline) {
    return (
      <button
        onClick={toggle}
        className="mono inline-flex items-center gap-2 rounded-pill border border-hairline bg-chip px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-ink"
      >
        <Icon size={15} /> {theme === "dark" ? "Oscuro" : "Claro"}
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="grid h-10 w-10 place-items-center rounded-md border border-hairline text-ink transition-colors hover:bg-chip"
    >
      <Icon size={19} />
    </button>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="grid min-h-dvh place-items-center text-muted">Cargando…</div>;
  }

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="min-h-dvh bg-bg-2 md:grid md:grid-cols-[15rem_1fr]">
      {/* Sidebar — solo desktop */}
      <aside className="hidden border-r border-hairline bg-surface px-3 py-5 md:flex md:flex-col md:gap-1">
        <div className="flex items-center gap-2 px-3 pb-5">
          <img src="/icon.svg" alt="" className="h-7 w-7 rounded-md" />
          <span className="font-semibold tracking-tight">Pribrew</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive(to) ? "bg-accent text-accent-ink font-medium" : "text-ink-soft hover:bg-chip"
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
          {SIDEBAR_EXTRA.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive(to) ? "bg-accent text-accent-ink font-medium" : "text-ink-soft hover:bg-chip"
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <Link to="/brews/new" className="btn-primary mt-4">
          <Plus size={17} /> Nueva extracción
        </Link>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <button onClick={() => signOut()} className="btn-ghost flex-1 justify-start">
            <LogOut size={17} /> Salir
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-h-dvh flex-col">
        <header
          className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline px-4 py-3 backdrop-blur md:px-8"
          style={{ backgroundColor: "color-mix(in srgb, var(--bg-2) 85%, transparent)" }}
        >
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-7 w-7 rounded-md md:hidden" />
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="md:hidden">
            <ThemeToggle inline />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-8">{children}</main>
      </div>

      {/* Bottom nav — solo móvil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-center border-t border-hairline px-3 backdrop-blur md:hidden"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface) 95%, transparent)",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
          paddingTop: "0.5rem",
        }}
      >
        {NAV.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavTab key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
        ))}
        {/* FAB central */}
        <div className="grid place-items-center">
          <Link
            to="/brews/new"
            aria-label="Nueva extracción"
            className="-mt-7 grid place-items-center rounded-pill border-4 border-surface bg-accent text-accent-ink shadow-glow"
            style={{ height: 52, width: 52 }}
          >
            <Plus size={24} strokeWidth={2.4} />
          </Link>
        </div>
        {NAV.slice(2).map(({ to, label, icon: Icon }) => (
          <NavTab key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
        ))}
      </nav>
    </div>
  );
}

function NavTab({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-1.5 transition-colors ${
        active ? "text-accent" : "text-muted"
      }`}
    >
      <Icon size={21} strokeWidth={active ? 2.1 : 1.7} />
      <span className="mono text-[8.5px] uppercase tracking-[0.1em]">{label}</span>
    </Link>
  );
}
