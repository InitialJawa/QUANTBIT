import { useEffect } from "react";

interface ShortcutMap {
  /** Triggered on `keydown` when no input/textarea/contenteditable is focused */
  [key: string]: () => void;
}

const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
};

/**
 * Global keyboard shortcuts hook. Ignores events when user is typing
 * in inputs/textareas/contenteditable so the shortcuts don't hijack typing.
 *
 * @example
 *   useShortcuts({
 *     "1": () => setTab("market"),
 *     "2": () => setTab("portfolio"),
 *     "/": () => searchRef.current?.focus(),
 *   });
 */
export function useShortcuts(map: ShortcutMap): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map]);
}
