# postprocess-gedcom

Wandelt GEDCOM-Dateien im Browser nach JSON um und erlaubt, einzelne Personen und Familien zu ändern oder zu löschen. Die Änderungen lassen sich als `.gedTransform`-Datei speichern und später wieder anwenden. Alle Daten bleiben im Browser.

## Stack

[Bun](https://bun.com) (Dev-Server, Bundler, Test-Runner), React 19, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com) auf Basis von [Base UI](https://base-ui.com), TanStack Table v9, Zod, [read-gedcom](https://github.com/arbre-app/read-gedcom) und [Ultracite](https://www.ultracite.ai) (Oxlint und Oxfmt).

## Befehle

| Befehl                 | Zweck                                          |
| ---------------------- | ---------------------------------------------- |
| `bun install`          | Abhängigkeiten installieren                    |
| `bun run dev`          | Dev-Server mit Hot Reload                      |
| `bun run build`        | Produktions-Build nach `dist/`                 |
| `bun run preview`      | Dev-Server im Produktionsmodus                 |
| `bun run test:e2e`     | Build im echten Browser testen (`Bun.WebView`) |
| `bun run test:e2e:dev` | Dasselbe gegen den Dev-Server                  |
| `bun test`             | Tests ausführen                                |
| `bun run typecheck`    | Typen prüfen                                   |
| `bun run check`        | Lint und Format prüfen                         |
| `bun run schema`       | JSON Schema für `data.json` erzeugen           |
| `bun run knip`         | Ungenutzten Code und Pakete finden             |
| `bun run fix`          | Lint- und Format-Probleme beheben              |

UI-Komponenten kommen über `bunx --bun shadcn@latest add <komponente>` nach `src/components/ui`. Design-Tokens stehen als CSS-Variablen in `src/index.css`.

`schema/data.schema.json` beschreibt das Format von `data.json`. Es wird aus `src/lib/export-schema.ts` erzeugt; ein Test prüft, dass beide übereinstimmen.

Änderungen überstehen ein Neuladen, bleiben aber nur im `sessionStorage` des Tabs: Beim Schließen sind sie weg. Zum Aufheben dient „Alles herunterladen“.
