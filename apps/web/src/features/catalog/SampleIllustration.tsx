import type { Product } from "../../types";
export function SampleIllustration({ product: p }: { product: Product }) {
  const ink = p.fg;
  switch (p.category) {
    case "Nature":
      return (
        <>
          <path
            d="M210 350Q310 230 455 95"
            fill="none"
            stroke={ink}
            strokeWidth="5"
          />
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse
              key={i}
              cx={225 + i * 32}
              cy={270 - i * 24}
              rx="28"
              ry="70"
              fill={ink}
              opacity={0.35 + i * 0.07}
              transform={`rotate(${i % 2 ? 45 : -40} ${225 + i * 32} ${270 - i * 24})`}
            />
          ))}
        </>
      );
    case "Landscape":
      return (
        <>
          <circle cx="455" cy="95" r="44" fill="#f5d691" />
          <path
            d="M0 350L170 105L330 300L470 130L640 340V480H0"
            fill={ink}
            opacity=".45"
          />
          <path
            d="M0 410L220 230L370 370L530 240L640 385V480H0"
            fill={ink}
            opacity=".7"
          />
          <path
            d="M132 162L170 105L209 164L168 147Z"
            fill="#f2f4ed"
            opacity=".8"
          />
        </>
      );
    case "Floral":
      return (
        <>
          {[
            [225, 175, 1],
            [405, 145, 0.8],
            [340, 280, 0.7],
          ].map(([x, y, scale], j) => (
            <g key={j} transform={`translate(${x} ${y}) scale(${scale})`}>
              {Array.from({ length: 6 }, (_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-38"
                  rx="26"
                  ry="63"
                  transform={`rotate(${i * 60})`}
                  fill={ink}
                  opacity=".5"
                />
              ))}
              <circle r="26" fill="#f4d596" />
            </g>
          ))}
        </>
      );
    case "Business":
      return (
        <>
          <rect
            x="120"
            y="102"
            width="215"
            height="240"
            rx="9"
            fill="#fff"
            transform="rotate(-9 227 222)"
            opacity=".9"
          />
          <rect x="148" y="130" width="156" height="13" rx="3" fill={ink} />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x="148"
              y={162 + i * 22}
              width={120 - i * 12}
              height="5"
              fill={ink}
              opacity=".3"
            />
          ))}
          <rect x="300" y="208" width="235" height="135" rx="7" fill={ink} />
          <text
            x="324"
            y="258"
            fontFamily="Arial"
            fontSize="19"
            fontWeight="bold"
            fill={p.bg}
          >
            YOUR BRAND
          </text>
          <path
            d="M326 285H464M326 299H418"
            stroke={p.bg}
            strokeWidth="4"
            opacity=".7"
          />
          <path
            d="M425 112L456 100L487 112V153L456 175L425 153Z"
            fill={ink}
            opacity=".4"
          />
        </>
      );
    case "Festival":
      return (
        <>
          <g stroke={ink} fill="none" opacity=".3">
            <circle cx="320" cy="200" r="137" strokeWidth="3" />
            <circle
              cx="320"
              cy="200"
              r="153"
              strokeWidth="8"
              strokeDasharray="3 19"
            />
          </g>
          {[190, 320, 450].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i === 1 ? 190 : 235})`}>
              <path d="M-54 0Q0 90 54 0Z" fill={ink} />
              <path d="M0 -87Q-40 -40 0 -10Q35 -40 0 -87" fill="#efae36" />
              <path d="M0 -58Q-17 -32 0 -13Q16 -32 0 -58" fill="#ffe7a3" />
            </g>
          ))}
        </>
      );
    case "Wedding":
      return (
        <>
          <circle
            cx="280"
            cy="194"
            r="60"
            fill="none"
            stroke="#bd945b"
            strokeWidth="12"
          />
          <circle
            cx="364"
            cy="194"
            r="60"
            fill="none"
            stroke="#bd945b"
            strokeWidth="12"
          />
          <path
            d="M170 300Q115 150 230 80M470 300Q525 150 410 80"
            fill="none"
            stroke={ink}
            strokeWidth="3"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} fill={ink} opacity=".5">
              <ellipse
                cx={165 + i * 8}
                cy={270 - i * 40}
                rx="10"
                ry="24"
                transform={`rotate(-35 ${165 + i * 8} ${270 - i * 40})`}
              />
              <ellipse
                cx={475 - i * 8}
                cy={270 - i * 40}
                rx="10"
                ry="24"
                transform={`rotate(35 ${475 - i * 8} ${270 - i * 40})`}
              />
            </g>
          ))}
          <text
            x="320"
            y="326"
            textAnchor="middle"
            fontFamily="Georgia"
            fontSize="43"
            fill={ink}
          >
            A &amp; R
          </text>
        </>
      );
    default:
      return p.variant === 2 ? (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={152 + i * 30}
              y={65 + i * 22}
              width="190"
              height="190"
              rx="95"
              fill="none"
              stroke={ink}
              strokeWidth="11"
              opacity={0.3 + i * 0.12}
            />
          ))}
        </>
      ) : (
        <>
          <circle cx="235" cy="154" r="92" fill={ink} opacity=".75" />
          <rect
            x="285"
            y="145"
            width="170"
            height="170"
            fill={ink}
            opacity=".35"
          />
          <path d="M140 340L300 180L460 340Z" fill="#c9a179" />
          <circle cx="445" cy="105" r="36" fill={ink} opacity=".4" />
        </>
      );
  }
}
