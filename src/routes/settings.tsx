import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bean, SlidersHorizontal, Users, LogOut, Sun, Moon, ChevronRight, Pencil, Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, ScreenHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useTheme, type Theme } from "@/lib/theme";
import { useBeans } from "@/data/beans";
import { useGrinders } from "@/data/grinders";
import { useMyGroups } from "@/data/groups";
import { useMyProfile, useUpdateProfile, isUsernameAvailable } from "@/data/profiles";

// 3–20 caracteres: letras, números, guion y guion bajo.
const USERNAME_RE = /^[a-z0-9_-]{3,20}$/i;

export const Route = createFileRoute("/settings")({
  component: SettingsScreen,
});

function ThemeOption({ value, current, onPick, icon: Icon, label }: {
  value: Theme;
  current: Theme;
  onPick: (t: Theme) => void;
  icon: typeof Sun;
  label: string;
}) {
  const sel = value === current;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className="mono flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors"
      style={{
        background: sel ? "var(--accent)" : "transparent",
        color: sel ? "var(--accent-ink)" : "var(--ink-soft)",
      }}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function NavRow({ to, icon: Icon, label, count }: {
  to: string;
  icon: typeof Bean;
  label: string;
  count?: number;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-1 py-3 transition-colors hover:bg-chip">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-md border border-hairline bg-surface-2 text-ink-soft">
        <Icon size={17} />
      </span>
      <span className="flex-1 text-[14px] font-semibold text-ink">{label}</span>
      {count != null && <span className="mono text-[13px] text-muted">{count}</span>}
      <ChevronRight size={17} className="text-faint" />
    </Link>
  );
}

/** Tarjeta de perfil con el username (único) editable: lo que ve el grupo. */
function ProfileCard({ name, initial, email }: { name: string; initial: string; email: string }) {
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [err, setErr] = useState<string | null>(null);

  function cancel() {
    setEditing(false);
    setValue(name);
    setErr(null);
  }

  async function save() {
    const next = value.trim();
    if (!next || next === name) {
      cancel();
      return;
    }
    if (!USERNAME_RE.test(next)) {
      setErr("3–20 caracteres (letras, números, - o _)");
      return;
    }
    if (!(await isUsernameAvailable(next))) {
      setErr("Ese usuario ya está en uso");
      return;
    }
    await updateProfile.mutateAsync(next);
    setEditing(false);
    setErr(null);
  }

  return (
    <Card className="flex items-center gap-4">
      <span className="grid h-14 w-14 flex-none place-items-center rounded-pill bg-accent text-[22px] font-semibold text-accent-ink">
        {initial}
      </span>
      {editing ? (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <input
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              maxLength={20}
              placeholder="tu_usuario"
              className="min-w-0 flex-1 rounded-md border border-hairline-strong bg-surface-2 px-3 py-2 text-[15px] text-ink outline-none placeholder:text-faint"
            />
            <button
              onClick={save}
              disabled={updateProfile.isPending}
              aria-label="Guardar"
              className="grid h-9 w-9 flex-none place-items-center rounded-md bg-accent text-accent-ink disabled:opacity-60"
            >
              <Check size={17} />
            </button>
            <button
              onClick={cancel}
              aria-label="Cancelar"
              className="grid h-9 w-9 flex-none place-items-center rounded-md border border-hairline text-muted"
            >
              <X size={17} />
            </button>
          </div>
          {err && <p className="text-[13px] text-roast">{err}</p>}
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold text-ink">{name}</div>
            <div className="truncate text-[13px] text-muted">{email}</div>
          </div>
          <button
            onClick={() => {
              setValue(name);
              setEditing(true);
            }}
            aria-label="Editar usuario"
            className="grid h-9 w-9 flex-none place-items-center rounded-md border border-hairline text-muted transition-colors hover:bg-chip"
          >
            <Pencil size={16} />
          </button>
        </>
      )}
    </Card>
  );
}

function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { data: beans = [] } = useBeans();
  const { data: grinders = [] } = useGrinders();
  const { data: groups = [] } = useMyGroups();

  const { data: profile } = useMyProfile();

  const email = session?.user?.email ?? "";
  const local = email.split("@")[0] || "barista";
  // El username visible para el grupo; si falta, derivamos de la parte del email.
  const name = profile?.username || local;
  const initial = name.charAt(0).toUpperCase();

  const setTheme = (t: Theme) => {
    if (t !== theme) toggle();
  };

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <AppShell title="Ajustes">
      <div className="mx-auto max-w-md">
        <ScreenHeader sub="Preferencias" title="Ajustes" />

        <div className="flex flex-col gap-5">
          {/* perfil */}
          <ProfileCard name={name} initial={initial} email={email} />

          {/* apariencia */}
          <div>
            <div className="tag mb-2">Apariencia</div>
            <Card className="flex gap-1.5 bg-surface-2">
              <ThemeOption value="dark" current={theme} onPick={setTheme} icon={Moon} label="Oscuro" />
              <ThemeOption value="light" current={theme} onPick={setTheme} icon={Sun} label="Claro" />
            </Card>
          </div>

          {/* inventario */}
          <div>
            <div className="tag mb-2">Inventario</div>
            <Card pad={false} className="divide-y divide-hairline px-3">
              <NavRow to="/beans" icon={Bean} label="Granos" count={beans.length} />
              <NavRow to="/grinders" icon={SlidersHorizontal} label="Moledores" count={grinders.length} />
              <NavRow to="/groups" icon={Users} label="Grupos" count={groups.length} />
            </Card>
          </div>

          {/* cuenta */}
          <div>
            <div className="tag mb-2">Cuenta</div>
            <button onClick={handleSignOut} className="btn-ghost w-full justify-center">
              <LogOut size={17} /> Cerrar sesión
            </button>
          </div>

          <p className="mono pt-2 text-center text-[11px] uppercase tracking-[0.12em] text-faint">
            Pribrew · bitácora de extracción
          </p>
        </div>
      </div>
    </AppShell>
  );
}
