import type { CellContext, Row } from "@tanstack/react-table";
import { TrashIcon } from "lucide-react";

import { DatePicker } from "@/components/date-picker";
import { IconButton } from "@/components/icon-button";
import { RecordPicker } from "@/components/record-picker";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { createLinkGraph } from "@/lib/family-links";
import type { LinkRole } from "@/lib/family-links";
import type { Family, Gedcom, Individual } from "@/lib/gedcom";
import {
  familyChoices,
  familyOption,
  personChoices,
  personOption,
} from "@/lib/link-options";
import { createAppColumnHelper, getTableMeta } from "@/lib/record-table";
import type { Features } from "@/lib/record-table";
import {
  applyFamilyChanges,
  applyIndividualChanges,
  effectiveDate,
  effectiveRawDate,
  toDisplayDate,
  toIsoDate,
} from "@/lib/transformations";
import type { IndividualUpdate, Transformations } from "@/lib/transformations";

export type IndividualRow = Individual & {
  familiesAsChildText: string;
  familiesAsParentText: string;
};

export type FamilyRow = Family & {
  childrenText: string;
  parentsText: string;
};

const individualColumn = createAppColumnHelper<IndividualRow>();
const familyColumn = createAppColumnHelper<FamilyRow>();

// Minimum widths; on wider screens columns grow proportionally.
const ID_COLUMN_SIZE = 56;
const DATE_COLUMN_SIZE = 120;
const FAMILY_LINK_COLUMN_SIZE = 140;
const ACTIONS_COLUMN_SIZE = 48;
const SEX_OPTIONS = ["", "F", "M", "U"];

const individualHint = ({ birth, name }: Individual) =>
  birth ? `${name}, ${toDisplayDate(birth)}` : name;

const YEAR = /\d{4}/u;

/** Imprecise dates sort by the year they mention. */
const dateSortValue = (value: Date | string | undefined) =>
  value instanceof Date
    ? value.getTime()
    : new Date(Number(value?.match(YEAR)?.[0] ?? 0), 0).getTime();

const compareDates = <T extends object>(
  a: Row<Features, T>,
  b: Row<Features, T>,
  columnId: string
) =>
  dateSortValue(a.getValue<Date | string | undefined>(columnId)) -
  dateSortValue(b.getValue<Date | string | undefined>(columnId));

const personName = (gedcom: Gedcom | undefined, id: string) =>
  gedcom?.individualsById.get(id)?.name ?? id;

export const familyTitle = (gedcom: Gedcom | undefined, family: Family) => {
  const parents = family.parents
    .map((id) => personName(gedcom, id))
    .join(" & ");

  return parents === "" ? `Familie ${family.id}` : parents;
};

const familyHint = (gedcom: Gedcom, family: Family) =>
  `${familyTitle(gedcom, family)}, ${toIsoDate(family.marriage) ?? "ohne Datum"}`;

type IndividualCellProps = Pick<
  CellContext<Features, IndividualRow>,
  "row" | "table"
>;

// Fields of a deleted record stay locked, since an edit would cancel the deletion.
const pendingIndividual = ({ row, table }: IndividualCellProps) => {
  const { actions, gedcom, transformations } = getTableMeta(table);

  // Rows carry applied edits for sorting; labels and hints name the source record.
  const individual =
    gedcom.individualsById.get(row.original.id) ?? row.original;

  const pending = transformations.individuals[individual.id];

  return {
    individual,
    isDeleted: pending?.type === "delete",
    pending: pending?.type === "update" ? pending.data : undefined,
    update: (data: IndividualUpdate) => {
      actions.updateIndividual(individual.id, data, individualHint(individual));
    },
  };
};

const NameCell = (props: IndividualCellProps) => {
  const { individual, isDeleted, pending, update } = pendingIndividual(props);

  return (
    <Input
      aria-label={`Name von ${individual.name}`}
      disabled={isDeleted}
      onChange={(event) => {
        update({ name: event.target.value });
      }}
      value={pending?.name ?? individual.name}
      variant="inline"
    />
  );
};

const SexCell = (props: IndividualCellProps) => {
  const { individual, isDeleted, pending, update } = pendingIndividual(props);
  const value = pending?.sex ?? individual.sex ?? "";

  // Keeps uncommon source values selectable, also after changing them.
  const options = [...new Set([...SEX_OPTIONS, individual.sex ?? "", value])];

  return (
    <NativeSelect
      aria-label={`Geschlecht von ${individual.name}`}
      disabled={isDeleted}
      onChange={(event) => {
        update({ sex: event.target.value });
      }}
      size="sm"
      value={value}
    >
      {options.map((option) => (
        <NativeSelectOption key={option} value={option}>
          {option === "" ? "–" : option}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
};

const IndividualDateCell = ({
  field,
  label,
  ...props
}: IndividualCellProps & { field: "birth" | "death"; label: string }) => {
  const { individual, isDeleted, pending, update } = pendingIndividual(props);

  return (
    <DatePicker
      disabled={isDeleted}
      label={`${label} von ${individual.name}`}
      onChange={(value) => {
        update({ [field]: value });
      }}
      rawValue={effectiveRawDate(pending, field, individual[`${field}Raw`])}
      value={effectiveDate(pending, field, individual[field])}
    />
  );
};

const PersonFamiliesCell = ({
  linkRole: role,
  ...props
}: IndividualCellProps & { linkRole: LinkRole }) => {
  const { individual, isDeleted } = pendingIndividual(props);
  const { actions, gedcom, links } = getTableMeta(props.table);

  const current =
    role === "parents"
      ? links.familiesAsParent(individual)
      : links.familiesAsChild(individual.id);

  return (
    <RecordPicker
      disabled={isDeleted}
      emptyText="Keine passende Familie"
      getOptions={() => familyChoices(links, individual.id, role)}
      label={`${role === "parents" ? "Elternteil in" : "Kind in"}: ${individual.name}`}
      onChange={(ids) => {
        const before = new Set(current);
        const after = new Set(ids);

        const toggled = [
          ...ids.filter((id) => !before.has(id)),
          ...current.filter((id) => !after.has(id)),
        ];

        for (const familyId of toggled) {
          const family = links.familiesById.get(familyId);

          if (family) {
            actions.setFamilyLinks(
              familyId,
              role,
              after.has(familyId)
                ? [...family[role], individual.id]
                : family[role].filter((id) => id !== individual.id),
              family.source[role],
              familyHint(gedcom, family.source)
            );
          }
        }
      }}
      placeholder="Familie suchen …"
      selected={current.map((id) => familyOption(links, id))}
    />
  );
};

export const individualColumns = individualColumn.columns([
  individualColumn.accessor("id", {
    filterFn: "includesString",
    header: "ID",
    size: ID_COLUMN_SIZE,
  }),
  individualColumn.accessor("name", {
    cell: (context) => <NameCell {...context} />,
    filterFn: "includesString",
    header: "Name",
    size: 170,
  }),
  individualColumn.accessor("sex", {
    cell: (context) => <SexCell {...context} />,
    filterFn: "includesString",
    header: "Geschlecht",
    size: 100,
  }),
  individualColumn.accessor(({ birth, birthRaw }) => birth ?? birthRaw, {
    cell: (context) => (
      <IndividualDateCell {...context} field="birth" label="Geburt" />
    ),
    filterFn: "matchesDisplayedText",
    header: "Geburt",
    id: "birth",
    size: DATE_COLUMN_SIZE,
    sortFn: compareDates,
  }),
  individualColumn.accessor(({ death, deathRaw }) => death ?? deathRaw, {
    cell: (context) => (
      <IndividualDateCell {...context} field="death" label="Tod" />
    ),
    filterFn: "matchesDisplayedText",
    header: "Tod",
    id: "death",
    size: DATE_COLUMN_SIZE,
    sortFn: compareDates,
  }),
  individualColumn.accessor("familiesAsParentText", {
    cell: (context) => <PersonFamiliesCell {...context} linkRole="parents" />,
    enableGlobalFilter: false,
    filterFn: "includesString",
    header: "Elternteil in",
    size: FAMILY_LINK_COLUMN_SIZE,
    sortFn: "text",
  }),
  individualColumn.accessor("familiesAsChildText", {
    cell: (context) => <PersonFamiliesCell {...context} linkRole="children" />,
    enableGlobalFilter: false,
    filterFn: "includesString",
    header: "Kind in",
    size: FAMILY_LINK_COLUMN_SIZE,
    sortFn: "text",
  }),
  individualColumn.display({
    cell: (context) => {
      const { individual } = pendingIndividual(context);

      return (
        <IconButton
          label={`${individual.name} löschen`}
          onClick={() => {
            getTableMeta(context.table).actions.markDeleted(
              "individuals",
              individual.id,
              individualHint(individual)
            );
          }}
        >
          <TrashIcon />
        </IconButton>
      );
    },
    enableHiding: false,
    header: "Aktionen",
    id: "actions",
    size: ACTIONS_COLUMN_SIZE,
  }),
]);

type FamilyCellProps = Pick<CellContext<Features, FamilyRow>, "row" | "table">;

const FamilyPeopleCell = ({
  linkRole: role,
  row,
  table,
}: FamilyCellProps & { linkRole: LinkRole }) => {
  const { actions, gedcom, links } = getTableMeta(table);
  const family = links.familiesById.get(row.original.id);
  const source = gedcom.familiesById.get(row.original.id) ?? row.original;
  const current = family?.[role] ?? source[role];
  const roleName = role === "parents" ? "Eltern" : "Kinder";

  return (
    <RecordPicker
      disabled={family === undefined}
      emptyText="Keine passende Person"
      getOptions={() =>
        family ? personChoices(links, gedcom, family, role) : []
      }
      label={`${roleName} von ${familyTitle(gedcom, source)}`}
      onChange={(ids) => {
        actions.setFamilyLinks(
          source.id,
          role,
          ids,
          source[role],
          familyHint(gedcom, source)
        );
      }}
      placeholder="Person suchen …"
      selected={current.map((id) => personOption(links, gedcom, id))}
    />
  );
};

const MarriageCell = ({ row, table }: FamilyCellProps) => {
  const { actions, gedcom, transformations } = getTableMeta(table);
  const family = gedcom.familiesById.get(row.original.id) ?? row.original;
  const pending = transformations.families[family.id];
  const update = pending?.type === "update" ? pending.data : undefined;

  return (
    <DatePicker
      disabled={pending?.type === "delete"}
      label={`Hochzeit von ${familyTitle(gedcom, family)}`}
      onChange={(marriage) => {
        actions.updateFamily(
          family.id,
          { marriage },
          familyHint(gedcom, family)
        );
      }}
      rawValue={effectiveRawDate(update, "marriage", family.marriageRaw)}
      value={effectiveDate(update, "marriage", family.marriage)}
    />
  );
};

export const familyColumns = familyColumn.columns([
  familyColumn.accessor("id", {
    filterFn: "includesString",
    header: "ID",
    size: ID_COLUMN_SIZE,
  }),
  familyColumn.accessor("parentsText", {
    cell: (context) => <FamilyPeopleCell {...context} linkRole="parents" />,
    filterFn: "includesString",
    header: "Eltern",
    size: 280,
    sortFn: "text",
  }),
  familyColumn.accessor("childrenText", {
    cell: (context) => <FamilyPeopleCell {...context} linkRole="children" />,
    filterFn: "includesString",
    header: "Kinder",
    size: 360,
    sortFn: "text",
  }),
  familyColumn.accessor(
    ({ marriage, marriageRaw }) => marriage ?? marriageRaw,
    {
      cell: (context) => <MarriageCell {...context} />,
      enableColumnFilter: false,
      filterFn: "matchesDisplayedText",
      header: "Hochzeit",
      id: "marriage",
      size: DATE_COLUMN_SIZE,
      sortFn: compareDates,
    }
  ),
  familyColumn.display({
    cell: ({ row, table }) => {
      const { actions, gedcom } = getTableMeta(table);
      const family = gedcom.familiesById.get(row.original.id) ?? row.original;

      return (
        <IconButton
          label={`${familyTitle(gedcom, family)} löschen`}
          onClick={() => {
            actions.markDeleted(
              "families",
              family.id,
              familyHint(gedcom, family)
            );
          }}
        >
          <TrashIcon />
        </IconButton>
      );
    },
    enableHiding: false,
    header: "Aktionen",
    id: "actions",
    size: ACTIONS_COLUMN_SIZE,
  }),
]);

/** Table rows with edits applied and the names to sort and filter linked records by. */
export const toIndividualRows = (
  gedcom: Gedcom,
  transformations: Transformations
): IndividualRow[] => {
  const links = createLinkGraph(gedcom, transformations);

  const familyNames = (ids: string[]) =>
    ids.map((id) => familyOption(links, id).title).join(", ");

  return applyIndividualChanges(
    gedcom.individuals,
    transformations.individuals
  ).map((individual) => ({
    ...individual,
    familiesAsChildText: familyNames(links.familiesAsChild(individual.id)),
    familiesAsParentText: familyNames(links.familiesAsParent(individual)),
  }));
};

export const toFamilyRows = (
  gedcom: Gedcom,
  transformations: Transformations
): FamilyRow[] => {
  const links = createLinkGraph(gedcom, transformations);

  return applyFamilyChanges(gedcom.families, transformations.families).map(
    (family) => ({
      ...family,
      childrenText: family.children.map(links.personName).join(", "),
      parentsText: family.parents.map(links.personName).join(", "),
    })
  );
};
