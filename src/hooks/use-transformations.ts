import { useMemo, useState } from "react";

import {
  emptyTransformations,
  mergeUpdate,
  omitKey,
} from "@/lib/transformations";
import type {
  FamilyUpdate,
  IndividualUpdate,
  Transformations,
} from "@/lib/transformations";

export type RecordKind = keyof Transformations;

export const useTransformations = () => {
  const [transformations, setTransformations] = useState(emptyTransformations);

  const actions = useMemo(
    () => ({
      markDeleted: (kind: RecordKind, id: string, hint: string) => {
        setTransformations((current) => ({
          ...current,
          [kind]: { ...current[kind], [id]: { hint, type: "delete" } },
        }));
      },
      replaceAll: setTransformations,
      undo: (kind: RecordKind, id: string) => {
        setTransformations((current) => ({
          ...current,
          [kind]: omitKey<unknown>(current[kind], id),
        }));
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
    }),
    []
  );

  return { actions, transformations };
};

export type TransformationActions = ReturnType<
  typeof useTransformations
>["actions"];
