import { exportJsonSchema } from "@/lib/export-schema";

await Bun.write(
  "schema/data.schema.json",
  `${JSON.stringify(exportJsonSchema(), null, 2)}\n`
);
