import { useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";

const inks = ["#00a8d5", "#e83291", "#efbd16", "#7354d2"];

/** CSS shapes stay sharp on high-density screens without a video download. */
export function InkRain() {
  const [paused, setPaused] = useState(false);
  return (
    <>
      <div className="ink-rain" data-paused={paused} aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            className="ink-drop-track"
            style={
              {
                "--ink": inks[index % inks.length],
                "--left": `${3 + index * 5.5}%`,
                "--size": `${12 + (index % 4) * 7}px`,
                "--duration": `${4.5 + (index % 4) * 0.7}s`,
                "--delay": `${index * -0.63}s`,
              } as CSSProperties
            }
          >
            <span className="ink-drop" />
          </span>
        ))}
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
