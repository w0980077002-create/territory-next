// Independent game asset barrier: prevents accidental V1 art and runtime reuse.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
const code=p=>readFileSync(p,'utf8');
function files(root){
 if(!existsSync(root))return [];
 const visit=d=>readdirSync(d).flatMap(n=>{
  const full=join(d,n);
  return statSync(full).isDirectory()?visit(full):[full];
 });
 return visit(root);
}
const vite=code('vite.config.ts');
assert(vite.includes("publicDir: 'public-v2'"),'Vite must not copy the TERRITORY 1.0 public directory');
assert(vite.includes("join(process.cwd(), 'public-v2')"),'Public path rewriting must use only V2 assets');
assert(code('index.html').includes('/art/crest.svg'),'New original V2 favicon required');
assert(!existsSync('src/v2/core/legacyAdapter.ts'),'V2 must never depend on the V1 save adapter');
const banned=[
 /assets\/territory\//i,
 /(?:^|[/'"\s])(?:monopoly|fortune|slots|hall-art)\//i,
 /(?:item|ic|nav|enemy)-[a-z0-9-]+\.webp/i,
 /(?:map|appearance|city-bg)-[a-z0-9-]+\.webp/i,
 /(?:male2|v2-battle-cow-approved|v2-approved-avatar|territory-mark)\.webp/i,
 /from\s*['"][^'"]*(?:\.\.\/game\/|\.\.\/\.\.\/game\/|@\/game\/)/,
];
const sources=files('src/v2').filter(f=>/\.(ts|tsx|css)$/.test(f));
for(const path of sources){
 const s=code(path);
 for(const re of banned)assert(!re.test(s),`Legacy source asset or runtime reference in ${path}: ${re}`);
}
for(const path of ['src/v2/NextApp.tsx','src/v2/InventoryExperience.tsx',
 'src/v2/visual/V2LootRain.tsx','src/v2/visual/FeaturePanelExperience.tsx',
 'src/v2/visual/StageMapExperience.tsx']){
 assert(code(path).includes('art/'),'New V2 assets absent from '+path);
}
const art=files('public-v2/art').map(x=>relative('public-v2/art',x).split(sep).join('/'));
assert(art.length>=70,'Generator must provide original characters, bosses and icons (got '+art.length+')');
assert(art.every(x=>x.endsWith('.svg')),'V2 generated art must be independently authored SVG');
for(const f of [
 'heroes/berserker.svg','heroes/runemage.svg','heroes/ranger.svg',
 'companions/guardian.svg','companions/warcow.svg',
 'enemies/wolf.svg','enemies/goblin.svg',
 'bosses/northern_jarl.svg','bosses/abyss_demon.svg',
 'icons/fight.svg','icons/skills.svg','icons/arena.svg',
 'icons/armor.svg','icons/gold.svg','icons/blue.svg',
 'chapters/1.svg','chapters/5.svg','avatar.svg','crest.svg',
]){
 assert(art.includes(f),'Original V2 artwork missing: '+f);
 assert(code(join('public-v2/art',f)).includes('<svg'),'Malformed art: '+f);
}
const other=files('public-v2').map(x=>relative('public-v2',x).split(sep).join('/'))
 .filter(x=>!x.startsWith('art/'));
assert.deepEqual(other.sort(),['v2-preview.html','v2-winter-stage-v5.webp'].sort(),
 'The V2 public directory must contain only the locked approved V2 background and new isolated preview');
if(process.argv.includes('--dist')){
 assert(existsSync('dist/index.html'),'Build output missing');
 const artifacts=files('dist').map(x=>relative('dist',x).split(sep).join('/'));
 for(const path of artifacts){
  assert(!path.startsWith('assets/territory/')&&!path.startsWith('monopoly/')&&!path.startsWith('fortune/')&&
   !path.startsWith('hall-art/')&&!path.startsWith('slots/'),
    'Legacy game files were deployed: '+path);
  if(path.startsWith('assets/'))assert(/\.(css|js)(?:\.map)?$/.test(path),'Unexpected legacy asset in build: '+path);
 }
 for(const path of files('dist').filter(x=>/\.(js|css|html)$/.test(x))){
  const s=code(path);
  for(const re of banned.slice(0,5))assert(!re.test(s),'Legacy resource reference in deployed '+path+': '+re);
 }
 assert(artifacts.includes('art/heroes/berserker.svg')&&artifacts.includes('art/bosses/abyss_demon.svg'));
}
console.log('OK: TERRITORY 2.0 is built with new original art only; old V1 assets and gameplay imports blocked');
