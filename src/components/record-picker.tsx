import { cn } from "cn";
import { useState } from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type { PickerOption } from "@/lib/link-options";

// Enough to find a record by typing, without rendering hundreds of entries.
const MAX_VISIBLE_OPTIONS = 50;

const searchText = ({ detail, title }: PickerOption) => `${title} ${detail}`;

const isSameOption = (a: PickerOption, b: PickerOption) => a.id === b.id;

/** Picks several people or families; the choices are only computed while it is open. */
export const RecordPicker = ({
  disabled,
  emptyText,
  getOptions,
  label,
  onChange,
  placeholder,
  selected,
}: {
  disabled?: boolean;
  emptyText: string;
  getOptions: () => PickerOption[];
  label: string;
  onChange: (ids: string[]) => void;
  placeholder: string;
  selected: PickerOption[];
}) => {
  const [open, setOpen] = useState(false);
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      autoHighlight
      disabled={disabled}
      isItemEqualToValue={isSameOption}
      itemToStringLabel={searchText}
      items={open ? getOptions() : selected}
      limit={MAX_VISIBLE_OPTIONS}
      multiple
      onOpenChange={setOpen}
      onValueChange={(options: PickerOption[]) => {
        onChange(options.map(({ id }) => id));
      }}
      open={open}
      value={selected}
    >
      <ComboboxChips ref={anchor} variant="inline">
        {selected.map((option) => (
          <ComboboxChip
            className="min-w-0"
            key={option.id}
            title={`${option.title} · ${option.detail}`}
          >
            <span
              className={cn("truncate", option.isDeleted && "line-through")}
            >
              {option.title}
            </span>
          </ComboboxChip>
        ))}
        <ComboboxChipsInput aria-label={label} placeholder={placeholder} />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="min-w-72">
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(option: PickerOption) => (
            <ComboboxItem key={option.id} value={option}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{option.title}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {option.detail}
                </span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
