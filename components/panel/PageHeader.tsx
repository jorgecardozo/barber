import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

// Encabezado consistente para las vistas del panel: breadcrumb (sección › título)
// + acciones a la derecha. (Port de kampo/PageHeader, sin selector de campo —
// en flow-site el switcher de sucursal vive en la sidebar).
export function PageHeader({
  section,
  title,
  actions,
}: {
  section?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
      <div className="flex min-w-0 items-center gap-1.5 text-sm sm:text-base">
        {section && (
          <>
            <span className="font-semibold text-primary">{section}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate font-display text-xl text-foreground sm:text-2xl">{title}</span>
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
