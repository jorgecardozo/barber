"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

// Error boundary global (App Router). Debe ser client component.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-display text-2xl text-foreground">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ocurrió un error inesperado. Probá de nuevo; si sigue pasando, recargá la página.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}
