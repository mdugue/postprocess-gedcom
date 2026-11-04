import { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import {
  emptyTransformations,
  mergeUpdate,
  omitKey,
  parseTransformationFile,
} from "@/lib/transformations";
import type {
  FamilyTransform,
  FamilyUpdate,
  IndividualTransform,
  IndividualUpdate,
  Transformations,
} from "@/lib/transformations";

export type RecordKind = keyof Transformations;

// Family data, so it survives a reload but not the tab. Versioned, so a future
// format change cannot be misread as today's.
const STORAGE_KEY = "postprocess-gedcom/transformations/v1";

/** Storage can be unavailable or hold outdated data; both just mean a fresh start. */
const loadSaved = (): Transformations => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);

    return saved === null
      ? emptyTransformations
      : parseTransformationFile(saved);
  } catch {
    return emptyTransformations;
  }
};

export const countTransformations = ({
  families,
  individuals,
}: Transformations) =>
  Object.keys(individuals).length + Object.keys(families).length;

const save = (transformations: Transformations) => {
  try {
    if (countTransformations(transformations) === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(transformations));
    }
  } catch {
    // Without storage the app still works, only without surviving a reload.
  }
};

const undoToast = (title: string, description: string, onUndo: () => void) => {
  const id = toast.add({
    actionProps: {
      children: "Rückgängig",
      onClick: () => {
        onUndo();
        toast.close(id);
      },
    },
    description,
    title,
  });
};

export const useTransformations = () => {
  const [transformations, setTransformations] = useState(loadSaved);
  const latest = useRef(transformations);

  useEffect(() => {
    latest.current = transformations;
    save(transformations);
  }, [transformations]);

  const actions = useMemo(() => {
    const replaceWithUndo = (
      next: Transformations,
      title: string,
      description: string
    ) => {
      const previous = latest.current;

      setTransformations(next);
      undoToast(title, description, () => {
        setTransformations(previous);
      });
    };

    const restoreEntry = (
      kind: RecordKind,
      id: string,
      entry: FamilyTransform | IndividualTransform | undefined
    ) => {
      setTransformations((current) => ({
        ...current,
        [kind]: entry
          ? { ...current[kind], [id]: entry }
          : omitKey<unknown>(current[kind], id),
      }));
    };

    return {
      clearAll: () => {
        replaceWithUndo(
          emptyTransformations,
          "Alle Änderungen zurückgenommen",
          `${countTransformations(latest.current)} Transformationen entfernt`
        );
      },
      markDeleted: (kind: RecordKind, id: string, hint: string) => {
        const previous = latest.current[kind][id];

        setTransformations((current) => ({
          ...current,
          [kind]: { ...current[kind], [id]: { hint, type: "delete" } },
        }));
        undoToast("Eintrag gelöscht", hint, () => {
          restoreEntry(kind, id, previous);
        });
      },
      replaceAll: (next: Transformations) => {
        replaceWithUndo(
          next,
          "Transformationen geladen",
          `${countTransformations(next)} Transformationen übernommen`
        );
      },
      undo: (kind: RecordKind, id: string) => {
        restoreEntry(kind, id, undefined);
      },
      updateFamily: (id: string, data: FamilyUpdate, hint: string) => {
        setTransformations((current) => ({
          ...current,
          families: {
            ...current.families,
            [id]: mergeUpdate(current.families[id], data, hint),
          },
        }));
      },
      updateIndividual: (id: string, data: IndividualUpdate, hint: string) => {
        setTransformations((current) => ({
          ...current,
          individuals: {
            ...current.individuals,
            [id]: mergeUpdate(current.individuals[id], data, hint),
          },
        }));
      },
    };
  }, []);

  return { actions, transformations };
};

export type TransformationActions = ReturnType<
  typeof useTransformations
>["actions"];
