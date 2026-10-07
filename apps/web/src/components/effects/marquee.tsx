/** Infinite ticker strip, pure CSS. Duplicate content 2x for a seamless loop. */
export function Marquee({
  items,
  className = "",
  fast = false,
}: {
  items: string[];
  className?: string;
  fast?: boolean;
}) {
  const row = (key: string, hidden: boolean) => (
    <div key={key} aria-hidden={hidden} className="marquee-track">
      {items.map((item, i) => (
        <span key={i} className="marquee-item">
          {item}
          <span className="marquee-star">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`marquee ${fast ? "marquee-fast" : ""} ${className}`}>
      {row("a", false)}
      {row("b", true)}
    </div>
  );
}
