import { cn } from "cn";
import { UploadIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import type { Accept } from "react-dropzone";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const DROP_HINT = "Datei hier ablegen oder auswählen.";
const DROP_ACTIVE = "Datei hier ablegen …";
const REJECTED = "Dateityp wird nicht unterstützt";

const DropMessage = ({
  description,
  title,
}: {
  description: ReactNode;
  title: string;
}) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <UploadIcon />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
  </Empty>
);

/**
 * The whole area accepts dropped files. Without children it is one big target;
 * with children they stay usable and a button opens the file dialog instead.
 */
export const FileDrop = ({
  accept,
  children,
  className,
  onDrop,
  title,
}: {
  accept: Accept;
  children?: ReactNode;
  className?: string;
  onDrop: (file: File) => void;
  title: string;
}) => {
  const hasChildren = children !== undefined;

  const { fileRejections, getInputProps, getRootProps, isDragActive, open } =
    useDropzone({
      accept,
      multiple: false,
      noClick: hasChildren,
      noKeyboard: hasChildren,
      onDropAccepted: ([file]) => {
        if (file) {
          onDrop(file);
        }
      },
    });

  const rejection = fileRejections
    .map(
      ({ errors, file }) =>
        `${file.name}: ${errors.map(({ message }) => message).join(", ")}`
    )
    .join("; ");

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex min-h-0 flex-1 flex-col rounded-lg outline-none",
        !hasChildren &&
          "hover:bg-muted/50 focus-visible:ring-ring/50 cursor-pointer border border-dashed transition-colors focus-visible:ring-3",
        !hasChildren && isDragActive && "bg-muted",
        className
      )}
    >
      <input {...getInputProps()} />
      {hasChildren ? (
        // Wrapped so the hidden file input does not count as a flex item for the gap.
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {children}
          {rejection !== "" && (
            <p className="text-muted-foreground text-sm">{rejection}</p>
          )}
          <Button onClick={open} variant="outline">
            <UploadIcon data-icon="inline-start" />
            {title}
          </Button>
          {isDragActive && (
            <div className="bg-background/90 absolute inset-0 flex rounded-lg border border-dashed">
              <DropMessage description={DROP_HINT} title={DROP_ACTIVE} />
            </div>
          )}
        </div>
      ) : (
        <DropMessage
          description={rejection === "" ? DROP_HINT : rejection}
          title={rejection === "" ? title : REJECTED}
        />
      )}
    </div>
  );
};
