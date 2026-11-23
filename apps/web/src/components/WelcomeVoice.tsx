import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export const WELCOME_INTERVAL = 10 * 60 * 1000;
export const WELCOME_MESSAGE = "फूलो मल्टीग्राफिक्स में आपका स्वागत है।";
const preferenceKey = "phulo-welcome-voice";
const lastPlayedKey = "phulo-welcome-last-played";

function readSession(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function saveSession(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* In-memory controls still work. */ }
}

export function WelcomeVoice() {
  const supported = typeof window !== "undefined" && typeof window.speechSynthesis?.speak === "function" && typeof window.SpeechSynthesisUtterance === "function";
  const [enabled, setEnabled] = useState(() => readSession(preferenceKey) !== "off");
  const [status, setStatus] = useState<"ready" | "speaking" | "error">("ready");
  const enabledRef = useRef(enabled);
  const playRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const stored = Number(readSession(lastPlayedKey));
    let lastPlayed = Number.isFinite(stored) && stored > 0 ? Math.min(stored, Date.now()) : 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: SpeechSynthesisUtterance | null = null;
    let disposed = false;

    function clearTimer() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    }
    function schedule() {
      clearTimer();
      if (disposed || !enabledRef.current || document.hidden || !lastPlayed) return;
      timer = setTimeout(play, Math.max(1000, lastPlayed + WELCOME_INTERVAL - Date.now()));
    }
    function stop() {
      clearTimer();
      if (current) {
        current.onstart = current.onend = current.onerror = null;
        current = null;
        synth.cancel();
      }
      if (!disposed) setStatus("ready");
    }
    function play() {
      clearTimer();
      if (disposed || !enabledRef.current || document.hidden || current) return;
      // Don't interrupt another utterance already using this page's speech engine.
      if (synth.speaking || synth.pending) { timer = setTimeout(play, 30000); return; }
      const utterance = new SpeechSynthesisUtterance(WELCOME_MESSAGE);
      utterance.lang = "hi-IN";
      utterance.rate = 0.95;
      utterance.volume = 0.8;
      const voice = synth.getVoices().find((item) => /^hi(?:-|$)/i.test(item.lang));
      if (voice) utterance.voice = voice;
      current = utterance;
      utterance.onstart = () => {
        if (disposed || !enabledRef.current) return;
        lastPlayed = Date.now();
        saveSession(lastPlayedKey, String(lastPlayed));
        setStatus("speaking");
      };
      utterance.onend = () => {
        current = null;
        if (disposed) return;
        setStatus("ready");
        schedule();
      };
      const failed = () => {
        current = null;
        if (disposed) return;
        clearTimer();
        enabledRef.current = false;
        setEnabled(false);
        setStatus("error");
        saveSession(preferenceKey, "off");
      };
      utterance.onerror = failed;
      try { synth.speak(utterance); } catch { failed(); }
    }
    function firstInteraction(event: Event) {
      if (event.target instanceof Element && event.target.closest("[data-welcome-control]")) return;
      if (enabledRef.current && !lastPlayed && !current) play();
    }
    function visibility() {
      if (document.hidden) stop();
      else schedule();
    }
    playRef.current = play;
    stopRef.current = stop;
    document.addEventListener("pointerdown", firstInteraction, true);
    document.addEventListener("keydown", firstInteraction, true);
    document.addEventListener("visibilitychange", visibility);
    schedule();
    return () => {
      disposed = true;
      stop();
      playRef.current = stopRef.current = () => {};
      document.removeEventListener("pointerdown", firstInteraction, true);
      document.removeEventListener("keydown", firstInteraction, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [supported]);

  function toggle() {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    setStatus("ready");
    saveSession(preferenceKey, next ? "on" : "off");
    if (next) playRef.current();
    else stopRef.current();
  }

  return <>
    <button
      type="button"
      data-welcome-control
      className="welcome-voice-control"
      aria-pressed={supported && enabled}
      aria-label={enabled ? "Turn off welcome voice" : "Turn on welcome voice"}
      aria-describedby="welcome-voice-description"
      disabled={!supported}
      title={!supported ? "This browser does not support welcome speech" : status === "error" ? "Speech could not play. Tap to retry." : "Hindi welcome after your first interaction, then every 10 minutes while this tab is visible"}
      onClick={toggle}
    >
      {supported && enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      <span>{!supported ? "Voice unavailable" : status === "error" ? "Tap for voice" : enabled ? "Voice: On" : "Voice: Off"}</span>
    </button>
    <span id="welcome-voice-description" className="sr-only">Hindi welcome on your first interaction, repeated every 10 minutes while this tab is visible. Turn off to stop and mute it for this tab.</span>
    <span role="status" className="sr-only">{status === "speaking" ? "Playing the PHULO welcome." : status === "error" ? "Welcome voice could not play. Use the voice button to retry." : ""}</span>
  </>;
}
