import { useSyncExternalStore } from "react";
import { z } from "zod";

const STORAGE_KEY = "postprocess-gedcom/theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const themeSchema = z.enum(["light", "dark", "system"]).catch("system");

export type ThemeSetting = z.output<typeof themeSchema>;

const listeners = new Set<() => void>();

const readStorage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const getThemeSetting = (): ThemeSetting => themeSchema.parse(readStorage());

const applyTheme = () => {
  const setting = getThemeSetting();

  const isDark =
    setting === "dark" ||
    (setting === "system" && window.matchMedia(DARK_QUERY).matches);

  document.documentElement.classList.toggle("dark", isDark);
};

export const setThemeSetting = (setting: ThemeSetting) => {
  try {
    localStorage.setItem(STORAGE_KEY, setting);
  } catch {
    // Without storage the current setting stays; nothing to remember it in.
  }

  applyTheme();

  for (const listener of listeners) {
    listener();
  }
};

/** Runs before the first render, so the page does not flash in the wrong theme. */
export const initTheme = () => {
  applyTheme();
  window.matchMedia(DARK_QUERY).addEventListener("change", applyTheme);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useThemeSetting = () =>
  useSyncExternalStore(subscribe, getThemeSetting);
