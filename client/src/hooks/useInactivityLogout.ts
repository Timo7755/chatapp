import { useEffect, useRef } from "react";
import { authStore } from "../store/auth";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useInactivityLogout(onLogout: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        authStore.clear();
        onLogout();
      }, TIMEOUT_MS);
    };

    const events = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];
    events.forEach((e) => window.addEventListener(e, reset));

    // Start the timer immediately
    reset();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [onLogout]);
}
