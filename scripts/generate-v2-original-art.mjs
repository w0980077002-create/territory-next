import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
function generateV2OriginalArt() {
  const out='public-v2/art';
  const write=(name,svg)=>{const path=join(out,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,svg,'utf8');};
  const heroes=[['berserker','#bd492a','#f1c479','#60c5e9','axe'],['runemage','#62539e','#c8abf4','#8ef6e4','staff'],['ranger','#378477','#b9deb0','#ffd87b','bow']];
  const friends=[['guardian','#44688e','#8ecbe3','#f6d08e','shield'],['warrior','#a95a3b','#eec17a','#92deec','axe'],['healer','#448677','#b2ddb8','#e6ffcf','staff'],['hunter','#96734e','#ffd590','#c0f4ef','bow'],['mage','#6551a1','#cfb3f5','#a7d7fc','staff'],['warcow','#8c5a45','#e5bc8c','#86d7ea','horn']];
  const foes=[['wolf','#5e738d','#d3e2ed','#8fd8fb','wolf'],['goblin','#617d4d','#c6ce6b','#ecae69','axe'],['bandit','#9c5f43','#dbaa7f','#a9dfff','axe'],['troll','#6e7a84','#bbc6bb','#fba96c','hammer'],['giant','#a25e4c','#efbd87','#fec36c','hammer']];
  const bossNames=['giant_king','northern_jarl','storm_lord','undead_king','fire_lord','barrow_guardian','dark_priest','bandit_chief','chaos_shadow','abyss_demon'];
  const colors=['#b37d44','#4c82ab','#566bbb','#4c8a86','#bc513d','#817a65','#6c4b90','#b0613c','#6746a5','#843d61'];
  const bosses=bossNames.map((n,i)=>[n,colors[i],i%2?'#e1cdf1':'#ffd18f',i%3?'#9ad8ef':'#ffa766',['hammer','axe','staff','staff','axe','shield','staff','axe','staff','horn'][i]]);
  const arm=(weapon,glow,metal)=>weapon==='axe'?`<path d="M221 88V290" stroke="#664838" stroke-width="13" stroke-linecap="round"/><path d="M213 87 Q247 56 278 87 L274 130 Q241 117 217 136Z" fill="${metal}" stroke="#3b4159" stroke-width="6"/>`:
    weapon==='staff'?`<path d="M240 70V288" stroke="#463449" stroke-width="14"/><path d="M240 12L267 44L240 83L216 45Z" fill="${glow}" stroke="#ffefbb" stroke-width="6"/>`:
    weapon==='bow'?`<path d="M246 62 Q199 162 246 279" fill="none" stroke="${metal}" stroke-width="12"/><path d="M246 62V279" stroke="#fff1c7" stroke-width="4"/>`:
    weapon==='shield'?`<path d="M222 121L275 135L272 221Q250 241 222 228Z" fill="${metal}" stroke="#36405c" stroke-width="7"/>`:
    weapon==='hammer'?`<path d="M242 102V285" stroke="#57433a" stroke-width="15"/><rect x="194" y="63" width="95" height="57" rx="10" fill="${metal}" stroke="#3b4261" stroke-width="7"/>`:'';
  function character(name,color,metal,glow,weapon,flip,ordinal){
    const helmet=weapon==='staff'?`<path d="M100 108 Q89 55 151 39 Q208 57 205 112Z" fill="${color}" stroke="${metal}" stroke-width="8"/>`:
      `<path d="M101 107Q94 52 151 50Q201 48 207 108L189 96H113Z" fill="${color}" stroke="${metal}" stroke-width="8"/><path d="M102 101H203" stroke="${glow}" stroke-width="6"/>`;
    const horns=weapon==='horn'||ordinal%3===0?`<path d="M109 93Q80 81 80 44Q105 51 124 71M190 93Q224 73 220 43Q193 51 175 76" fill="${metal}" stroke="#514353" stroke-width="6"/>`:'';
    let body=weapon==='wolf'?`<path d="M45 225 Q71 148 154 167 L230 200 L267 270 Q177 302 81 273Z" fill="${color}" stroke="#2c364f" stroke-width="9"/><path d="M96 254 L75 320M199 255L213 320" stroke="${metal}" stroke-width="25" stroke-linecap="round"/><path d="M89 185L83 87L126 115L164 72L195 162L165 211Z" fill="${color}" stroke="#2b354f" stroke-width="9"/><circle cx="116" cy="155" r="8" fill="${glow}"/><path d="M141 174L161 172L146 188Z" fill="#f7fbfc"/>`:
      weapon==='horn'?`<path d="M83 174Q100 144 208 171L241 260H91Z" fill="${color}" stroke="#3f3950" stroke-width="10"/><path d="M107 244L85 312M203 247L224 314" stroke="${metal}" stroke-width="26" stroke-linecap="round"/><ellipse cx="152" cy="131" rx="63" ry="61" fill="${metal}" stroke="#674d52" stroke-width="9"/><ellipse cx="151" cy="157" rx="42" ry="26" fill="#f5c9b0"/><circle cx="124" cy="120" r="8" fill="#23304a"/><circle cx="178" cy="120" r="8" fill="#23304a"/><circle cx="136" cy="161" r="5" fill="#7c635d"/><circle cx="162" cy="161" r="5" fill="#7c635d"/>${horns}`:
      `<path d="M107 239L91 326H138L151 270L168 324H212L192 239" fill="#39465a" stroke="#2b3448" stroke-width="10"/><path d="M103 293L79 334H148L155 310L169 332H233L214 288" fill="#53404d" stroke="${metal}" stroke-width="6"/><path d="M105 173L80 223L64 285L98 298L126 233M194 174L228 224L248 281L219 296L171 238" fill="${metal}" stroke="#414057" stroke-width="8"/><path d="M103 163Q89 194 110 266H194Q212 193 197 163L164 147H135Z" fill="${color}" stroke="#374058" stroke-width="10"/><path d="M120 173L182 173L183 254H118Z" fill="url(#iron)" stroke="${metal}" stroke-width="5"/><path d="M149 174V256M122 223H180" stroke="${glow}" stroke-width="6" opacity=".72"/><ellipse cx="151" cy="121" rx="50" ry="52" fill="#e6b18a" stroke="#544354" stroke-width="7"/>${horns}${helmet}<path d="M126 120H140M169 120H182" stroke="#273448" stroke-width="7" stroke-linecap="round"/><path d="M135 148Q153 159 173 146" stroke="#a7725b" stroke-width="5" fill="none"/><path d="M82 221Q46 194 35 225L49 286Q85 299 109 268Z" fill="${color}" stroke="${metal}" stroke-width="8"/><path d="M47 237Q72 220 91 245L81 270L52 262Z" fill="${glow}" opacity=".62"/>${arm(weapon,glow,metal)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360"><defs><linearGradient id="iron" x2="1" y2="1"><stop stop-color="#fff3d5"/><stop offset=".38" stop-color="${metal}"/><stop offset=".9" stop-color="#364d6b"/></linearGradient><radialGradient id="light"><stop stop-color="${glow}" stop-opacity=".9"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs><g transform="${flip?'translate(300 0) scale(-1 1)':''}"><ellipse cx="150" cy="316" rx="120" ry="39" fill="url(#light)" opacity=".7"/><ellipse cx="152" cy="331" rx="95" ry="10" fill="#14213e" opacity=".25"/>${body}<g fill="${glow}"><circle cx="48" cy="148" r="5"/><circle cx="254" cy="171" r="4"/><circle cx="73" cy="63" r="4"/><circle cx="224" cy="61" r="5"/></g><path d="M51 155L57 135L63 155M248 180L254 160L262 180" fill="none" stroke="${glow}" stroke-width="4"/></g></svg>`;
  }
  [heroes,friends,foes,bosses].forEach((group,g)=>group.forEach(([n,c,m,l,w],i)=>write(`${['heroes','companions','enemies','bosses'][g]}/${n}.svg`,character(n,c,m,l,w,g>=2,i))));
  const sigils={
  port:'M50 10V84 M28 31H72 M14 63Q49 102 85 63',skills:'M20 23Q42 12 49 26V84Q32 69 20 79ZM49 26Q65 12 80 23V79Q64 70 49 84Z',fight:'M22 21L77 79M76 20L23 80 M13 15L33 16L40 38L16 35 M62 14L86 14L84 37L59 36',adventure:'M18 16H80V83Q50 74 18 83ZM27 30Q56 19 63 50T75 66 M33 73L53 56',
  shop:'M16 36H84L76 81H23ZM13 36L26 16H73L86 36 M28 48H72 M50 48V82',
  quests:'M26 14H72L79 27V86H25ZM36 35H67 M36 51H67 M36 68H57',
  events:'M50 10L62 37L88 40L68 58L74 88L50 73L26 87L31 58L12 41L38 37Z',
  friends:'M36 23A12 12 0 1 0 36 47A12 12 0 1 0 36 23M65 23A12 12 0 1 0 65 47A12 12 0 1 0 65 23M12 83Q14 53 39 57L51 71Q61 49 74 59Q88 70 87 83',
  rewards:'M18 38H82V84H18ZM16 52H84 M50 36V85 M50 34Q25 33 29 17Q43 8 50 32Q57 10 73 17Q82 32 50 34',
  invitation:'M15 23H83V78H15ZM16 24L48 56L83 24 M75 10V31 M64 20H87',
  social:'M22 15H78L69 44H31ZM50 43A24 24 0 1 0 50 91A24 24 0 1 0 50 43M50 50L55 62L68 63L59 72L61 84L50 78L38 84L41 71L32 64L46 62Z',
  sea:'M49 11V79M44 18L18 64H44ZM54 23L82 66H54ZM10 79Q50 93 90 79',
  market:'M17 27L30 10H69L84 27V82H17ZM18 38H82 M32 13L23 36M49 12V37M69 12L77 36M49 49A15 15 0 1 0 49 79A15 15 0 1 0 49 49',
  trials:'M49 10L83 22L78 63Q67 83 50 89Q28 78 22 63L17 22ZM50 26L63 44L56 67H42L37 44Z',
  welcome:'M24 37H76L84 81H16ZM22 49H78 M50 35V83 M42 14H58V30H74V40H27V30H42Z',
  arena:'M24 83L75 20M27 18L76 80M12 14L37 11L36 35L16 36ZM62 12L87 16L84 38L60 34Z',
  ranking:'M17 20H83L76 56Q50 80 24 56ZM50 72V86M28 87H72M17 28Q1 17 14 48L28 57M81 28Q97 17 84 48L70 57',
  warehouse:'M15 36L50 10L85 36V87H15ZM30 52H69V87H30ZM16 40H84',
  hero:'M50 12Q23 14 24 38L27 57Q32 78 50 87Q70 75 75 57L75 38Q73 14 50 12ZM32 37H68M37 53H64',
  companions:'M50 12Q80 21 79 53Q74 79 50 88Q23 79 21 53Q21 21 50 12ZM34 46H42 M58 46H66 M37 65Q50 77 65 65',
  clan:'M15 80H85V45L71 33V14L61 22V41H37V18L25 13V35L15 46ZM39 80V62Q50 47 60 62V80',
  games:'M19 17H81V83H19ZM35 36H39M60 36H64M48 52H53M35 67H39M60 67H64',
  mail:'M15 25H85V78H15ZM16 26L50 57L84 26M16 77L38 55M84 77L61 55',
  settings:'M50 13V26M50 74V88M13 50H26M74 50H88M25 25L35 35M65 65L75 75M75 25L65 35M25 75L35 65M50 28A22 22 0 1 0 50 72A22 22 0 1 0 50 28M50 42A8 8 0 1 0 50 58A8 8 0 1 0 50 42',
  gold:'M50 15A35 35 0 1 0 50 85A35 35 0 1 0 50 15M50 24L58 40L76 43L63 55L66 75L50 65L34 75L38 55L25 43L43 40Z',
  blue:'M19 39L35 16H65L81 39L50 86ZM19 39H81M35 16L50 85L65 16',
  red:'M19 39L35 16H65L81 39L50 86ZM19 39H81M35 16L50 85L65 16',
  stone:'M27 14H69L84 42L61 88L24 78L13 42ZM27 14L50 48L84 42M50 48L61 88M50 48L24 78',
  weapon:'M51 11L68 26L58 64H40L34 26ZM22 65H79M50 65V87',
  helmet:'M18 61Q18 11 50 10Q83 10 83 61L68 83H31ZM26 37H76M50 38V84',
  armor:'M21 21L39 13L50 32L62 13L78 22L88 81H12ZM31 46H69M29 61H71M50 34V81',
  boots:'M23 18H48L50 60H74Q89 67 84 83H18ZM51 18H74L71 48L87 66L82 86H50Z',
  shield:'M50 11L82 25L79 62Q65 83 50 91Q24 78 18 63L18 25ZM50 24V76M30 48H69',
  ring:'M50 31A23 23 0 1 0 50 77A23 23 0 1 0 50 31M34 37L50 10L68 37Z',
  amulet:'M23 12Q22 38 49 45Q76 38 73 12M49 42L74 56L59 87L34 81L25 56Z',
  runes:'M28 19H67L76 80H20ZM35 31V70M35 31L64 45L35 55L67 72',
  treasure:'M19 38H82V84H19ZM16 38L25 20H75L85 38M25 52H75 M51 37V84',
  board:'M14 14H86V86H14ZM14 38H86M14 62H86M38 14V86M62 14V86',
  reels:'M15 21H85V79H15ZM36 21V79M63 21V79M23 42H30M47 42H55M73 42H80',
  dice:'M20 20H80V80H20ZM35 35H40M61 36H66M48 49H53M35 63H40M61 64H66',
  wheel:'M50 11A38 38 0 1 0 50 87A38 38 0 1 0 50 11M50 13V87M12 49H88M23 23L77 77M77 22L23 77',
  };
  let q=0;for(const [name,path] of Object.entries(sigils)){const accent=name==='red'?'#e96c7d':name==='blue'?'#4bd7f6':name==='gold'?'#ffe58b':['#8adbf7','#f3bd6d','#d0a0fe','#a2e0b0'][q%4];q++;write(`icons/${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><radialGradient id="bg"><stop stop-color="${accent}" stop-opacity=".7"/><stop offset="1" stop-color="#13283d" stop-opacity=".1"/></radialGradient><linearGradient id="metal"><stop stop-color="#fff8d1"/><stop offset=".38" stop-color="${accent}"/><stop offset="1" stop-color="#ab7855"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="url(#bg)"/><path d="${path}" stroke="url(#metal)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="#2e5574" fill-opacity=".42"/><path d="M12 72L18 64M80 13L87 20" stroke="#fff7cc" stroke-width="3"/></svg>`);}
  const palettes=[['#75c4f0','#307dad','#e5f6fc'],['#98c2f1','#526d9b','#eff7fc'],['#b3b5ed','#5b8996','#def0e6'],['#eeae91','#a06d86','#f0e7df'],['#7db6e3','#5a5f91','#f5dfcb']];
  for(let i=0;i<5;i++){const [sky,rock,snow]=palettes[i];let ridges='';for(let j=0;j<7;j++){let x=j*100-85,y=50+((j*43+i*29)%100);ridges+=`<path d="M${x} 320L${x+112} ${y}L${x+221} 320Z" fill="${rock}" opacity="${.48+j*.065}"/><path d="M${x+93} ${y+36}L${x+112} ${y}L${x+136} ${y+42}Z" fill="${snow}"/>`;}write(`chapters/${i+1}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 320"><defs><linearGradient id="day" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="#ddf4ff"/></linearGradient></defs><rect width="560" height="320" fill="url(#day)"/><circle cx="${428-i*30}" cy="57" r="31" fill="#fff0c4"/>${ridges}<path d="M0 267Q150 230 285 265T560 255V320H0Z" fill="${snow}" opacity=".75"/><path d="M0 288Q170 271 298 290T560 278V320H0Z" fill="#eefaff"/><path d="M310 320L353 237L378 237L345 320Z" fill="#5bc8de" opacity=".75"/><path d="M421 256V189L449 165L477 189V256Z M412 192L449 141L486 192" fill="${rock}" stroke="#f5d5ab" stroke-width="5"/></svg>`);}
  write("crest.svg",readFileSync(join(out,'icons/shield.svg'),'utf8'));
  write("avatar.svg",readFileSync(join(out,'heroes/berserker.svg'),'utf8'));
  console.log('TERRITORY 2.0 ORIGINAL ART:',heroes.length+friends.length+foes.length+bosses.length+Object.keys(sigils).length+7,'SVG assets');
}
generateV2OriginalArt();
