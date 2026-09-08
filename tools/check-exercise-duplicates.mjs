import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";
import { findDuplicateCandidates } from "../src/exerciseDatabase/duplicateDetection.ts";
const candidates=findDuplicateCandidates(productionExerciseLibrary);const unresolved=candidates.filter((x)=>x.disposition!=="distinct_variation");console.log(`Duplicate review: ${candidates.length} candidates, ${candidates.length-unresolved.length} confirmed distinct variations, ${unresolved.length} unresolved.`);if(unresolved.length){console.table(unresolved);process.exitCode=1;}
