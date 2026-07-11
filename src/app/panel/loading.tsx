import { Loader2 } from "lucide-react";

// Loading del panel: se muestra dentro del PanelShell mientras carga la página.
export default function PanelLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
