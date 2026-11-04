import { SearchIcon, Undo2Icon } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/icon-button";
import { familyTitle } from "@/components/record-columns";
import { TransformationCard } from "@/components/transformation-card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TransformationActions } from "@/hooks/use-transformations";
import { createLinkGraph } from "@/lib/family-links";
import type { Gedcom } from "@/lib/gedcom";
import { describeLinkChanges, familyLinkWarnings } from "@/lib/link-options";
import {
  describeChanges,
  matchesTransformation,
  toIsoDate,
} from "@/lib/transformations";
import type { Transformations } from "@/lib/transformations";

const INDIVIDUAL_FIELDS = ["name", "sex", "birth", "death"] as const;
const FAMILY_FIELDS = ["marriage"] as const;

const hasLinkEdit = (transform: Transformations["families"][string]) =>
  transform.type === "update" &&
  (transform.data.parents !== undefined ||
    transform.data.children !== undefined);

const collectEntries = (
  actions: TransformationActions,
  gedcom: Gedcom | undefined,
  transformations: Transformations
) => {
  const { families, individuals } = transformations;
  const links = gedcom && createLinkGraph(gedcom, transformations);

  return [
    ...Object.entries(individuals).map(([id, transform]) => {
      const individual = gedcom?.individualsById.get(id);

      return {
        changes:
          transform.type === "update"
            ? describeChanges(
                INDIVIDUAL_FIELDS,
                individual && {
                  birth: toIsoDate(individual.birth) ?? individual.birthRaw,
                  death: toIsoDate(individual.death) ?? individual.deathRaw,
                  name: individual.name,
                  sex: individual.sex,
                },
                transform.data
              )
            : [],
        hint: transform.hint,
        id,
        key: `individual-${id}`,
        kind: "Person",
        linkChanges: [],
        // Saved changes are shown before their GEDCOM is loaded; only then can one be orphaned.
        missing: gedcom !== undefined && individual === undefined,
        onUndo: () => {
          actions.undo("individuals", id);
        },
        title:
          individual?.name ??
          (gedcom ? `Keine Person mit ID ${id}` : transform.hint),
        type: transform.type,
        warnings: [],
      };
    }),
    ...Object.entries(families).map(([id, transform]) => {
      const family = gedcom?.familiesById.get(id);

      const orphanTitle = gedcom
        ? `Keine Familie mit ID ${id}`
        : transform.hint;

      return {
        changes:
          transform.type === "update"
            ? describeChanges(
                FAMILY_FIELDS,
                family && {
                  marriage: toIsoDate(family.marriage) ?? family.marriageRaw,
                },
                transform.data
              )
            : [],
        hint: transform.hint,
        id,
        key: `family-${id}`,
        kind: "Familie",
        linkChanges:
          family && links && transform.type === "update"
            ? describeLinkChanges(links, family, transform.data)
            : [],
        missing: gedcom !== undefined && family === undefined,
        onUndo: () => {
          actions.undo("families", id);
        },
        title: family ? familyTitle(gedcom, family) : orphanTitle,
        type: transform.type,
        warnings:
          gedcom && links && hasLinkEdit(transform)
            ? familyLinkWarnings(links, gedcom, transformations, id)
            : [],
      };
    }),
  ];
};

export const TransformationsList = ({
  actions,
  gedcom,
  transformations,
}: {
  actions: TransformationActions;
  gedcom: Gedcom | undefined;
  transformations: Transformations;
}) => {
  const [query, setQuery] = useState("");

  const entries = collectEntries(actions, gedcom, transformations).filter(
    (entry) => matchesTransformation(entry, query)
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <InputGroup>
          <InputGroupInput
            aria-label="Transformationen durchsuchen"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Transformationen suchen …"
            value={query}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <IconButton
          label="Alle Änderungen zurücknehmen"
          onClick={() => {
            actions.clearAll();
          }}
        >
          <Undo2Icon />
        </IconButton>
      </div>
      <ScrollArea className="-mr-3 -ml-1 min-h-0 flex-1">
        <div className="flex flex-col gap-2 py-1 pr-3 pl-1">
          {entries.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Keine Transformationen gefunden</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          {entries.map(({ key, ...entry }) => (
            <TransformationCard key={key} {...entry} />
          ))}
        </div>
      </ScrollArea>
    </>
  );
};
