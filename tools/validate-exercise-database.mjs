import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";
import { reviewedExercises } from "../src/exerciseDatabase/reviewedExercises.ts";
import { canonicalExerciseDatabase, validateExerciseDatabase } from "../src/exerciseDatabase/validation.ts";

const issues=validateExerciseDatabase(canonicalExerciseDatabase(productionExerciseLibrary));
for(const issue of issues) console.error(`${issue.severity.toUpperCase()} ${issue.code} ${issue.path}: ${issue.message}`);
if(reviewedExercises.length!==20||productionExerciseLibrary.length<500){ console.error(`ERROR catalogue_count: expected 20 editorial foundations and at least 500 production exercises, received ${reviewedExercises.length} and ${productionExerciseLibrary.length}`); process.exitCode=1; }
if(issues.some((x)=>x.severity==="error")) process.exitCode=1;
else { const database=canonicalExerciseDatabase(productionExerciseLibrary); console.log(`Exercise database valid: ${database.exercises.length} published exercises, ${database.muscles.length} muscles, ${database.equipment.length} equipment records, ${database.movementPatterns.length} movement patterns, ${database.trackingTemplates.length} tracking templates, ${issues.filter((x)=>x.severity==="warning").length} warnings.`); }
