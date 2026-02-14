
interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 24, fontSize: 20, letterSpacing: 3, gap: 8 },
  md: { icon: 32, fontSize: 26, letterSpacing: 4, gap: 10 },
  lg: { icon: 48, fontSize: 43, letterSpacing: 6, gap: 14 },
};

function AppIcon({ size }: { size: number }) {
  const r = size * 0.18;
  const pad = size * 0.2;
  const inner = size - pad * 2;
  const barH = inner * 0.14;
  const gap = inner * 0.08;
  const baseY = pad + inner * 0.22;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#09ADC3" />
          <stop offset="50%" stopColor="#128797" />
          <stop offset="100%" stopColor="#0098a8" />
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        rx={r}
        fill="url(#logo-grad)"
      />
      {/* Dashboard grid: 3 rows of bars, varying widths */}
      <rect
        x={pad}
        y={baseY}
        width={inner}
        height={barH}
        rx={barH / 2}
        fill="white"
        opacity={0.95}
      />
      <rect
        x={pad}
        y={baseY + barH + gap}
        width={inner * 0.7}
        height={barH}
        rx={barH / 2}
        fill="white"
        opacity={0.7}
      />
      <rect
        x={pad}
        y={baseY + (barH + gap) * 2}
        width={inner * 0.85}
        height={barH}
        rx={barH / 2}
        fill="white"
        opacity={0.5}
      />
      {/* Small square dot — personal indicator */}
      <rect
        x={pad + inner - barH * 1.1}
        y={baseY + barH + gap}
        width={barH * 1.1}
        height={barH * 1.1}
        rx={barH * 0.25}
        fill="white"
        opacity={0.9}
      />
    </svg>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        flexWrap: "nowrap",
      }}
    >
      <AppIcon size={s.icon} />
      <span
        style={{
          fontWeight: 800,
          fontFamily: "JetBrains Mono, monospace",
          textTransform: "uppercase",
          lineHeight: 1,
          fontSize: s.fontSize,
          letterSpacing: s.letterSpacing,
          background:
            "linear-gradient(135deg, #09ADC3 0%, #128797 50%, #0098a8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        unfust
      </span>
    </div>
  );
}
