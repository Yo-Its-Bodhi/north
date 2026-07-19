import fs from "node:fs";
import path from "node:path";
import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";
import { canonicalExerciseDatabase, validateExerciseDatabase } from "../src/exerciseDatabase/validation.ts";
import { findDuplicateCandidates } from "../src/exerciseDatabase/duplicateDetection.ts";
import { getExerciseLibraryStats } from "../src/exerciseDatabase/libraryStats.ts";
import { resolveVisualActivation, visualPathIds } from "../src/components/anatomyVisualMap.ts";

const database=canonicalExerciseDatabase(productionExerciseLibrary);
const normalize=(value)=>value.trim().toLocaleLowerCase().replace(/[\s_-]+/g," ");
const aliases=new Map();
for(const exercise of database.exercises)for(const value of [exercise.canonicalName,...exercise.aliases]){
  const key=normalize(value);aliases.set(key,[...(aliases.get(key)??[]),exercise.id]);
}
const aliasCollisions=[...aliases.entries()].filter(([,ids])=>new Set(ids).size>1).map(([alias,ids])=>({alias,exerciseIds:[...new Set(ids)]}));
const relationMissing=(type)=>database.exercises.filter((exercise)=>!exercise.relationships.some((relation)=>relation.type===type)).map((exercise)=>exercise.id);
const suspiciousTracking=database.exercises.flatMap((exercise)=>{
  const reasons=[];
  const template=database.trackingTemplates.find((item)=>item.id===exercise.trackingTemplateId);
  if(!template)reasons.push("missing template");
  if(exercise.cardio&&!['distance_and_time','cardio_session','cardio_intervals','jump_rope','loaded_carry'].includes(exercise.trackingTemplateId))reasons.push("cardio exercise uses a non-cardio template");
  if(exercise.timedHold&&!['timed_hold','multi_position_timed_hold'].includes(exercise.trackingTemplateId))reasons.push("timed hold uses a non-hold template");
  if(exercise.unilateral&&!template?.supportsSides)reasons.push("unilateral exercise uses a template without side support");
  if(/carry/i.test(exercise.canonicalName)&&exercise.trackingTemplateId!=="loaded_carry")reasons.push("carry name does not use loaded_carry");
  if(/jump rope|skipping/i.test(exercise.canonicalName)&&exercise.trackingTemplateId!=="jump_rope")reasons.push("rope exercise does not use jump_rope");
  return reasons.length?[{exerciseId:exercise.id,templateId:exercise.trackingTemplateId,reasons}]:[];
});
const visualFallbacks=[];const unresolvedVisuals=[];
for(const exercise of database.exercises)for(const muscle of exercise.muscles){
  if(visualPathIds.has(muscle.muscleId))continue;
  const resolved=resolveVisualActivation({[muscle.muscleId]:{role:muscle.role==='dynamic_stabilizer'?'stabilizer':muscle.role,contribution:muscle.contributionLevel}},()=>{});
  const item={exerciseId:exercise.id,muscleId:muscle.muscleId,resolvedTo:Object.keys(resolved)};
  if(item.resolvedTo.length)visualFallbacks.push(item);else unresolvedVisuals.push(item);
}
const report={
  generatedAt:new Date().toISOString(),stats:getExerciseLibraryStats(database.exercises),
  missingInstructions:database.exercises.filter((x)=>x.instructions.length<2||x.executionCues.length<3).map((x)=>x.id),
  missingMuscleMappings:database.exercises.filter((x)=>!x.muscles.length).map((x)=>x.id),
  missingSubstitutions:relationMissing("substitution"),missingProgressions:relationMissing("progression"),
  parentMuscleFallbacks:visualFallbacks,parentFallbackExerciseCount:new Set(visualFallbacks.map((item)=>item.exerciseId)).size,unresolvedVisualMappings:unresolvedVisuals,
  duplicateCandidates:findDuplicateCandidates(database.exercises),aliasCollisions,suspiciousTrackingTemplates:suspiciousTracking,
  publishedNotFullyReviewed:database.exercises.filter((x)=>x.status==='published'&&(x.review.state!=='approved'||!x.review.reviewedBy||!x.review.reviewedAt)).map((x)=>x.id),
  validationIssues:validateExerciseDatabase(database),
  taxonomyCoverage:{muscles:database.muscles.length,equipment:database.equipment.length,trackingTemplates:database.trackingTemplates.length,categories:database.categories.length,movementPatterns:database.movementPatterns.length},
};
const count=(key)=>Array.isArray(report[key])?report[key].length:0;
const section=(title,items)=>`## ${title}\n\nCount: ${items.length}\n\n${items.length?items.map((item)=>`- \`${typeof item==='string'?item:JSON.stringify(item)}\``).join("\n"):"None."}\n`;
const table=(values)=>`| Value | Total |\n|---|---:|\n${Object.entries(values).map(([key,value])=>`| ${key} | ${value} |`).join("\n")}\n`;
const markdown=`# North exercise-system data quality audit\n\nGenerated: ${report.generatedAt}\n\n## Summary\n\n- Exercises: **${report.stats.total}**\n- Muscles / equipment / templates: **${report.taxonomyCoverage.muscles} / ${report.taxonomyCoverage.equipment} / ${report.taxonomyCoverage.trackingTemplates}**\n- Validation issues: **${count('validationIssues')}**\n- Duplicate candidates: **${count('duplicateCandidates')}** (${report.duplicateCandidates.filter((x)=>x.disposition!=='distinct_variation').length} unresolved)\n- Alias collisions: **${count('aliasCollisions')}**\n- Parent-muscle fallback uses: **${count('parentMuscleFallbacks')}**\n- Unresolved visual mappings: **${count('unresolvedVisualMappings')}**\n\n## Totals by equipment\n\n${table(report.stats.byEquipment)}\n## Totals by category\n\n${table(report.stats.byCategory)}\n## Totals by difficulty\n\n${table(report.stats.byDifficulty)}\n${section('Records missing instructions',report.missingInstructions)}\n${section('Records missing muscle mappings',report.missingMuscleMappings)}\n${section('Records missing substitutions',report.missingSubstitutions)}\n${section('Records missing progressions',report.missingProgressions)}\n${section('Parent-muscle fallbacks',report.parentMuscleFallbacks)}\n${section('Unresolved visual mappings',report.unresolvedVisualMappings)}\n${section('Duplicate candidates',report.duplicateCandidates)}\n${section('Aliases resolving to multiple exercises',report.aliasCollisions)}\n${section('Suspicious tracking templates',report.suspiciousTrackingTemplates)}\n${section('Published but not fully reviewed',report.publishedNotFullyReviewed)}\n${section('Validation issues',report.validationIssues)}\n`;
const outputDir=path.resolve("reports");fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,"exercise-system-audit.json"),`${JSON.stringify(report,null,2)}\n`);
fs.writeFileSync(path.join(outputDir,"exercise-system-audit.md"),markdown);
console.log(JSON.stringify({report:"reports/exercise-system-audit.md",exerciseTotal:report.stats.total,missingInstructions:count('missingInstructions'),missingMuscleMappings:count('missingMuscleMappings'),missingSubstitutions:count('missingSubstitutions'),missingProgressions:count('missingProgressions'),parentMuscleFallbacks:count('parentMuscleFallbacks'),unresolvedVisualMappings:count('unresolvedVisualMappings'),duplicateCandidates:count('duplicateCandidates'),unresolvedDuplicates:report.duplicateCandidates.filter((x)=>x.disposition!=="distinct_variation").length,aliasCollisions:count('aliasCollisions'),suspiciousTrackingTemplates:count('suspiciousTrackingTemplates'),publishedNotFullyReviewed:count('publishedNotFullyReviewed'),validationIssues:count('validationIssues')},null,2));
if(report.validationIssues.some((issue)=>issue.severity==='error')||report.aliasCollisions.length||report.unresolvedVisualMappings.length||report.suspiciousTrackingTemplates.length)process.exitCode=1;
