import {
  CommandIcon,
  FileDownIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  Undo2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { IconButton } from "@/components/icon-button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { setThemeSetting } from "@/hooks/use-theme";
import type { RecordKind } from "@/hooks/use-transformations";
import type { Gedcom } from "@/lib/gedcom";

// The palette jumps to people; a short list is enough to find one by typing.
const MAX_PEOPLE = 20;

export const CommandPalette = ({
  canReset,
  gedcom,
  onDownload,
  onFindPerson,
  onReset,
  onShowRecords,
}: {
  canReset: boolean;
  gedcom: Gedcom | undefined;
  onDownload: () => void;
  onFindPerson: (name: string) => void;
  onReset: () => void;
  onShowRecords: (kind: RecordKind) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const run = (action: () => void) => () => {
    setOpen(false);
    setQuery("");
    action();
  };

  const needle = query.trim().toLowerCase();

  const people =
    gedcom && needle !== ""
      ? gedcom.individuals
          .filter(({ name }) => name.toLowerCase().includes(needle))
          .slice(0, MAX_PEOPLE)
      : [];

  return (
    <>
      <IconButton
        label="Befehle öffnen (⌘K)"
        onClick={() => {
          setOpen(true);
        }}
      >
        <CommandIcon />
      </IconButton>
      <CommandDialog
        description="Befehl oder Personennamen suchen"
        onOpenChange={setOpen}
        open={open}
        title="Befehle"
      >
        <Command>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Befehl oder Person suchen …"
            value={query}
          />
          <CommandList>
            <CommandEmpty>Nichts gefunden.</CommandEmpty>
            {people.length > 0 && (
              <CommandGroup heading="Personen">
                {people.map(({ id, name }) => (
                  <CommandItem
                    key={id}
                    onSelect={run(() => {
                      onFindPerson(name);
                    })}
                    value={`${name} ${id}`}
                  >
                    <UserIcon />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Aktionen">
              {gedcom && (
                <CommandItem onSelect={run(onDownload)}>
                  <FileDownIcon />
                  Alles herunterladen
                </CommandItem>
              )}
              {canReset && (
                <CommandItem onSelect={run(onReset)}>
                  <Undo2Icon />
                  Alle Änderungen zurücknehmen
                </CommandItem>
              )}
            </CommandGroup>
            {gedcom && (
              <CommandGroup heading="Ansicht">
                <CommandItem
                  onSelect={run(() => {
                    onShowRecords("individuals");
                  })}
                >
                  <UserIcon />
                  Personen anzeigen
                </CommandItem>
                <CommandItem
                  onSelect={run(() => {
                    onShowRecords("families");
                  })}
                >
                  <UsersIcon />
                  Familien anzeigen
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Darstellung">
              <CommandItem
                onSelect={run(() => {
                  setThemeSetting("light");
                })}
              >
                <SunIcon />
                Helle Darstellung
              </CommandItem>
              <CommandItem
                onSelect={run(() => {
                  setThemeSetting("dark");
                })}
              >
                <MoonIcon />
                Dunkle Darstellung
              </CommandItem>
              <CommandItem
                onSelect={run(() => {
                  setThemeSetting("system");
                })}
              >
                <MonitorIcon />
                Darstellung wie im System
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};
