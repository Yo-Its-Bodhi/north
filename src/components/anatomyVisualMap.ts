import { muscles } from "../exerciseDatabase/taxonomies";
import type { MuscleContribution, MuscleRole } from "../exerciseDatabase/types";

export type VisualRole=Extract<MuscleRole,"primary"|"secondary"|"synergist"|"supporting"|"stabilizer"|"antagonist">;
export type VisualActivation={role:VisualRole;contribution:MuscleContribution};
export type VisualActivationMap=Record<string,VisualActivation>;
export type AnatomySide="front"|"back";
export type AnatomyPath={id:string;side:AnatomySide;d:string};

export const parentVisualChildren:Record<string,string[]>={
  chest:["pectoralis_major_clavicular","pectoralis_major_sternal","pectoralis_major_costal"],pectoralis_major:["pectoralis_major_clavicular","pectoralis_major_sternal","pectoralis_major_costal"],
  shoulders:["anterior_deltoid","lateral_deltoid","posterior_deltoid"],arms:["biceps_brachii","triceps_brachii","forearm_flexors","forearm_extensors"],
  back:["trapezius_upper","trapezius_middle","trapezius_lower","latissimus_dorsi","erector_spinae"],trapezius:["trapezius_upper","trapezius_middle","trapezius_lower"],
  core:["rectus_abdominis","external_obliques","transverse_abdominis"],hips_glutes:["gluteus_maximus","gluteus_medius","hip_adductors","iliopsoas"],
  quadriceps:["rectus_femoris","vastus_lateralis","vastus_medialis","vastus_intermedius"],hamstrings:["biceps_femoris_long_head","semitendinosus","semimembranosus"],
  lower_leg:["gastrocnemius","soleus","tibialis_anterior"],rotator_cuff:["supraspinatus","infraspinatus","teres_minor","subscapularis"],
};

const aliases:Record<string,string>={chest:"pectoralis_major",abs:"rectus_abdominis",obliques:"external_obliques",lats:"latissimus_dorsi",traps:"trapezius",glutes:"gluteus_maximus",quads:"quadriceps",calves:"gastrocnemius",tibialis:"tibialis_anterior","front-delts":"anterior_deltoid","side-delts":"lateral_deltoid","rear-delts":"posterior_deltoid",biceps:"biceps_brachii",triceps:"triceps_brachii",forearms:"forearm_flexors","lower-back":"erector_spinae",adductors:"hip_adductors"};

export const anatomyPaths:AnatomyPath[]=[
 {id:"pectoralis_major_clavicular",side:"front",d:"M67 84Q82 76 96 80L95 94Q80 96 67 91ZM103 80Q118 76 133 84L133 91Q120 96 104 94Z"},
 {id:"pectoralis_major_sternal",side:"front",d:"M65 94Q80 91 96 96L95 113Q78 116 64 105ZM104 96Q120 91 135 94L136 105Q122 116 105 113Z"},
 {id:"pectoralis_major_costal",side:"front",d:"M68 108Q81 113 95 115L93 124Q78 124 69 118ZM105 115Q119 113 132 108L131 118Q122 124 107 124Z"},
 {id:"anterior_deltoid",side:"front",d:"M57 78Q45 83 45 99L57 103L67 88Z M143 78Q155 83 155 99L143 103L133 88Z"},
 {id:"lateral_deltoid",side:"front",d:"M52 80Q41 88 44 103L52 107L60 91Z M148 80Q159 88 156 103L148 107L140 91Z"},
 {id:"biceps_brachii",side:"front",d:"M47 107Q56 102 62 110L57 151Q49 157 42 149Z M153 107Q144 102 138 110L143 151Q151 157 158 149Z"},
 {id:"forearm_flexors",side:"front",d:"M41 154L57 157L47 211L34 208Z M159 154L143 157L153 211L166 208Z"},
 {id:"rectus_abdominis",side:"front",d:"M84 126H98V148H82ZM102 126H116L118 148H102ZM82 152H98V175H80ZM102 152H118L120 175H102ZM81 179H98V201H79ZM102 179H119L121 201H102Z"},
 {id:"external_obliques",side:"front",d:"M66 121L82 129L78 202L64 181Z M134 121L118 129L122 202L136 181Z"},
 {id:"iliopsoas",side:"front",d:"M79 198L96 204L91 225L76 216Z M121 198L104 204L109 225L124 216Z"},
 {id:"hip_adductors",side:"front",d:"M83 218L98 225L92 294L78 256Z M117 218L102 225L108 294L122 256Z"},
 {id:"rectus_femoris",side:"front",d:"M67 220Q82 215 96 228L90 302H70Q61 260 67 220Z M133 220Q118 215 104 228L110 302H130Q139 260 133 220Z"},
 {id:"vastus_lateralis",side:"front",d:"M60 224Q68 216 78 220L73 302H61Q52 262 60 224Z M140 224Q132 216 122 220L127 302H139Q148 262 140 224Z"},
 {id:"vastus_medialis",side:"front",d:"M82 260Q92 268 93 294L86 305L76 297Z M118 260Q108 268 107 294L114 305L124 297Z"},
 {id:"tibialis_anterior",side:"front",d:"M64 309L79 307L75 361L62 365Z M136 309L121 307L125 361L138 365Z"},
 {id:"trapezius_upper",side:"back",d:"M78 70L98 65V94L67 86Z M122 70L102 65V94L133 86Z"},
 {id:"trapezius_middle",side:"back",d:"M69 89L98 96V128L75 116Z M131 89L102 96V128L125 116Z"},
 {id:"trapezius_lower",side:"back",d:"M76 120L98 130V170L84 153Z M124 120L102 130V170L116 153Z"},
 {id:"posterior_deltoid",side:"back",d:"M58 80Q44 85 44 101L58 105L68 88Z M142 80Q156 85 156 101L142 105L132 88Z"},
 {id:"infraspinatus",side:"back",d:"M70 93L96 99L94 119L72 113Z M130 93L104 99L106 119L128 113Z"},
 {id:"latissimus_dorsi",side:"back",d:"M62 112Q80 112 97 132L94 190Q75 180 64 160L56 126Z M138 112Q120 112 103 132L106 190Q125 180 136 160L144 126Z"},
 {id:"triceps_brachii",side:"back",d:"M45 108Q55 103 62 112L57 154Q48 158 41 149Z M155 108Q145 103 138 112L143 154Q152 158 159 149Z"},
 {id:"forearm_extensors",side:"back",d:"M40 157L57 159L47 212L34 208Z M160 157L143 159L153 212L166 208Z"},
 {id:"erector_spinae",side:"back",d:"M85 158L98 171V208L78 197Z M115 158L102 171V208L122 197Z"},
 {id:"gluteus_medius",side:"back",d:"M62 204Q78 195 97 207L92 222Q75 225 61 216Z M138 204Q122 195 103 207L108 222Q125 225 139 216Z"},
 {id:"gluteus_maximus",side:"back",d:"M59 216Q78 207 97 222V248Q76 256 57 238Z M141 216Q122 207 103 222V248Q124 256 143 238Z"},
 {id:"biceps_femoris_long_head",side:"back",d:"M60 247Q75 240 91 251L84 311H62Q52 276 60 247Z M140 247Q125 240 109 251L116 311H138Q148 276 140 247Z"},
 {id:"semitendinosus",side:"back",d:"M82 248L97 254L91 311H78Z M118 248L103 254L109 311H122Z"},
 {id:"gastrocnemius",side:"back",d:"M61 313Q75 305 88 318L82 352L71 363L59 350Z M139 313Q125 305 112 318L118 352L129 363L141 350Z"},
 {id:"soleus",side:"back",d:"M65 344L82 349L77 373H64Z M135 344L118 349L123 373H136Z"},
];

export const visualPathIds=new Set(anatomyPaths.map((path)=>path.id));
export const displayNameFor=(id:string)=>muscles.find((muscle)=>muscle.id===id)?.commonName??id.replaceAll("_"," ").replace(/\b\w/g,(letter)=>letter.toUpperCase());

export function resolveVisualActivation(input:VisualActivationMap,onMissing?:(id:string)=>void){const result:VisualActivationMap={};for(const [rawId,activation] of Object.entries(input)){const id=aliases[rawId]??rawId;const candidates=visualPathIds.has(id)?[id]:parentVisualChildren[id]??[];const resolved=candidates.filter((candidate)=>visualPathIds.has(candidate));if(!resolved.length){let parent=muscles.find((muscle)=>muscle.id===id)?.parentMuscleGroupId;while(parent&&!resolved.length){resolved.push(...(parentVisualChildren[parent]??[]).filter((candidate)=>visualPathIds.has(candidate)));parent=muscles.find((muscle)=>muscle.id===parent)?.parentMuscleGroupId;} }if(!resolved.length){onMissing?.(rawId);continue;}for(const candidate of resolved)if(!result[candidate]||roleRank(activation.role)>roleRank(result[candidate].role))result[candidate]=activation;}return result;}
const roleRank=(role:VisualRole)=>({antagonist:0,stabilizer:1,supporting:2,synergist:3,secondary:4,primary:5})[role];
