import { Loader2 } from "lucide-react";

// Fallback de Suspense a nivel raíz mientras carga una ruta.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
