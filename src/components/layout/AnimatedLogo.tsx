type AnimatedLogoProps = {
  name?: string;
  tagline?: string;
  width?: number | string; // e.g. 280 or "100%"
  height?: number | string; // e.g. 120
  className?: string;
};

export function AnimatedLogo({
  name = 'Zentro',
  tagline = 'Professional Business Management',
  width = '100%',
  height = 120,
  className = '',
}: AnimatedLogoProps): JSX.Element {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        width,
        height,
        display: 'inline-block',
        lineHeight: 0,
      }}
      aria-hidden={false}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 320 120"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${name} — ${tagline}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        <title>{`${name} — ${tagline}`}</title>
        <defs>
          {/* Main gradient for the mark */}
          <linearGradient id="g-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8AA1FF" />
            <stop offset="45%" stopColor="#7B61FF" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>

          {/* Accent gradient for underline */}
          <linearGradient id="g-underline" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B61FF" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>

          {/* Soft glow filter for depth */}
          <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* subtle texture (optional) */}
          <pattern
            id="p-diag"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(30)"
          >
            <rect width="14" height="14" fill="rgba(255,255,255,0.02)" />
            <path d="M0 14 L14 0" stroke="rgba(255,255,255,0.02)" strokeWidth="0.6" />
          </pattern>

          {/* Reusable unit circle for orbit dots */}
          <circle id="unitDot" cx="0" cy="0" r="3" />

          <style>{`
            /* SVG-scoped animations and classes */
            .mark-root { transform-origin: 80px 60px; }
            .spin-slow { animation: spin 12s linear infinite; }
            .spin-fast { animation: spinReverse 7s linear infinite; }
            .float { animation: float 4.8s ease-in-out infinite; }
            .pulse { animation: pulse 2.8s ease-in-out infinite; transform-origin: 80px 60px; }
            .dotA { animation: orbitA 6s linear infinite; transform-origin: 80px 60px; }
            .dotB { animation: orbitB 8s linear infinite; transform-origin: 80px 60px; }
            .dotC { animation: orbitC 5.5s linear infinite; transform-origin: 80px 60px; }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }

            @keyframes spinReverse {
              from { transform: rotate(0deg); }
              to   { transform: rotate(-360deg); }
            }

            @keyframes float {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-3px); }
              100% { transform: translateY(0px); }
            }

            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.95; }
              50% { transform: scale(1.06); opacity: 1; }
              100% { transform: scale(1); opacity: 0.95; }
            }

            /* orbit keyframes - create staggered circular motion with slight radial change */
            @keyframes orbitA {
              0%   { transform: rotate(0deg) translateX(54px) rotate(0deg); }
              50%  { transform: rotate(180deg) translateX(54px) rotate(-180deg); }
              100% { transform: rotate(360deg) translateX(54px) rotate(-360deg); }
            }

            @keyframes orbitB {
              0%   { transform: rotate(90deg) translateX(70px) rotate(-90deg); }
              50%  { transform: rotate(270deg) translateX(70px) rotate(-270deg); }
              100% { transform: rotate(450deg) translateX(70px) rotate(-450deg); }
            }

            @keyframes orbitC {
              0%   { transform: rotate(-60deg) translateX(40px) rotate(60deg); }
              50%  { transform: rotate(120deg) translateX(40px) rotate(-120deg); }
              100% { transform: rotate(300deg) translateX(40px) rotate(-300deg); }
            }

            /* stroked ring sweep using dashoffset (for older browsers SMIL fallback used too) */
            .ring { stroke-dasharray: 250; stroke-dashoffset: 250; animation: ringSweep 5.6s linear infinite; }

            @keyframes ringSweep {
              to { stroke-dashoffset: 0; }
            }
          `}</style>
        </defs>

        {/* background card for preview contexts (transparency optional) */}
        {/* <rect x="0" y="0" width="320" height="120" rx="8" fill="#0f1724" /> */}

        {/* Left logo mark group */}
        <g className="mark-root" transform="translate(80,60)">
          {/* subtle outer glow ring */}
          <g className="spin-slow" style={{ opacity: 0.12 }}>
            <circle cx="0" cy="0" r="58" fill="none" stroke="url(#g-main)" strokeWidth="6" />
          </g>

          {/* stroked animated ring */}
          <g className="float" transform="rotate(-12)">
            <circle
              cx="0"
              cy="0"
              r="46"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="3"
              className="ring"
              strokeLinecap="round"
            >
              {/* SMIL fallback to ensure dashoffset animates in environments without CSS animation support */}
              <animate attributeName="stroke-dashoffset" values="250;0" dur="5.6s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* geometric diamond/lozenge (the main mark) */}
          <g className="pulse" filter="url(#f-glow)">
            {/* outer shape */}
            <path
              d="M -20 -3 L 0 -33 L 20 -3 L 0 28 Z"
              fill="url(#g-main)"
              opacity="0.98"
              transform="scale(0.98)"
            />

            {/* inner cutout for depth */}
            <path d="M -12 -2 L 0 -23 L 12 -2 L 0 18 Z" fill="#0b0f15" opacity="0.98" />

            {/* thin stroke to define edges */}
            <path
              d="M -20 -3 L 0 -33 L 20 -3 L 0 28 Z"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>

          {/* Orbiting dots suggesting connected modules */}
          <g style={{ mixBlendMode: 'screen' }}>
            <g className="dotA" style={{ transformOrigin: '80px 60px' }}>
              <use href="#unitDot" x="0" y="0" fill="#fff" opacity="0.95" />
            </g>
            <g className="dotB">
              <use href="#unitDot" x="0" y="0" fill="#fff" opacity="0.85" />
            </g>
            <g className="dotC">
              <use href="#unitDot" x="0" y="0" fill="#fff" opacity="0.9" />
            </g>
          </g>

          {/* small accent: three tiny halo dots that pulse */}
          <g transform="translate(-34,-36)">
            <circle cx="0" cy="0" r="2.6" fill="#8AA1FF" opacity="0.95" />
            <circle cx="12" cy="6" r="1.8" fill="#7B61FF" opacity="0.85" />
            <circle cx="-8" cy="14" r="1.6" fill="#00D4FF" opacity="0.9" />
          </g>
        </g>

        {/* Right text block */}
        <g transform="translate(140,28)">
          <text
            x="0"
            y="24"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight={700}
            fontSize={20}
            fill="#FFFFFF"
          >
            {name}
          </text>

          <text
            x="0"
            y="46"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight={400}
            fontSize={11.5}
            fill="#9AA4B2"
          >
            {tagline}
          </text>

          {/* Animated gradient underline */}
          <rect x="0" y="58" width="160" height="4" rx="2" fill="url(#g-underline)" opacity={0.95}>
            {/* animate width for a subtle loading-style underline */}
            <animate attributeName="width" values="0;160;0" dur="4.8s" repeatCount="indefinite" />
          </rect>
        </g>

      </svg>
    </div>
  );
}

export default AnimatedLogo;
