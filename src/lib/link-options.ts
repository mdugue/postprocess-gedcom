import { canBeChildIn, canBeParentIn } from "@/lib/family-links";
import type { LinkGraph, LinkedFamily, LinkRole } from "@/lib/family-links";
import type { Gedcom } from "@/lib/gedcom";
import { applyIndividualChanges, toDisplayDate } from "@/lib/transformations";
import type { Transformations } from "@/lib/transformations";

export interface PickerOption {
  detail: string;
  id: string;
  isDeleted: boolean;
  title: string;
}

const MAX_PARENTS = 2;

const dateOf = (date: Date | undefined, raw: string | undefined) =>
  date ? toDisplayDate(date) : raw;

const joinDetail = (parts: (string | undefined)[]) =>
  parts.filter((part) => part !== undefined).join(" · ");

export const personOption = (
  graph: LinkGraph,
  gedcom: Gedcom,
  id: string
): PickerOption => {
  const individual = gedcom.individualsById.get(id);
  const birth = individual && dateOf(individual.birth, individual.birthRaw);
  const birthDetail = birth === undefined ? undefined : `* ${birth}`;

  return {
    detail: joinDetail([birthDetail, `ID ${id}`]),
    id,
    isDeleted: graph.isPersonDeleted(id),
    title: graph.personName(id),
  };
};

export const familyOption = (graph: LinkGraph, id: string): PickerOption => {
  const family = graph.familiesById.get(id);

  if (!family) {
    return { detail: `ID ${id}`, id, isDeleted: true, title: `Familie ${id}` };
  }

  const { marriage, marriageRaw } = family.source;
  const date = dateOf(marriage, marriageRaw);

  return {
    detail: joinDetail([
      date === undefined ? undefined : `⚭ ${date}`,
      `${family.children.length} Kinder`,
      `ID ${id}`,
    ]),
    id,
    isDeleted: false,
    title: graph.familyName(family),
  };
};

/** People that may take the role in the family, without any that would break a rule. */
export const personChoices = (
  graph: LinkGraph,
  gedcom: Gedcom,
  family: LinkedFamily,
  role: LinkRole
) => {
  const canTakeRole = role === "parents" ? canBeParentIn : canBeChildIn;

  if (role === "parents" && family.parents.length >= MAX_PARENTS) {
    return family.parents.map((id) => personOption(graph, gedcom, id));
  }

  const members = new Set(family[role]);

  return gedcom.individuals.flatMap(({ id }) =>
    members.has(id) ||
    (!graph.isPersonDeleted(id) && canTakeRole(graph, id, family))
      ? [personOption(graph, gedcom, id)]
      : []
  );
};

export const familyChoices = (
  graph: LinkGraph,
  personId: string,
  role: LinkRole
) => {
  const canTakeRole = role === "parents" ? canBeParentIn : canBeChildIn;

  return graph.families.flatMap((family) =>
    canTakeRole(graph, personId, family) ? [familyOption(graph, family.id)] : []
  );
};

const ROLE_LABELS: Record<LinkRole, string> = {
  children: "Kind",
  parents: "Elternteil",
};

export interface LinkChange {
  name: string;
  role: string;
  sign: "+" | "−";
}

/** The people an update adds to or removes from a family, compared to the source. */
export const describeLinkChanges = (
  graph: LinkGraph,
  source: Pick<LinkedFamily["source"], LinkRole>,
  data: Partial<Record<LinkRole, string[]>>
): LinkChange[] =>
  (["parents", "children"] as const).flatMap((role) => {
    const edited = data[role];

    if (edited === undefined) {
      return [];
    }

    const describe = (ids: string[], sign: LinkChange["sign"]) =>
      ids.map((id) => ({
        name: graph.personName(id),
        role: ROLE_LABELS[role],
        sign,
      }));

    const before = new Set(source[role]);
    const after = new Set(edited);

    return [
      ...describe(
        edited.filter((id) => !before.has(id)),
        "+"
      ),
      ...describe(
        source[role].filter((id) => !after.has(id)),
        "−"
      ),
    ];
  });

/** Implausible, but possible with adoptions or imprecise data, so only a warning. */
export const familyLinkWarnings = (
  graph: LinkGraph,
  gedcom: Gedcom,
  transformations: Transformations,
  familyId: string
) => {
  const family = graph.familiesById.get(familyId);

  if (!family) {
    return [];
  }

  const births = new Map(
    applyIndividualChanges(gedcom.individuals, transformations.individuals).map(
      ({ birth, id }) => [id, birth]
    )
  );

  return family.children.flatMap((child) => {
    const childBirth = births.get(child);
    const name = graph.personName(child);

    const otherFamily = graph
      .familiesAsChild(child)
      .some((id) => id !== familyId);

    const earlierThanParent = family.parents.flatMap((parent) => {
      const parentBirth = births.get(parent);

      return childBirth && parentBirth && childBirth < parentBirth
        ? [`${name} ist vor ${graph.personName(parent)} geboren.`]
        : [];
    });

    return otherFamily
      ? [
          ...earlierThanParent,
          `${name} ist auch Kind in einer anderen Familie.`,
        ]
      : earlierThanParent;
  });
};
