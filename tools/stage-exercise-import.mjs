import fs from "node:fs/promises";
import { stageExerciseImports } from "../src/exerciseDatabase/import.ts";
import { reviewedExercises } from "../src/exerciseDatabase/reviewedExercises.ts";
const filename=process.argv[2]; if(!filename) throw new Error("Usage: npm run exercises:stage -- path/to/raw.json");
const rows=JSON.parse(await fs.readFile(filename,"utf8")); if(!Array.isArray(rows)) throw new Error("Raw import must be a JSON array");
console.log(JSON.stringify(stageExerciseImports(rows,reviewedExercises),null,2));
