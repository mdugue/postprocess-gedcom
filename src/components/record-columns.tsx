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
import { effectiveDate, toIsoDate } from "@/lib/transformations";
import type { IndividualUpdate } from "@/lib/transformations";

const individualColumn = createAppColumnHelper<Individual>();
const familyColumn = createAppColumnHelper<Family>();

// Minimum widths; on wider screens columns grow proportionally.
const ID_COLUMN_SIZE = 72;
const DATE_COLUMN_SIZE = 140;
const ACTIONS_COLUMN_SIZE = 56;
const SEX_OPTIONS = ["", "F", "M", "U"];

const individualHint = ({ birth, name }: Individual) =>
  birth ? `${name}, ${birth.toDateString()}` : name;

const compareDates = <T extends object>(
  a: Row<Features, T>,
  b: Row<Features, T>,
  columnId: string
) =>
  (a.getValue<Date | undefined>(columnId)?.getTime() ?? 0) -
  (b.getValue<Date | undefined>(columnId)?.getTime() ?? 0);

type IndividualCellProps = Pick<
  CellContext<Features, Individual>,
  "row" | "table"
>;

// Fields of a deleted record stay locked, since an edit would cancel the deletion.
const pendingIndividual = ({ row, table }: IndividualCellProps) => {
  const { actions, transformations } = getTableMeta(table);
  const individual = row.original;
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
  individualColumn.accessor("birth", {
    cell: (context) => (
      <IndividualDateCell {...context} field="birth" label="Geburt" />
    ),
    filterFn: "matchesDisplayedText",
    header: "Geburt",
    size: DATE_COLUMN_SIZE,
    sortFn: compareDates,
  }),
  individualColumn.accessor("death", {
    cell: (context) => (
      <IndividualDateCell {...context} field="death" label="Tod" />
    ),
    filterFn: "matchesDisplayedText",
    header: "Tod",
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
    cell: ({ row, table }) => (
      <IconButton
        label={`${row.original.name} löschen`}
        onClick={() => {
          getTableMeta(table).actions.markDeleted(
            "individuals",
            row.original.id,
            individualHint(row.original)
          );
        }}
      >
        <TrashIcon />
      </IconButton>
    ),
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
  const family = row.original;
  const pending = transformations.families[family.id];

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
      value={effectiveDate(
        pending?.type === "update" ? pending.data : undefined,
        "marriage",
        family.marriage
      )}
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
    familyColumn.accessor("marriage", {
      cell: (context) => <MarriageCell {...context} gedcom={gedcom} />,
      enableColumnFilter: false,
      header: "Hochzeit",
      size: DATE_COLUMN_SIZE,
      sortFn: compareDates,
    }),
    familyColumn.display({
      cell: ({ row, table }) => (
        <IconButton
          label={`${familyTitle(gedcom, row.original)} löschen`}
          onClick={() => {
            getTableMeta(table).actions.markDeleted(
              "families",
              row.original.id,
              familyHint(gedcom, row.original)
            );
          }}
        >
          <TrashIcon />
        </IconButton>
      ),
      enableHiding: false,
      header: "Aktionen",
      id: "actions",
      size: ACTIONS_COLUMN_SIZE,
    }),
  ]);
