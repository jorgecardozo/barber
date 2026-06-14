/**
 * BrandMark — recreación tipográfica del logo "5" cromado.
 * 👉 Cuando tengas el PNG real, dejalo en /public/logo.png y reemplazá
 *    este componente por <Image src="/logo.png" ... />.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display leading-none select-none chrome-text italic ${className}`}
      aria-label="Flow Site"
    >
      5
    </span>
  );
}
