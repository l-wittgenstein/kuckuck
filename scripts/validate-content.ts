import { fileURLToPath } from "node:url";
import { validateContent } from "../content/validate";

const root = fileURLToPath(new URL("../content", import.meta.url));
const { errors, warnings, counts } = validateContent(root);

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

console.log(
  `${counts.units} units, ${counts.vocab} vocab items, ${counts.grammar} grammar points, ` +
    `${counts.exercises} exercises — ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
