import type { Family, Gedcom, Individual } from "@/lib/gedcom";
import type { Transformations } from "@/lib/transformations";

export type LinkRole = "children" | "parents";

export interface LinkedFamily {
  children: string[];
  id: string;
  parents: string[];
  source: Family;
}

const collectRelatives = (
  start: string,
  relativesOf: ReadonlyMap<string, string[]>
) => {
  const seen = new Set<string>();
  const queue = [start];

  for (const id of queue) {
    for (const relative of relativesOf.get(id) ?? []) {
      if (!seen.has(relative)) {
        seen.add(relative);
        queue.push(relative);
      }
    }
  }

  return seen;
};

const addTo = (map: Map<string, string[]>, key: string, value: string) => {
  map.set(key, [...(map.get(key) ?? []), value]);
};

/**
 * Who belongs to which family once the transformations apply. Links are stored
 * on the family only, so the views of a person are always derived from here.
 */
export const createLinkGraph = (
  gedcom: Gedcom,
  { families, individuals }: Transformations
) => {
  const linked = gedcom.families.flatMap((source): LinkedFamily[] => {
    const transform = families[source.id];

    if (transform?.type === "delete") {
      return [];
    }

    const update = transform?.type === "update" ? transform.data : undefined;

    return [
      {
        children: update?.children ?? source.children,
        id: source.id,
        parents: update?.parents ?? source.parents,
        source,
      },
    ];
  });

  const familiesById = new Map(linked.map((family) => [family.id, family]));
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const familiesAsChild = new Map<string, string[]>();

  for (const { children, id, parents } of linked) {
    for (const child of children) {
      addTo(familiesAsChild, child, id);

      for (const parent of parents) {
        addTo(childrenOf, parent, child);
        addTo(parentsOf, child, parent);
      }
    }
  }

  const personName = (id: string) => {
    const transform = individuals[id];

    const edited =
      transform?.type === "update" ? transform.data.name : undefined;

    return edited ?? gedcom.individualsById.get(id)?.name ?? id;
  };

  const familyName = (family: Pick<LinkedFamily, "id" | "parents">) => {
    const names = family.parents.map(personName).join(" & ");

    return names === "" ? `Familie ${family.id}` : names;
  };

  return {
    ancestors: (id: string) => collectRelatives(id, parentsOf),
    descendants: (id: string) => collectRelatives(id, childrenOf),
    families: linked,
    familiesAsChild: (id: string) => familiesAsChild.get(id) ?? [],

    /**
     * Starts from the record's own list, so links the source file only states
     * on the person's side survive as long as nobody edits that family.
     */
    familiesAsParent: ({ headOfFamilies, id }: Individual) => {
      const kept = headOfFamilies.filter((familyId) => {
        const transform = families[familyId];

        if (transform?.type === "delete") {
          return false;
        }

        const edited =
          transform?.type === "update" ? transform.data.parents : undefined;

        return edited === undefined || edited.includes(id);
      });

      const keptIds = new Set(kept);

      const added = linked.flatMap((family) =>
        family.parents.includes(id) && !keptIds.has(family.id)
          ? [family.id]
          : []
      );

      return [...kept, ...added];
    },
    familiesById,
    familyName,
    isPersonDeleted: (id: string) => individuals[id]?.type === "delete",
    personName,
  };
};

export type LinkGraph = ReturnType<typeof createLinkGraph>;

/** Rules out a parent's third parent and every link that would close a family cycle. */
export const canBeParentIn = (
  graph: LinkGraph,
  personId: string,
  family: LinkedFamily
) => {
  if (family.parents.includes(personId)) {
    return true;
  }

  const ancestors = graph.ancestors(personId);

  return (
    family.parents.length < 2 &&
    !family.children.includes(personId) &&
    !family.children.some((child) => ancestors.has(child))
  );
};

export const canBeChildIn = (
  graph: LinkGraph,
  personId: string,
  family: LinkedFamily
) => {
  if (family.children.includes(personId)) {
    return true;
  }

  const descendants = graph.descendants(personId);

  return (
    !family.parents.includes(personId) &&
    !family.parents.some((parent) => descendants.has(parent))
  );
};
