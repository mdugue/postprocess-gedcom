import { SearchIcon } from "lucide-react";
import { useState } from "react";

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
import type { Gedcom } from "@/lib/gedcom";
import {
  describeChanges,
  matchesTransformation,
  toIsoDate,
} from "@/lib/transformations";
import type { Transformations } from "@/lib/transformations";

const INDIVIDUAL_FIELDS = ["name", "sex", "birth", "death"] as const;
const FAMILY_FIELDS = ["marriage"] as const;

const collectEntries = (
  actions: TransformationActions,
  gedcom: Gedcom | undefined,
  { families, individuals }: Transformations
) => [
  ...Object.entries(individuals).map(([id, transform]) => {
    const individual = gedcom?.individualsById.get(id);

    return {
      changes:
        transform.type === "update"
          ? describeChanges(
              INDIVIDUAL_FIELDS,
              individual && {
                birth: toIsoDate(individual.birth),
                death: toIsoDate(individual.death),
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
      missing: individual === undefined,
      onUndo: () => {
        actions.undo("individuals", id);
      },
      title: individual?.name ?? `Keine Person mit ID ${id}`,
      type: transform.type,
    };
  }),
  ...Object.entries(families).map(([id, transform]) => {
    const family = gedcom?.familiesById.get(id);

    return {
      changes:
        transform.type === "update"
          ? describeChanges(
              FAMILY_FIELDS,
              family && { marriage: toIsoDate(family.marriage) },
              transform.data
            )
          : [],
      hint: transform.hint,
      id,
      key: `family-${id}`,
      kind: "Familie",
      missing: family === undefined,
      onUndo: () => {
        actions.undo("families", id);
      },
      title: family
        ? familyTitle(gedcom, family)
        : `Keine Familie mit ID ${id}`,
      type: transform.type,
    };
  }),
];

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
