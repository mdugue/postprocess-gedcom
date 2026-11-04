import { ArrowRightIcon, UndoIcon } from "lucide-react";

import { IconButton } from "@/components/icon-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LinkChange } from "@/lib/link-options";
import type { FieldChange } from "@/lib/transformations";

export const TransformationCard = ({
  changes,
  hint,
  id,
  kind,
  linkChanges,
  missing,
  onUndo,
  title,
  type,
  warnings,
}: {
  changes: FieldChange[];
  hint: string;
  id: string;
  kind: string;
  linkChanges: LinkChange[];
  missing: boolean;
  onUndo: () => void;
  title: string;
  type: "delete" | "update";
  warnings: string[];
}) => (
  <Card
    size="sm"
    variant={missing || type === "delete" ? "removed" : "success"}
  >
    <CardHeader>
      <div className="flex flex-wrap gap-1">
        {missing && <Badge variant="removed">Warnung</Badge>}
        {!missing && type === "delete" && (
          <Badge variant="removed">Löschen</Badge>
        )}
        {!missing && type === "update" && (
          <Badge variant="success">Änderung</Badge>
        )}
        <Badge variant="outline">{kind}</Badge>
      </div>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{missing ? `War: ${hint}` : `ID ${id}`}</CardDescription>
      <CardAction>
        <IconButton
          label={`Änderung an ${title} zurücknehmen`}
          onClick={onUndo}
        >
          <UndoIcon />
        </IconButton>
      </CardAction>
    </CardHeader>
    {!missing && changes.length + linkChanges.length + warnings.length > 0 && (
      <CardContent>
        <div className="flex flex-col gap-1 text-xs">
          {changes.map(({ field, from, to }) => (
            <div className="flex flex-wrap items-center gap-1" key={field}>
              <span className="text-removed line-through">{from}</span>
              <ArrowRightIcon className="text-muted-foreground size-3" />
              <span className="text-success font-medium">{to}</span>
            </div>
          ))}
          {linkChanges.map(({ name, role, sign }) => (
            <div key={`${sign}${role}${name}`}>
              <span className={sign === "+" ? "text-success" : "text-removed"}>
                {sign} {name}
              </span>{" "}
              <span className="text-muted-foreground">({role})</span>
            </div>
          ))}
          {warnings.map((warning) => (
            <p className="text-removed" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      </CardContent>
    )}
  </Card>
);
