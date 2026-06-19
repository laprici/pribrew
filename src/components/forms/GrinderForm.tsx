import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, NumInput, Pills, FormScaffold } from "@/components/form";
import { ShareGroupsField } from "@/components/ShareGroups";
import { grinderSchema } from "@/domain/grinder.schema";
import { useGrinder, useCreateGrinder, useUpdateGrinder, useDeleteGrinder } from "@/data/grinders";
import { useItemShares, useSetItemShares } from "@/data/shares";

type GType = "manual" | "electric";
type SKind = "stepped" | "stepless";

const TYPE_OPTS = [
  { value: "manual", label: "Manual" },
  { value: "electric", label: "Eléctrico" },
] as const;

const KIND_OPTS = [
  { value: "stepped", label: "Por pasos" },
  { value: "stepless", label: "Continuo" },
] as const;

const numOrUndef = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

export function GrinderForm({ grinderId }: { grinderId?: string }) {
  const navigate = useNavigate();
  const editing = !!grinderId;
  const { data: row } = useGrinder(grinderId);
  const createGrinder = useCreateGrinder();
  const updateGrinder = useUpdateGrinder();
  const deleteGrinder = useDeleteGrinder();
  const setShares = useSetItemShares("grinder");
  const { data: existingShares } = useItemShares("grinder", grinderId);

  const [shareGroups, setShareGroups] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<GType>("manual");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [burr, setBurr] = useState("");
  const [kind, setKind] = useState<SKind>("stepped");
  const [minS, setMinS] = useState("");
  const [maxS, setMaxS] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setName(row.name ?? "");
    setType(row.type ?? "manual");
    setBrand(row.brand ?? "");
    setModel(row.model ?? "");
    setBurr(row.burr_type ?? "");
    setKind(row.setting_kind ?? "stepped");
    setMinS(row.min_setting != null ? String(row.min_setting) : "");
    setMaxS(row.max_setting != null ? String(row.max_setting) : "");
    setUnit(row.unit_label ?? "");
    setNotes(row.notes ?? "");
  }, [row]);

  useEffect(() => {
    if (existingShares) setShareGroups(existingShares);
  }, [existingShares]);

  async function handleSave() {
    setErr(null);
    const parsed = grinderSchema.safeParse({
      name: name.trim(),
      type,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      burr_type: burr.trim() || undefined,
      setting_kind: kind,
      min_setting: numOrUndef(minS),
      max_setting: numOrUndef(maxS),
      unit_label: unit.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    try {
      const id = editing
        ? (await updateGrinder.mutateAsync({ id: grinderId!, input: parsed.data }), grinderId!)
        : await createGrinder.mutateAsync(parsed.data);
      await setShares.mutateAsync({ itemId: id, groupIds: shareGroups });
      navigate({ to: "/grinders" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar el moledor.");
    }
  }

  async function handleDelete() {
    if (!grinderId) return;
    try {
      await deleteGrinder.mutateAsync(grinderId);
      navigate({ to: "/grinders" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo borrar el moledor.");
    }
  }

  return (
    <AppShell title={editing ? "Editar moledor" : "Nuevo moledor"}>
      <FormScaffold
        title={editing ? "Editar" : "Agregar"}
        sub={editing ? "Inventario" : "Nuevo moledor"}
        onBack={() => navigate({ to: "/grinders" })}
        onSave={handleSave}
        saving={createGrinder.isPending || updateGrinder.isPending || setShares.isPending}
        error={err}
        onDelete={editing ? handleDelete : undefined}
        deleting={deleteGrinder.isPending}
      >
        <Field label="Nombre">
          <TextInput value={name} onChange={setName} placeholder="Ej. 1Zpresso J-Max" />
        </Field>

        <Field label="Tipo">
          <Pills<GType> value={type} onChange={(v) => v && setType(v)} options={TYPE_OPTS as unknown as { value: GType; label: string }[]} />
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Marca" opt>
            <TextInput value={brand} onChange={setBrand} />
          </Field>
          <Field label="Modelo" opt>
            <TextInput value={model} onChange={setModel} />
          </Field>
        </div>

        <Field label="Fresas (burr)" opt help="Cónicas, planas, material…">
          <TextInput value={burr} onChange={setBurr} />
        </Field>

        <Field label="Ajuste">
          <Pills<SKind> value={kind} onChange={(v) => v && setKind(v)} options={KIND_OPTS as unknown as { value: SKind; label: string }[]} />
        </Field>

        <div className="grid grid-cols-3 gap-3.5">
          <Field label="Mín" opt>
            <NumInput value={minS} onChange={setMinS} />
          </Field>
          <Field label="Máx" opt>
            <NumInput value={maxS} onChange={setMaxS} />
          </Field>
          <Field label="Unidad" opt>
            <TextInput value={unit} onChange={setUnit} placeholder="clicks" />
          </Field>
        </div>

        <Field label="Notas" opt>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="field resize-none leading-relaxed"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </Field>

        <ShareGroupsField value={shareGroups} onChange={setShareGroups} />
      </FormScaffold>
    </AppShell>
  );
}
