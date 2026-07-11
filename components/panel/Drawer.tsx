"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type DrawerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  submitLabel?: string;
  children: ReactNode;
  submitting?: boolean;
  // Navegación entre ítems (flechas en el header).
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  navLabel?: string;
  // Acciones extra a la izquierda del footer.
  secondaryActions?: ReactNode;
  // key para forzar remonte del form al navegar (resetea inputs no controlados).
  formKey?: string;
};

const navBtn =
  "inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";

// Panel lateral derecho (drawer) con formulario. Sin overlay que tape la tabla:
// el usuario sigue viendo y navegando los ítems. Cierra con Escape. (Port de kampo)
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = "Guardar",
  children,
  submitting = false,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  navLabel,
  secondaryActions,
  formKey,
}: DrawerProps) {
  const showNav = !!(onPrev || onNext);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "110%" }}
          animate={{ x: 0 }}
          exit={{ x: "110%" }}
          transition={{ type: "tween", duration: 0.25 }}
          className="fixed bottom-3 right-3 top-3 z-[80] flex w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Header: navegación (izquierda) → título → cerrar (derecha) */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              {showNav && (
                <div className="flex items-center gap-1.5">
                  <button type="button" className={navBtn} onClick={onPrev} disabled={!canPrev} title="Anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" className={navBtn} onClick={onNext} disabled={!canNext} title="Siguiente">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {navLabel && (
                    <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">{navLabel}</span>
                  )}
                  <span className="mx-1 h-6 w-px bg-border" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-foreground">{title}</h2>
                {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar (Esc)"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cuerpo en 2 columnas */}
          <form
            key={formKey}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(new FormData(e.currentTarget));
            }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
              {children}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2">{secondaryActions}</div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Guardando…" : submitLabel}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Campo etiquetado para usar dentro del Drawer.
export function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export default Drawer;
