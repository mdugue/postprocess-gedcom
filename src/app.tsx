import { cn } from "cn";
import { CircleAlertIcon, FileDownIcon, ListChecksIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { FileDrop } from "@/components/file-drop";
import {
  createFamilyColumns,
  individualColumns,
} from "@/components/record-columns";
import { RecordTable } from "@/components/record-table";
import { TransformationsList } from "@/components/transformations-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTransformations } from "@/hooks/use-transformations";
import type { Gedcom } from "@/lib/gedcom";
import type { RecordTableMeta } from "@/lib/record-table";
import { downloadAll, parseTransformationFile } from "@/lib/transformations";

const GEDCOM_ACCEPT = { "text/ged": [".ged"] };
const TRANSFORMATION_ACCEPT = { "text/gedTransform": [".gedTransform"] };

// The parser pulls in large dependencies, so it loads on first use.
const loadParser = async () => await import("@/lib/gedcom");

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const Section = ({
  children,
  className,
  count,
  title,
}: {
  children: ReactNode;
  className?: string;
  count?: number;
  title: string;
}) => (
  <section className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
    <h2 className="font-heading flex h-8 items-center gap-2 text-lg font-medium">
      {title}
      {count !== undefined && <Badge variant="secondary">{count}</Badge>}
    </h2>
    {children}
  </section>
);

const LoadedRecords = ({
  gedcom,
  meta,
}: {
  gedcom: Gedcom;
  meta: RecordTableMeta;
}) => {
  const familyColumns = useMemo(() => createFamilyColumns(gedcom), [gedcom]);

  return (
    <Tabs
      className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)_auto] md:grid-rows-[auto_minmax(0,1fr)_auto]"
      defaultValue="individuals"
    >
      <TabsList>
        <TabsTrigger value="individuals">Personen</TabsTrigger>
        <TabsTrigger value="families">Familien</TabsTrigger>
      </TabsList>
      {/* Stay mounted so filters, sorting and paging survive switching tabs. */}
      <TabsContent className="contents" keepMounted value="individuals">
        <RecordTable
          changes={meta.transformations.individuals}
          columns={individualColumns}
          data={gedcom.individuals}
          meta={meta}
        />
      </TabsContent>
      <TabsContent className="contents" keepMounted value="families">
        <RecordTable
          changes={meta.transformations.families}
          columns={familyColumns}
          data={gedcom.families}
          meta={meta}
        />
      </TabsContent>
    </Tabs>
  );
};

export const App = () => {
  const isMobile = useIsMobile();
  const [gedcom, setGedcom] = useState<Gedcom>();
  const [loadError, setLoadError] = useState<string>();
  const { actions, transformations } = useTransformations();

  const meta = useMemo(
    () => ({ actions, transformations }),
    [actions, transformations]
  );

  const load = async (
    file: File,
    apply: (source: string) => Promise<void> | void
  ) => {
    try {
      await apply(await file.text());
      setLoadError(undefined);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      setLoadError(`${file.name}: ${reason}`);
    }
  };

  const transformationCount =
    Object.keys(transformations.individuals).length +
    Object.keys(transformations.families).length;

  const records = gedcom ? (
    <LoadedRecords gedcom={gedcom} meta={meta} />
  ) : (
    <FileDrop
      accept={GEDCOM_ACCEPT}
      onDrop={(file) => {
        void load(file, async (source) => {
          const { parseGedcom } = await loadParser();

          setGedcom(parseGedcom(source));
        });
      }}
      title="GEDCOM-Datei hinzufügen"
    />
  );

  const changesPanel = (
    <FileDrop
      accept={TRANSFORMATION_ACCEPT}
      onDrop={(file) => {
        void load(file, (source) => {
          actions.replaceAll(parseTransformationFile(source));
        });
      }}
      title="Transformationsdatei hinzufügen"
    >
      {transformationCount > 0 ? (
        <TransformationsList
          actions={actions}
          gedcom={gedcom}
          transformations={transformations}
        />
      ) : undefined}
    </FileDrop>
  );

  const summary = gedcom
    ? [
        countLabel(gedcom.individuals.length, "Person", "Personen"),
        countLabel(gedcom.families.length, "Familie", "Familien"),
        countLabel(transformationCount, "Transformation", "Transformationen"),
      ].join(" · ")
    : "Noch keine GEDCOM-Datei geladen";

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col">
        <header className="border-b px-4 py-3 md:px-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            GEDCOM transformieren
          </h1>
        </header>
        {loadError !== undefined && (
          <div className="px-4 pt-4 md:px-6">
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Datei konnte nicht geladen werden</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          </div>
        )}
        {isMobile ? (
          <main className="min-h-0 flex-1 p-4">
            <Section title="Daten">{records}</Section>
          </main>
        ) : (
          // Panels clip their content, so each keeps some padding of its own
          // for focus rings, card outlines and the scrollbar gutter.
          <main className="min-h-0 flex-1 py-4 pr-3 pl-5">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize="75%">
                <Section className="pr-4 pb-1 pl-1" title="Daten">
                  {records}
                </Section>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel minSize={260}>
                <Section
                  className="pr-3 pb-1 pl-4"
                  count={transformationCount}
                  title="Transformationen"
                >
                  {changesPanel}
                </Section>
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        )}
        <footer className="flex items-center justify-between gap-2 border-t px-4 py-3 md:px-6">
          {isMobile ? (
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>
                <ListChecksIcon data-icon="inline-start" />
                Änderungen ({transformationCount})
              </SheetTrigger>
              <SheetContent className="h-[85dvh]" side="bottom">
                <SheetHeader>
                  <SheetTitle>
                    Transformationen ({transformationCount})
                  </SheetTitle>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
                  {changesPanel}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <p className="text-muted-foreground text-sm">{summary}</p>
          )}
          <Button
            disabled={gedcom === undefined}
            onClick={() => {
              if (gedcom) {
                downloadAll(gedcom, transformations);
              }
            }}
          >
            <FileDownIcon data-icon="inline-start" />
            Alles herunterladen
          </Button>
        </footer>
      </div>
    </TooltipProvider>
  );
};
