import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, NumInput, Select, Pills, FormScaffold } from "@/components/form";
import { beanSchema } from "@/domain/bean.schema";
import { useBean, useCreateBean, useUpdateBean, useDeleteBean } from "@/data/beans";

const PROCESS_OPTS = [
  { value: "washed", label: "Lavado" },
  { value: "natural", label: "Natural" },
  { value: "honey", label: "Honey" },
  { value: "anaerobic", label: "Anaeróbico" },
  { value: "other", label: "Otro" },
] as const;

const ROAST_OPTS = [
  { value: "light", label: "Claro" },
  { value: "medium-light", label: "Medio-claro" },
  { value: "medium", label: "Medio" },
  { value: "medium-dark", label: "Medio-oscuro" },
  { value: "dark", label: "Oscuro" },
] as const;

type Roast = (typeof ROAST_OPTS)[number]["value"];
type Process = (typeof PROCESS_OPTS)[number]["value"];

const numOrUndef = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};
const intOrUndef = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
};

export function BeanForm({ beanId }: { beanId?: string }) {
  const navigate = useNavigate();
  const editing = !!beanId;
  const { data: row } = useBean(beanId);
  const createBean = useCreateBean();
  const updateBean = useUpdateBean();
  const deleteBean = useDeleteBean();

  const [name, setName] = useState("");
  const [roaster, setRoaster] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [variety, setVariety] = useState("");
  const [process, setProcess] = useState<Process | "">("");
  const [roast, setRoast] = useState<Roast | null>(null);
  const [roastDate, setRoastDate] = useState("");
  const [weight, setWeight] = useState("");
  const [remaining, setRemaining] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Prellenar al cargar la fila en edición.
  useEffect(() => {
    if (!row) return;
    setName(row.name ?? "");
    setRoaster(row.roaster ?? "");
    setCountry(row.origin_country ?? "");
    setRegion(row.region ?? "");
    setVariety(row.variety ?? "");
    setProcess(row.process ?? "");
    setRoast(row.roast_level ?? null);
    setRoastDate(row.roast_date ?? "");
    setWeight(row.weight_g != null ? String(row.weight_g) : "");
    setRemaining(row.remaining_g != null ? String(row.remaining_g) : "");
    setNotes(row.roaster_notes ?? "");
  }, [row]);

  async function handleSave() {
    setErr(null);
    const parsed = beanSchema.safeParse({
      name: name.trim(),
      roaster: roaster.trim() || undefined,
      origin_country: country.trim() || undefined,
      region: region.trim() || undefined,
      variety: variety.trim() || undefined,
      process: process || undefined,
      roast_level: roast ?? undefined,
      roast_date: roastDate || undefined,
      weight_g: intOrUndef(weight),
      remaining_g: remaining.trim() ? intOrUndef(remaining) : intOrUndef(weight),
      roaster_notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    try {
      if (editing) await updateBean.mutateAsync({ id: beanId!, input: parsed.data });
      else await createBean.mutateAsync(parsed.data);
      navigate({ to: "/beans" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar el grano.");
    }
  }

  async function handleDelete() {
    if (!beanId) return;
    try {
      await deleteBean.mutateAsync(beanId);
      navigate({ to: "/beans" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo borrar el grano.");
    }
  }

  return (
    <AppShell title={editing ? "Editar grano" : "Nuevo grano"}>
      <FormScaffold
        title={editing ? "Editar" : "Agregar"}
        sub={editing ? "Inventario" : "Nuevo grano"}
        onBack={() => navigate({ to: "/beans" })}
        onSave={handleSave}
        saving={createBean.isPending || updateBean.isPending}
        error={err}
        onDelete={editing ? handleDelete : undefined}
        deleting={deleteBean.isPending}
      >
        <Field label="Nombre">
          <TextInput value={name} onChange={setName} placeholder="Ej. Finca La Esperanza" />
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Tostador" opt>
            <TextInput value={roaster} onChange={setRoaster} />
          </Field>
          <Field label="País" opt>
            <TextInput value={country} onChange={setCountry} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Región" opt>
            <TextInput value={region} onChange={setRegion} />
          </Field>
          <Field label="Variedad" opt>
            <TextInput value={variety} onChange={setVariety} />
          </Field>
        </div>

        <Field label="Proceso" opt>
          <Select<Process>
            value={process}
            onChange={setProcess}
            options={PROCESS_OPTS as unknown as { value: Process; label: string }[]}
            placeholder="—"
          />
        </Field>

        <Field label="Nivel de tueste" opt>
          <Pills<Roast>
            value={roast}
            onChange={setRoast}
            options={ROAST_OPTS as unknown as { value: Roast; label: string }[]}
            allowNull
          />
        </Field>

        <Field label="Fecha de tueste" opt help="Determina los días post-tueste / frescura.">
          <input type="date" value={roastDate} onChange={(e) => setRoastDate(e.target.value)} className="field" />
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Peso bolsa" opt>
            <NumInput value={weight} onChange={setWeight} unit="g" />
          </Field>
          <Field label="Restante" opt help="Por defecto = peso bolsa.">
            <NumInput value={remaining} onChange={setRemaining} unit="g" />
          </Field>
        </div>

        <Field label="Notas del tostador" opt help="Separa por coma; se muestran como chips.">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Chocolate, cereza, panela…"
            className="field resize-none leading-relaxed"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </Field>
      </FormScaffold>
    </AppShell>
  );
}
