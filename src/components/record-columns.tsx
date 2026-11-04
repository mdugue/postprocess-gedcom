import type { CellContext, Row } from "@tanstack/react-table";
import { TrashIcon } from "lucide-react";

import { DatePicker } from "@/components/date-picker";
import { IconButton } from "@/components/icon-button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { Family, Gedcom, Individual } from "@/lib/gedcom";
import { createAppColumnHelper, getTableMeta } from "@/lib/record-table";
import type { Features } from "@/lib/record-table";
import {
  effectiveDate,
  effectiveRawDate,
  toDisplayDate,
  toIsoDate,
} from "@/lib/transformations";
import type { IndividualUpdate } from "@/lib/transformations";

const individualColumn = createAppColumnHelper<Individual>();
const familyColumn = createAppColumnHelper<Family>();

// Minimum widths; on wider screens columns grow proportionally.
const ID_COLUMN_SIZE = 72;
const DATE_COLUMN_SIZE = 140;
const ACTIONS_COLUMN_SIZE = 56;
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

type IndividualCellProps = Pick<
  CellContext<Features, Individual>,
  "row" | "table"
>;

// Fields of a deleted record stay locked, since an edit would cancel the deletion.
const pendingIndividual = ({ row, table }: IndividualCellProps) => {
  const { actions, gedcom, transformations } = getTableMeta(table);

  // Rows carry applied edits for sorting; labels and hints name the source record.
  const individual =
    gedcom?.individualsById.get(row.original.id) ?? row.original;

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

const TruncatedText = ({ text }: { text: string }) => (
  <div className="truncate" title={text}>
    {text}
  </div>
);

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
    size: 260,
  }),
  individualColumn.accessor("sex", {
    cell: (context) => <SexCell {...context} />,
    filterFn: "includesString",
    header: "Geschlecht",
    size: 110,
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
  individualColumn.accessor(({ headOfFamilies }) => headOfFamilies.join(", "), {
    cell: ({ getValue }) => <TruncatedText text={getValue()} />,
    filterFn: "includesString",
    header: "Familien",
    id: "headOfFamilies",
    size: 120,
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

const MarriageCell = ({
  gedcom,
  row,
  table,
}: Pick<CellContext<Features, Family>, "row" | "table"> & {
  gedcom: Gedcom;
}) => {
  const { actions, transformations } = getTableMeta(table);
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

/** Family columns resolve person names, so they depend on the loaded GEDCOM. */
export const createFamilyColumns = (gedcom: Gedcom) =>
  familyColumn.columns([
    familyColumn.accessor("id", {
      filterFn: "includesString",
      header: "ID",
      size: ID_COLUMN_SIZE,
    }),
    familyColumn.accessor(
      ({ parents }) => parents.map((id) => personName(gedcom, id)).join(", "),
      {
        cell: ({ getValue }) => <TruncatedText text={getValue()} />,
        filterFn: "includesString",
        header: "Eltern",
        id: "parents",
        size: 240,
      }
    ),
    familyColumn.accessor(
      ({ children }) => children.map((id) => personName(gedcom, id)).join(", "),
      {
        cell: ({ getValue }) => <TruncatedText text={getValue()} />,
        filterFn: "includesString",
        header: "Kinder",
        id: "children",
        size: 300,
      }
    ),
    familyColumn.accessor(
      ({ marriage, marriageRaw }) => marriage ?? marriageRaw,
      {
        cell: (context) => <MarriageCell {...context} gedcom={gedcom} />,
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
        const family = gedcom.familiesById.get(row.original.id) ?? row.original;

        return (
          <IconButton
            label={`${familyTitle(gedcom, family)} löschen`}
            onClick={() => {
              getTableMeta(table).actions.markDeleted(
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
