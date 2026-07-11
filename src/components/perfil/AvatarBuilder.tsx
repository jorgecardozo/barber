"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Shuffle, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { guardarAvatarAction } from "@/lib/actions";
import { AVATAR_OPTIONS, AVATAR_DEFAULTS, buildAvatarUrl, type AvatarOpts } from "@/shared/lib/avatar";

type Opts = Omit<AvatarOpts, "seed">;

const GROUPS: { key: keyof Opts; label: string }[] = [
  { key: "top", label: "Pelo / gorra" },
  { key: "hairColor", label: "Color de pelo" },
  { key: "facialHair", label: "Barba" },
  { key: "accessories", label: "Anteojos" },
  { key: "clothing", label: "Ropa" },
  { key: "clothesColor", label: "Color de ropa" },
];

function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

export function AvatarBuilder({ seed, initial }: { seed: string; initial?: Partial<Opts> }) {
  const [opts, setOpts] = useState<Opts>({ ...AVATAR_DEFAULTS, ...initial });
  const [saving, startSaving] = useTransition();

  const url = useMemo(() => buildAvatarUrl({ seed, ...opts }), [seed, opts]);

  function set<K extends keyof Opts>(key: K, value: Opts[K]) {
    setOpts((o) => ({ ...o, [key]: value }));
  }

  function sorpresa() {
    const r = () => Math.random();
    setOpts({
      top: pick(AVATAR_OPTIONS.top, r()).v,
      hairColor: pick(AVATAR_OPTIONS.hairColor, r()).v,
      facialHair: pick(AVATAR_OPTIONS.facialHair, r()).v,
      accessories: pick(AVATAR_OPTIONS.accessories, r()).v,
      clothing: pick(AVATAR_OPTIONS.clothing, r()).v,
      clothesColor: pick(AVATAR_OPTIONS.clothesColor, r()).v,
    });
  }

  function guardar() {
    const fd = new FormData();
    fd.set("avatarUrl", url);
    startSaving(async () => {
      await guardarAvatarAction(fd);
      toast.success("¡Avatar guardado!", { description: "Así te van a ver en la barbería." });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
      {/* Preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-5 py-8">
            <motion.div
              key={url}
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative"
            >
              <div className="absolute inset-0 -z-10 rounded-full bg-flow-cyan/25 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Tu avatar"
                width={176}
                height={176}
                className="h-44 w-44 rounded-full border-2 border-flow-cyan/50 bg-secondary"
              />
            </motion.div>
            <div className="flex w-full flex-col gap-2">
              <Button variant="outline" onClick={sorpresa} className="w-full">
                <Shuffle className="h-4 w-4" /> Sorpresa
              </Button>
              <Button onClick={guardar} disabled={saving} className="w-full">
                {saving ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Check className="h-4 w-4" />}
                {saving ? "Guardando…" : "Guardar avatar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opciones */}
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <fieldset key={g.key}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-flow-cyan">
              {g.label}
            </legend>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS[g.key].map((opt) => {
                const active = opts[g.key] === opt.v;
                const swatch = g.key === "hairColor" || g.key === "clothesColor";
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => set(g.key, opt.v)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                      active
                        ? "border-flow-cyan bg-flow-cyan/15 text-flow-cyan"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-flow-cyan/40 hover:text-foreground"
                    }`}
                  >
                    {swatch && (
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/20"
                        style={{ background: `#${opt.v}` }}
                      />
                    )}
                    {opt.l}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
