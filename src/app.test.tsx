import { describe, expect, spyOn, test } from "bun:test";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "@/app";
import { GEDCOM_FIXTURE } from "@/test/fixture";

const fileInput = () => {
  const input = document.querySelector('input[type="file"]');

  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError("Kein Datei-Input gefunden");
  }

  return input;
};

const textInput = (label: string) => {
  const input = screen.getByLabelText(label);

  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError(`${label} ist kein Input`);
  }

  return input;
};

const renderedNames = () =>
  screen
    .getAllByLabelText(/^Name von /u)
    .map((input) => input.getAttribute("aria-label"));

const loadFixture = async () => {
  const user = userEvent.setup();

  render(<App />);
  await user.upload(
    fileInput(),
    new File([GEDCOM_FIXTURE], "family.ged", { type: "text/ged" })
  );
  await screen.findByLabelText("Name von Anna Muster");

  return user;
};

describe("App", () => {
  test("starts with an upload prompt and disabled download", () => {
    render(<App />);

    expect(screen.getByText("GEDCOM-Datei hinzufügen")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Alles herunterladen" })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  test("keeps focus while editing a name and tracks the change", async () => {
    const user = await loadFixture();
    const name = textInput("Name von Anna Muster");

    await user.clear(name);
    await user.type(name, "Anna B");

    expect(document.activeElement).toBe(name);
    expect(name.value).toBe("Anna B");
    expect(
      screen.getByRole("heading", { name: "Transformationen 1" })
    ).toBeDefined();
  });

  test("undo restores the original value", async () => {
    const user = await loadFixture();
    const name = textInput("Name von Anna Muster");

    await user.type(name, "!");
    expect(name.value).toBe("Anna Muster!");

    await user.click(
      screen.getByRole("button", {
        name: "Änderung an Anna Muster zurücknehmen",
      })
    );

    expect(textInput("Name von Anna Muster").value).toBe("Anna Muster");
    expect(
      screen.getByRole("heading", { name: "Transformationen 0" })
    ).toBeDefined();
  });

  test("filters rows", async () => {
    const user = await loadFixture();

    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", { name: "Name" })
    );
    await user.type(await screen.findByLabelText("Name filtern"), "clara");

    expect(screen.getByLabelText("Name von Clara Muster")).toBeDefined();
    expect(screen.queryByLabelText("Name von Anna Muster")).toBeNull();
  });

  test("filters date columns by their displayed text", async () => {
    const user = await loadFixture();

    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", {
        name: "Geburt",
      })
    );
    await user.type(await screen.findByLabelText("Geburt filtern"), "1950");

    expect(screen.getByLabelText("Name von Anna Muster")).toBeDefined();
    expect(screen.queryByLabelText("Name von Clara Muster")).toBeNull();
  });

  test("hides columns from the columns menu", async () => {
    const user = await loadFixture();
    const panel = within(screen.getByRole("tabpanel"));

    await user.click(panel.getByRole("button", { name: "Spalten" }));
    await user.click(
      await screen.findByRole("menuitemcheckbox", { name: "Geschlecht" })
    );

    expect(screen.queryByLabelText("Geschlecht von Anna Muster")).toBeNull();
  });

  test("shows family data on the families tab", async () => {
    const user = await loadFixture();

    await user.click(screen.getByRole("tab", { name: "Familien" }));

    const row = screen
      .getByLabelText("Hochzeit von Bernd Muster & Anna Muster")
      .closest("tr");

    if (!row) {
      throw new Error("Familienzeile fehlt");
    }

    expect(within(row).getByText("Bernd Muster, Anna Muster")).toBeDefined();
    expect(within(row).getByText("Clara Muster")).toBeDefined();
  });

  test("picks a birth date from the calendar and undoes it", async () => {
    const user = await loadFixture();

    expect(textInput("Geburt von Anna Muster").value).toBe("03.03.1950");

    await user.click(
      screen.getByRole("button", {
        name: "Kalender für Geburt von Anna Muster öffnen",
      })
    );
    await user.click(
      await screen.findByRole("button", { name: /15\. März 1950/u })
    );

    expect(textInput("Geburt von Anna Muster").value).toBe("15.03.1950");
    expect(screen.getByText("1950-03-15")).toBeDefined();

    await user.click(
      screen.getByRole("button", {
        name: "Änderung an Anna Muster zurücknehmen",
      })
    );

    expect(textInput("Geburt von Anna Muster").value).toBe("03.03.1950");
  });

  test("applies a typed date once it is complete", async () => {
    const user = await loadFixture();
    const birth = textInput("Geburt von Clara Muster");

    await user.type(birth, "1.2.19");

    expect(
      screen.getByRole("heading", { name: "Transformationen 0" })
    ).toBeDefined();

    await user.type(birth, "20");

    expect(birth.value).toBe("1.2.1920");
    expect(screen.getByText("1920-02-01")).toBeDefined();

    await user.tab();

    expect(birth.value).toBe("01.02.1920");
  });

  test("discards an invalid typed date on blur", async () => {
    const user = await loadFixture();
    const birth = textInput("Geburt von Anna Muster");

    await user.clear(birth);
    await user.type(birth, "31.02.1950");
    await user.tab();

    expect(textInput("Geburt von Anna Muster").value).toBe("");
    expect(screen.getByText("1950-03-03")).toBeDefined();
  });

  test("clears a date by emptying the field", async () => {
    const user = await loadFixture();

    await user.clear(textInput("Geburt von Anna Muster"));
    await user.tab();

    expect(textInput("Geburt von Anna Muster").value).toBe("");
    expect(
      screen.getByRole("heading", { name: "Transformationen 1" })
    ).toBeDefined();
  });

  test("searches the transformations", async () => {
    const user = await loadFixture();

    await user.click(
      screen.getByRole("button", { name: "Anna Muster löschen" })
    );
    await user.click(
      screen.getByRole("button", { name: "Clara Muster löschen" })
    );
    await user.type(
      screen.getByLabelText("Transformationen durchsuchen"),
      "clara"
    );

    expect(
      screen.getByRole("button", {
        name: "Änderung an Clara Muster zurücknehmen",
      })
    ).toBeDefined();
    expect(
      screen.queryByRole("button", {
        name: "Änderung an Anna Muster zurücknehmen",
      })
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Transformationen 2" })
    ).toBeDefined();
  });

  test("does not offer IDs and family links for editing", async () => {
    await loadFixture();

    expect(screen.queryByLabelText("ID von Anna Muster")).toBeNull();
    expect(screen.queryByLabelText("Familien von Anna Muster")).toBeNull();
  });

  test("searches across columns", async () => {
    const user = await loadFixture();

    const search = within(screen.getByRole("tabpanel")).getByLabelText(
      "Alle Spalten durchsuchen"
    );

    await user.type(search, "bernd");

    expect(screen.getByLabelText("Name von Bernd Muster")).toBeDefined();
    expect(screen.queryByLabelText("Name von Anna Muster")).toBeNull();

    await user.clear(search);
    await user.type(search, "mar");

    // "mar" appears in the raw date string of March births, but not in any cell.
    expect(screen.queryByLabelText("Name von Anna Muster")).toBeNull();
  });

  test("searches dates by their displayed text", async () => {
    const user = await loadFixture();

    await user.type(
      within(screen.getByRole("tabpanel")).getByLabelText(
        "Alle Spalten durchsuchen"
      ),
      "03.03.1950"
    );

    expect(screen.getByLabelText("Name von Anna Muster")).toBeDefined();
    expect(screen.queryByLabelText("Name von Clara Muster")).toBeNull();
  });

  test("clears a sort from the column menu", async () => {
    const user = await loadFixture();

    const original = renderedNames();

    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", { name: "Name" })
    );
    await user.click(await screen.findByRole("button", { name: "Absteigend" }));

    expect(renderedNames()).toEqual(original.toReversed());

    await user.click(
      screen.getByRole("button", { name: "Sortierung aufheben" })
    );

    expect(renderedNames()).toEqual(original);
  });

  test("keeps records without a date last in both sort directions", async () => {
    const user = await loadFixture();

    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", {
        name: "Geburt",
      })
    );
    await user.click(await screen.findByRole("button", { name: "Absteigend" }));

    expect(renderedNames()[0]).toBe("Name von Anna Muster");

    await user.click(screen.getByRole("button", { name: "Aufsteigend" }));

    expect(renderedNames()[0]).toBe("Name von Anna Muster");
  });

  test("hiding a column removes its filter", async () => {
    const user = await loadFixture();

    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", { name: "Name" })
    );
    await user.type(await screen.findByLabelText("Name filtern"), "clara");

    expect(screen.queryByLabelText("Geschlecht von Anna Muster")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ausblenden" }));

    expect(screen.queryByLabelText("Name von Clara Muster")).toBeNull();
    expect(screen.getByLabelText("Geschlecht von Anna Muster")).toBeDefined();
  });

  test("hiding a column removes its sort", async () => {
    const user = await loadFixture();
    const original = renderedNames();

    await user.click(
      within(screen.getByRole("tabpanel")).getByRole("button", { name: "Name" })
    );
    await user.click(await screen.findByRole("button", { name: "Absteigend" }));

    expect(renderedNames()).toEqual(original.toReversed());

    await user.click(screen.getByRole("button", { name: "Ausblenden" }));

    expect(screen.queryByLabelText("Name von Anna Muster")).toBeNull();
    expect(
      screen
        .getAllByLabelText(/^Geschlecht von /u)
        .map((input) => input.getAttribute("aria-label"))
    ).toEqual([
      "Geschlecht von Anna Muster",
      "Geschlecht von Bernd Muster",
      "Geschlecht von Clara Muster",
    ]);
  });

  test("keeps an uncommon source value selectable after changing it", async () => {
    const user = await loadFixture();
    const sex = screen.getByLabelText("Geschlecht von Anna Muster");

    await user.selectOptions(sex, "M");

    const options = within(sex)
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(options).toContain("W");
    expect(options).toContain("M");
  });

  test("locks the fields of a deleted person until undone", async () => {
    const user = await loadFixture();

    await user.click(
      screen.getByRole("button", { name: "Anna Muster löschen" })
    );

    expect(textInput("Name von Anna Muster").disabled).toBe(true);
    expect(textInput("Geburt von Anna Muster").disabled).toBe(true);
    expect(
      screen
        .getByLabelText("Geschlecht von Anna Muster")
        .hasAttribute("disabled")
    ).toBe(true);

    await user.click(
      screen.getByRole("button", {
        name: "Änderung an Anna Muster zurücknehmen",
      })
    );

    expect(textInput("Name von Anna Muster").disabled).toBe(false);
    expect(textInput("Geburt von Anna Muster").disabled).toBe(false);
  });

  test("locks the marriage date of a deleted family", async () => {
    const user = await loadFixture();

    await user.click(screen.getByRole("tab", { name: "Familien" }));
    await user.click(
      screen.getByRole("button", {
        name: "Bernd Muster & Anna Muster löschen",
      })
    );

    expect(textInput("Hochzeit von Bernd Muster & Anna Muster").disabled).toBe(
      true
    );
    expect(
      screen
        .getByRole("button", {
          name: "Kalender für Hochzeit von Bernd Muster & Anna Muster öffnen",
        })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  test("keeps the upload prompt for a GEDCOM without records", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.upload(
      fileInput(),
      new File(["0 HEAD\n0 TRLR\n"], "leer.ged", { type: "text/ged" })
    );

    expect(
      await screen.findByText("Datei konnte nicht geladen werden")
    ).toBeDefined();
    expect(screen.getByText("GEDCOM-Datei hinzufügen")).toBeDefined();
  });

  test("shows cards and tucks changes into a sheet on phones", async () => {
    const realMatchMedia = window.matchMedia.bind(window);

    using _phone = spyOn(window, "matchMedia").mockImplementation((query) => {
      const list = realMatchMedia(query);

      Object.defineProperty(list, "matches", { value: true });

      return list;
    });

    const user = await loadFixture();

    expect(document.querySelector("table")).toBeNull();
    expect(screen.getAllByText("Geburt").length).toBeGreaterThan(0);
    expect(screen.queryByText("Transformationen (0)")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Änderungen (0)" }));

    expect(await screen.findByText("Transformationen (0)")).toBeDefined();
  });

  test("reports an invalid transformation file", async () => {
    const user = await loadFixture();

    await user.upload(
      fileInput(),
      new File(["kein json"], "kaputt.gedTransform")
    );

    expect(
      await screen.findByText("Datei konnte nicht geladen werden")
    ).toBeDefined();
  });
});
