import { cn } from "cn";
import { CircleAlertIcon, FileDownIcon, ListChecksIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/command-palette";
import { FileDrop } from "@/components/file-drop";
import {
  familyColumns,
  individualColumns,
  toFamilyRows,
  toIndividualRows,
} from "@/components/record-columns";
import { RecordTable } from "@/components/record-table";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  countTransformations,
  useTransformations,
} from "@/hooks/use-transformations";
import type {
  RecordKind,
  TransformationActions,
} from "@/hooks/use-transformations";
import { createLinkGraph } from "@/lib/family-links";
import { parseGedcom } from "@/lib/gedcom";
import type { Gedcom } from "@/lib/gedcom";
import { downloadAll, parseTransformationFile } from "@/lib/transformations";
import type { Transformations } from "@/lib/transformations";

const GEDCOM_ACCEPT = { "text/ged": [".ged"] };
const TRANSFORMATION_ACCEPT = { "text/gedTransform": [".gedTransform"] };

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
  actions,
  gedcom,
  onSearchChange,
  onTabChange,
  searches,
  tab,
  transformations,
}: {
  actions: TransformationActions;
  gedcom: Gedcom;
  onSearchChange: (kind: RecordKind, search: string) => void;
  onTabChange: (kind: RecordKind) => void;
  searches: Record<RecordKind, string>;
  tab: RecordKind;
  transformations: Transformations;
}) => {
  const meta = useMemo(
    () => ({
      actions,
      gedcom,
      links: createLinkGraph(gedcom, transformations),
      transformations,
    }),
    [actions, gedcom, transformations]
  );

  const individualRows = useCallback(
    (settled: Transformations) => toIndividualRows(gedcom, settled),
    [gedcom]
  );

  const familyRows = useCallback(
    (settled: Transformations) => toFamilyRows(gedcom, settled),
    [gedcom]
  );

  return (
    <Tabs
      className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)_auto] md:grid-rows-[auto_minmax(0,1fr)_auto]"
      onValueChange={(value) => {
        onTabChange(value === "families" ? "families" : "individuals");
      }}
      value={tab}
    >
      <TabsList>
        <TabsTrigger value="individuals">Personen</TabsTrigger>
        <TabsTrigger value="families">Familien</TabsTrigger>
      </TabsList>
      {/* Stay mounted so filters, sorting and paging survive switching tabs. */}
      <TabsContent className="contents" keepMounted value="individuals">
        <RecordTable
          changes={transformations.individuals}
          columns={individualColumns}
          meta={meta}
          onSearchChange={(search) => {
            onSearchChange("individuals", search);
          }}
          search={searches.individuals}
          toRows={individualRows}
        />
      </TabsContent>
      <TabsContent className="contents" keepMounted value="families">
        <RecordTable
          changes={transformations.families}
          columns={familyColumns}
          meta={meta}
          onSearchChange={(search) => {
            onSearchChange("families", search);
          }}
          search={searches.families}
          toRows={familyRows}
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
  const [tab, setTab] = useState<RecordKind>("individuals");
  const [searches, setSearches] = useState({ families: "", individuals: "" });

  const setSearch = (kind: RecordKind, search: string) => {
    setSearches((current) => ({ ...current, [kind]: search }));
  };

  const load = async (file: File, apply: (file: File) => Promise<void>) => {
    try {
      await apply(file);
      setLoadError(undefined);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      setLoadError(`${file.name}: ${reason}`);
    }
  };

  const transformationCount = countTransformations(transformations);

  const download = () => {
    if (gedcom) {
      downloadAll(gedcom, transformations);
    }
  };

  const records = gedcom ? (
    <LoadedRecords
      actions={actions}
      gedcom={gedcom}
      onSearchChange={setSearch}
      onTabChange={setTab}
      searches={searches}
      tab={tab}
      transformations={transformations}
    />
  ) : (
    <FileDrop
      accept={GEDCOM_ACCEPT}
      onDrop={(file) => {
        void load(file, async (source) => {
          setGedcom(parseGedcom(await source.arrayBuffer()));
        });
      }}
      title="GEDCOM-Datei hinzufügen"
    />
  );

  const changesPanel = (
    <FileDrop
      accept={TRANSFORMATION_ACCEPT}
      onDrop={(file) => {
        void load(file, async (source) => {
          actions.replaceAll(parseTransformationFile(await source.text()));
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
      <Toaster>
        <div className="flex h-dvh flex-col">
          <header className="flex items-center justify-between gap-2 border-b px-4 py-2 md:px-6">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              GEDCOM transformieren
            </h1>
            <div className="flex items-center gap-1">
              <CommandPalette
                canReset={transformationCount > 0}
                gedcom={gedcom}
                onDownload={download}
                onFindPerson={(name) => {
                  setTab("individuals");
                  setSearch("individuals", name);
                }}
                onReset={() => {
                  actions.clearAll();
                }}
                onShowRecords={setTab}
              />
              <ThemeToggle />
            </div>
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
            <Button disabled={gedcom === undefined} onClick={download}>
              <FileDownIcon data-icon="inline-start" />
              Alles herunterladen
            </Button>
          </footer>
        </div>
      </Toaster>
    </TooltipProvider>
  );
};
