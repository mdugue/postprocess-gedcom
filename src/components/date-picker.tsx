import { parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { de } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatIsoDate,
  parseDisplayDate,
  toDisplayDate,
} from "@/lib/transformations";

// Genealogical records reach far back, so the year dropdown has to as well.
const START_MONTH = new Date(1500, 0);
const END_MONTH = new Date(new Date().getFullYear(), 11);

/**
 * Typed dates apply as soon as they are complete and valid; anything else is
 * discarded on blur. Takes and reports `yyyy-MM-dd`, as stored in transformation files.
 */
export const DatePicker = ({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string | null) => void;
  value: string | undefined;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>();
  const date = value === undefined ? undefined : parseISO(value);
  const text = draft ?? (date ? toDisplayDate(date) : "");
  const isInvalid = text !== "" && parseDisplayDate(text) === undefined;

  return (
    <InputGroup variant="inline">
      <InputGroupInput
        aria-invalid={isInvalid}
        aria-label={label}
        disabled={disabled}
        onBlur={() => {
          setDraft(undefined);
        }}
        onChange={({ target }) => {
          setDraft(target.value);

          const typed = parseDisplayDate(target.value);

          if (typed) {
            onChange(formatIsoDate(typed));
          } else if (target.value === "" && date) {
            onChange(null);
          }
        }}
        placeholder="TT.MM.JJJJ"
        value={text}
      />
      <InputGroupAddon align="inline-end">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            render={
              <InputGroupButton
                aria-label={`Kalender für ${label} öffnen`}
                disabled={disabled}
                size="icon-xs"
              />
            }
          >
            <CalendarIcon />
          </PopoverTrigger>
          <PopoverContent align="end">
            <Calendar
              captionLayout="dropdown"
              defaultMonth={date}
              endMonth={END_MONTH}
              locale={de}
              mode="single"
              onSelect={(selected) => {
                if (selected) {
                  onChange(formatIsoDate(selected));
                  setOpen(false);
                }
              }}
              selected={date}
              startMonth={START_MONTH}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
};
