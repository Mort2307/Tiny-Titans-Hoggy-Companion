import fs from "node:fs";
const backend=fs.readFileSync("functions/iNaturalistEcology.js","utf8");
const component=fs.readFileSync("src/components/INaturalistEcologyPanel.tsx","utf8");
const profile=fs.readFileSync("src/pages/UniversalSpeciesProfile.tsx","utf8");
const index=fs.readFileSync("functions/index.js","utf8");
const checks=[
 ["iNaturalist backend is exported",index.includes('require("./iNaturalistEcology")')],
 ["supported API is used",backend.includes("https://api.inaturalist.org/v1")],
 ["read-only API requires no user iNaturalist credentials",!backend.includes("oauth")&&!backend.includes("access_token")],
 ["24-hour cache exists",backend.includes("CACHE_TTL_MS")&&backend.includes("externalEcologyCache")],
 ["global lookup pacing exists",backend.includes("MIN_LOOKUP_GAP_MS")&&backend.includes("claimLookupWindow")],
 ["API requests identify Tiny Titans",backend.includes("TinyTitans-Keeper-Companion")],
 ["observations are linked rather than rehosted",component.includes("href={observation.uri}")&&!component.includes("<img")],
 ["wild observations are separated from husbandry",component.includes("never converts")&&component.includes("captive husbandry targets")],
 ["species profile includes ecology panel",profile.includes("<INaturalistEcologyPanel")],
];
let failed=0;for(const [label,pass] of checks){console.log((pass?"PASS":"FAIL")+" "+label);if(!pass)failed+=1;}if(failed){console.error("iNaturalist ecology contract failed with "+failed+" issue(s).");process.exit(1);}console.log("iNaturalist ecology contract: PASS");
