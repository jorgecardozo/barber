export function SectionHeading({
  eyebrow,
  title,
  accent,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
}) {
  return (
    <div className="mb-12 text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-flow-cyan">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl md:text-5xl">
        {title} {accent && <span className="chrome-text italic">{accent}</span>}
      </h2>
    </div>
  );
}
