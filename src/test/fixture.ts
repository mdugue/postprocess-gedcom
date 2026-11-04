/** Fictional family: Anna and Bernd Muster with their child Clara. */
export const GEDCOM_FIXTURE = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Anna /Muster/
1 SEX W
1 BIRT
2 DATE 3 MAR 1950
1 FAMS @F1@
0 @I2@ INDI
1 NAME Bernd /Muster/
1 SEX M
1 BIRT
2 DATE 1950
1 DEAT
2 DATE 7 JUL 2001
1 FAMS @F1@
0 @I3@ INDI
1 NAME Clara /Muster/
1 SEX W
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 CHIL @I3@
1 MARR
2 DATE 12 JUN 1975
0 TRLR
`;

export const toBuffer = (text: string) => new TextEncoder().encode(text).buffer;
