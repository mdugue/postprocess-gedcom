import { afterEach } from "bun:test";

import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.classList.remove("dark");
});
