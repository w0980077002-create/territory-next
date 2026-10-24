// New V2 game hall: deterministic practice rules with no stake or wallet access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(p,'utf8');
const parse=(p,kind=ts.ScriptKind.TS)=>{
 const tree=ts.createSourceFile(p,read(p),ts.ScriptTarget.ES2022,true,kind);
 assert.equal(tree.parseDiagnostics.length,0,'Invalid source: '+p+' '+JSON.stringify(tree.parseDiagnostics));
};
parse('src/v2/core/gameHallPractice.ts');
parse('src/v2/visual/GameHallExperience.tsx',ts.ScriptKind.TSX);
const js=ts.transpileModule(read('src/v2/core/gameHallPractice.ts'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const g=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert.equal(g.V2_HALL_GAME_MODES.length,5);
const base=g.createTreasurePractice();
assert.equal(base.round,1);
assert.strictEqual(g.openPracticeChest(base,4,.5),base);
const opened=g.openPracticeChest(base,1,.4);
assert.equal(opened.opened,1);
assert(opened.points>=0);
assert.strictEqual(g.openPracticeChest(opened,0,.1),opened,'Chest cannot open twice');
assert.equal(g.nextPracticeChest(opened).round,2);
assert.strictEqual(g.nextPracticeChest(base),base);
const m=g.createMonopolyPractice();
assert.equal(g.V2_MONOPOLY_TILES.length,20);
assert.equal(g.rollPracticeDice(m,0).lastDie,1);
assert.equal(g.rollPracticeDice(m,1).lastDie,6);
let board=m;
for(let i=0;i<60&&!board.finished;i++){
 board=g.rollPracticeDice(board,.999);
 assert(board.score>=0&&board.position>=0&&board.position<20);
}
assert(board.finished,'Practice board finishes after three laps or 45 turns');
assert.strictEqual(g.rollPracticeDice(board,.7),board,'Cannot move after finish');
const roll=()=>Array(15).fill(0);
const r=g.spinPracticeRunes(g.createRunePractice(),roll());
assert.equal(r.spin,1);
assert.equal(r.grid.length,5);
assert(r.grid.every(col=>col.length===3));
assert.equal(g.V2_RUNE_LINES.length,9);
assert.equal(r.winningLines.length,9,'All matching runes must activate 9 lines');
assert(r.lastPoints>0);
const doubled=g.doublePracticeWin(r,true);
assert.equal(doubled.points,r.points+r.lastPoints);
assert.strictEqual(g.doublePracticeWin(doubled,true),doubled,'Double can run once');
assert.equal(g.doublePracticeWin(r,false).points,0,'Failed double only removes last spin points');
const noStake=g.spinPracticeRunes(g.createRunePractice(),[]);
assert.equal(noStake.spin,0);
const bonus=roll();
bonus[0]=.999;bonus[3]=.999;bonus[6]=.999;
const scatter=g.spinPracticeRunes(g.createRunePractice(),bonus);
assert.equal(scatter.bonusSymbols,3);
assert(scatter.lastPoints>=75);
const extreme=g.spinPracticeRunes(g.createRunePractice(),Array(15).fill(NaN));
assert.equal(extreme.grid.length,5,'Untrusted random values are bounded');
const view=read('src/v2/visual/GameHallExperience.tsx');
const screen=read('src/v2/visual/FeaturePanelExperience.tsx');
assert(screen.includes("mode==='games')return <GameHallExperience/>"));
for(const token of ['openPracticeChest','rollPracticeDice','spinPracticeRunes','doublePracticeWin','remainingAutospins','setAutospins','PracticeHistory'])
 assert(view.includes(token),token+' must have real UI interaction');
assert(view.includes('Режим 4')&&view.includes('Режим 5'),'Do not invent last two modes');
assert(view.includes('Очки не являются золотом'));
for(const token of ['supabase','fetch(','localStorage','setProgress','onBuy','onClaim','credits','debit','charge','ticketPrice','RTP:'])
 assert(!view.includes(token),'No user wallets or fictional prices: '+token);
assert(!read('src/v2/core/gameHallPractice.ts').includes('src/game'),'No V1 gameplay');
assert(read('src/v2/visual/game-hall.css').includes('@media(max-width:365px)'));
console.log('OK: 3 V2 practice games with 20 tiles, 5x3 9-line reels, one-open treasure, gated double and no wallet');
