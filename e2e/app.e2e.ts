import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

import { exportSchema } from "@/lib/export-schema";
import { GEDCOM_FIXTURE } from "@/test/fixture";

const DIST = path.join(import.meta.dir, "../dist");
const POLL_INTERVAL_MS = 50;
const POLL_ATTEMPTS = 100;
const DESKTOP = { height: 800, width: 1280 };
const PHONE = { height: 800, width: 390 };

const ANNA_NAME = '[aria-label="Name von Anna Muster"]';
const FILE_INPUT = "input[type=file]";

type View = InstanceType<typeof Bun.WebView>;

const server = Bun.serve({
  fetch: async ({ url }) => {
    const { pathname } = new URL(url);

    const file = Bun.file(
      path.join(DIST, pathname === "/" ? "index.html" : pathname)
    );

    return (await file.exists())
      ? new Response(file)
      : new Response("Not found", { status: 404 });
  },
  port: 0,
});

// A fresh browser, so a test run can never attach to one the developer has open.
const createView = (viewport: typeof DESKTOP = DESKTOP) =>
  new Bun.WebView({
    ...viewport,
    backend:
      process.env.E2E_BROWSER === "chrome"
        ? { type: "chrome", url: false }
        : undefined,
  });

const waitFor = async (
  view: View,
  expression: string,
  attempts = POLL_ATTEMPTS
): Promise<void> => {
  if ((await view.evaluate(`Boolean(${expression})`)) === true) {
    return;
  }

  if (attempts === 0) {
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  await Bun.sleep(POLL_INTERVAL_MS);
  await waitFor(view, expression, attempts - 1);
};

const exists = (selector: string) =>
  `document.querySelector(${JSON.stringify(selector)})`;

const valueOf = async (view: View, selector: string) =>
  await view.evaluate(`${exists(selector)}.value`);

const heading = (name: string) =>
  `[...document.querySelectorAll("h2")].some((h) => h.textContent === ${JSON.stringify(name)})`;

/** Native file dialogs cannot be automated, so the file goes straight into the input. */
const loadGedcom = async (view: View) => {
  await waitFor(view, exists(FILE_INPUT));
  await view.evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([${JSON.stringify(GEDCOM_FIXTURE)}], "family.ged"));
    const input = ${exists(FILE_INPUT)};
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(view, exists(ANNA_NAME));
};

const openLoadedApp = async (view: View) => {
  await view.navigate(server.url.href);
  await loadGedcom(view);
};

const appendToName = async (view: View, text: string) => {
  await view.click(ANNA_NAME);
  await view.press("End");
  await view.type(text);
};

describe("app", () => {
  beforeAll(async () => {
    if (!(await Bun.file(path.join(DIST, "index.html")).exists())) {
      throw new Error("dist/ fehlt, bitte `bun run test:e2e` verwenden.");
    }
  });

  afterAll(async () => {
    await server.stop(true);
  });

  test("edits a name and records the change", async () => {
    await using view = createView();

    await openLoadedApp(view);
    await appendToName(view, " Neu");

    expect(await valueOf(view, ANNA_NAME)).toBe("Anna Muster Neu");
    await waitFor(view, heading("Transformationen1"));
  });

  test("offers to undo a deletion in a toast", async () => {
    await using view = createView();

    await openLoadedApp(view);
    await view.click('[aria-label="Bernd Muster löschen"]');
    await waitFor(view, heading("Transformationen1"));
    await view.click('[data-slot="toast-action"]');
    await waitFor(view, heading("Transformationen0"));
  });

  test("keeps imprecise dates and accepts typed ones", async () => {
    await using view = createView();
    const berndBirth = '[aria-label="Geburt von Bernd Muster"]';

    await openLoadedApp(view);

    expect(await valueOf(view, berndBirth)).toBe("1950");

    await view.click('[aria-label="Geburt von Clara Muster"]');
    await view.type("17.12.1712");
    await waitFor(view, heading("Transformationen1"));
  });

  test("exports data that matches the schema", async () => {
    await using view = createView();

    await openLoadedApp(view);
    await appendToName(view, " Neu");
    await view.click('[aria-label="Bernd Muster löschen"]');
    await view.evaluate(`(() => {
      window.exported = [];
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        window.exported.push(blob);
        return create(blob);
      };
    })()`);
    await view.click("footer button:last-child");
    await waitFor(view, "window.exported.length === 2");

    const { families, individuals } = exportSchema.parse(
      JSON.parse(String(await view.evaluate("window.exported[1].text()")))
    );

    expect(individuals.map(({ name }) => name)).toEqual([
      "Anna Muster Neu",
      "Clara Muster",
    ]);
    expect(families[0]?.parents).toEqual(["1"]);
  });

  test("restores changes after a reload", async () => {
    await using view = createView();

    await openLoadedApp(view);
    await appendToName(view, " Neu");
    await waitFor(view, heading("Transformationen1"));
    // Marks the old page, since the reload may report back before it is replaced.
    await view.evaluate("window.beforeReload = true");
    await view.reload();
    await waitFor(view, "!window.beforeReload");
    await waitFor(view, heading("Transformationen1"));
    await loadGedcom(view);

    expect(await valueOf(view, ANNA_NAME)).toBe("Anna Muster Neu");
  });

  test("finds a person through the command palette", async () => {
    await using view = createView();

    await openLoadedApp(view);
    await view.click("h1");
    await view.press("k", { modifiers: ["Control"] });
    await view.click('[data-slot="command-input"]');
    await view.type("clara");

    // Before the search applies, the first entry is an unrelated command.
    const clara = '[data-slot="command-item"][data-value*="clara" i]';

    await waitFor(view, exists(clara));
    await view.click(clara);
    await waitFor(view, `!${exists(ANNA_NAME)}`);

    expect(await valueOf(view, '[aria-label="Name von Clara Muster"]')).toBe(
      "Clara Muster"
    );
  });

  test("shows cards and a sheet on phones", async () => {
    await using view = createView(PHONE);

    await openLoadedApp(view);

    expect(await view.evaluate(`Boolean(${exists("table")})`)).toBe(false);

    await view.click('[aria-label="Anna Muster löschen"]');
    await view.click('[data-slot="sheet-trigger"]');
    await waitFor(view, exists('[aria-label="Transformationen durchsuchen"]'));
  });
});
