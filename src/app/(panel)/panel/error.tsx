"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

// Error boundary del panel (queda dentro del PanelShell).
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <h2 className="font-display text-xl text-foreground">No se pudo cargar esta sección</h2>
      <p className="max-w-sm text-sm text-muted-foreground">Probá de nuevo.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}
