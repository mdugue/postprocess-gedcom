type GeneralGedcomNode = {
  pointer: string;
  data: string;
};

type GedcomNode = {
  tag: "INDI" | "HEAD" | "SUBM" | "FAM";
  tree: GedcomTreeNode[];
} & GeneralGedcomNode;

type GedcomTreeNode = {
  tag:
    | "NAME"
    | "SEX"
    | "REFN"
    | "BIRT"
    | "EVEN"
    | "DEAT"
    | "FAMS"
    | "FAMC"
    | "CHIL"
    | "WIFE"
    | "MARR"
    | "HUSB"; // "MARR" | "CHIL" | "WIFE" | "HUSB" is only for family nodes
  tree: GedcomTreeNodeLevel2[];
} & GeneralGedcomNode;

type GedcomTreeNodeLevel2 = {
  tag: "PLAC" | "TYPE" | "DATE";
  tree: GedcomTreeNode[];
} & GeneralGedcomNode;

declare module "parse-gedcom" {
  export function parse(gedcomString: string): GedcomNode[];
}
