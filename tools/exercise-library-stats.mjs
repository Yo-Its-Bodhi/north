import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";
import { getExerciseLibraryStats } from "../src/exerciseDatabase/libraryStats.ts";
console.log(JSON.stringify(getExerciseLibraryStats(productionExerciseLibrary),null,2));
