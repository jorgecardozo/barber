import Link from "next/link";

// 404 global.
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-display text-6xl text-primary">404</p>
      <h1 className="font-display text-2xl text-foreground">Esta página no existe</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que el enlace esté roto o que la página se haya movido.
      </p>
      <Link
        href="/"
        className="mt-2 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
