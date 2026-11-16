import { useId, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { asset } from "../lib/utils";

const inks = ["#00b8e4", "#ed2698", "#f4c900", "#8c48ed"];

/** Vector paint stays sharp at every resolution; animation never changes header size. */
export function InkRain() {
  const [paused, setPaused] = useState(false);
  const id = useId().replace(/:/g, "");
  return (
    <>
      <div className="ink-rain" data-paused={paused} aria-hidden="true">
        {!paused && (
          <div className="reference-paint">
            <div className="reference-paint-top">
              <img src={asset("assets/ink-splash-reference.gif")} alt="" />
            </div>
            <div className="reference-paint-bottom">
              <img src={asset("assets/ink-splash-reference.gif")} alt="" />
            </div>
          </div>
        )}
        {inks.map((ink, index) => {
          const gradient = `${id}-paint-${index}`;
          return (
            <div
              key={ink}
              className="paint-lane"
              style={
                {
                  "--ink": ink,
                  "--left": `${10 + index * 26}%`,
                  "--delay": `${index * -0.95}s`,
                } as CSSProperties
              }
            >
              <div className="liquid-drop">
                <span />
              </div>
              <svg
                className="paint-pool"
                viewBox="0 0 300 95"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={gradient} x1="0" y1="0" x2="0.2" y2="1">
                    <stop stopColor="white" stopOpacity=".8" />
                    <stop offset=".35" stopColor={ink} stopOpacity=".55" />
                    <stop offset=".7" stopColor={ink} />
                    <stop offset="1" stopColor={ink} stopOpacity=".85" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 77 C22 52 42 89 70 74 S109 56 145 74 S197 53 232 71 S277 48 300 65 L300 95 H0Z"
                  fill={`url(#${gradient})`}
                />
                <path
                  d="M0 87 C36 65 54 96 89 82 S133 67 169 83 S225 65 254 80 S281 72 300 76"
                  fill="none"
                  stroke="white"
                  strokeOpacity=".55"
                  strokeWidth="3"
                />
                <g className="paint-impact" fill={`url(#${gradient})`}>
                  <path d="M91 80 Q110 76 99 45 Q120 65 130 58 L137 28 Q144 67 155 61 Q175 59 187 39 Q173 76 205 80 Q152 96 91 80Z" />
                  <ellipse
                    cx="147"
                    cy="81"
                    rx="56"
                    ry="9"
                    fill="none"
                    stroke={ink}
                    strokeWidth="3"
                  />
                  <ellipse cx="108" cy="35" rx="3" ry="6" />
                  <ellipse cx="138" cy="17" rx="2.5" ry="5" />
                  <ellipse cx="186" cy="29" rx="3" ry="5" />
                  <circle cx="207" cy="55" r="3" />
                  <circle cx="87" cy="56" r="2.5" />
                </g>
              </svg>
            </div>
          );
        })}
      </div>
      <button
        className="ink-motion-control"
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={
          paused ? "Play background animation" : "Pause background animation"
        }
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
        <span>{paused ? "Play colours" : "Pause colours"}</span>
      </button>
    </>
  );
}
