import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";
import { canonicalExerciseDatabase } from "../src/exerciseDatabase/validation.ts";
import { buildLibraryReviewReport } from "../src/exerciseDatabase/reviewReport.ts";
const report=buildLibraryReviewReport(canonicalExerciseDatabase(productionExerciseLibrary));const summary={...report,duplicateCandidates:undefined,duplicateCandidateCounts:Object.groupBy(report.duplicateCandidates,(x)=>x.disposition)};console.log(JSON.stringify(summary,null,2));
const unresolved=report.duplicateCandidates.filter((x)=>x.disposition!=="distinct_variation");if(unresolved.length){console.log("\nDuplicate candidates requiring review:");console.table(unresolved.slice(0,100));}
