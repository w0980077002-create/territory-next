/** Independent TERRITORY 2.0 practice mini-games.
 * Absolutely no wallet, tickets, player DB, payments, or real prizes.
 * Pure state transitions take explicit roll values so outcomes can be tested.
 */
export const V2_HALL_GAME_MODES=['treasure','monopoly','runes','pending4','pending5'] as const;
export type HallGameMode=typeof V2_HALL_GAME_MODES[number];
export type TreasureResult='Старинные руны'|'Кристальная реликвия'|'Набор инструментов'|'Сундук пуст';
export type TreasurePractice=Readonly<{
 round:number;opened:number|null;result:TreasureResult|null;points:number;history:readonly string[];
}>;
export const createTreasurePractice=():TreasurePractice=>({
 round:1,opened:null,result:null,points:0,history:[]
});
const bounded=(n:number):number=>Number.isFinite(n)?Math.max(0,Math.min(.999999,n)):0;
const chestLoot:readonly Readonly<[TreasureResult,number]>[]=[
 ['Старинные руны',30],['Кристальная реликвия',60],
 ['Набор инструментов',15],['Сундук пуст',0]
];
export function openPracticeChest(state:TreasurePractice,chest:number,roll:number):TreasurePractice{
 if(state.opened!==null||!Number.isSafeInteger(chest)||chest<0||chest>2)return state;
 const result=chestLoot[Math.floor(bounded(roll)*chestLoot.length)];
 return {...state,opened:chest,result:result[0],points:state.points+result[1],
  history:[...state.history.slice(-7),'Раунд '+state.round+': '+result[0]+' · +'+result[1]+' очков']};
}
export function nextPracticeChest(state:TreasurePractice):TreasurePractice{
 if(state.opened===null)return state;
 return {...state,round:state.round+1,opened:null,result:null};
}

export type MonopolyTileType='start'|'loot'|'hazard'|'rest'|'forge'|'runestone'|'port';
export type MonopolyTile=Readonly<{name:string;kind:MonopolyTileType;points:number}>;
export const V2_MONOPOLY_TILES:readonly MonopolyTile[]=[
 {name:'Начало похода',kind:'start',points:0},
 {name:'Лесной сундук',kind:'loot',points:10},
 {name:'Засада',kind:'hazard',points:-5},
 {name:'Зачарованная кузня',kind:'forge',points:15},
 {name:'Отдых у костра',kind:'rest',points:4},
 {name:'Рунная роща',kind:'runestone',points:20},
 {name:'Порт',kind:'port',points:8},
 {name:'Тайник ярла',kind:'loot',points:12},
 {name:'Северные волки',kind:'hazard',points:-9},
 {name:'Лагерь',kind:'rest',points:5},
 {name:'Алтарь ветра',kind:'runestone',points:18},
 {name:'Кузница',kind:'forge',points:16},
 {name:'Берег фьорда',kind:'port',points:7},
 {name:'Западня',kind:'hazard',points:-12},
 {name:'Старый сундук',kind:'loot',points:10},
 {name:'Сила рун',kind:'runestone',points:22},
 {name:'Тихая гавань',kind:'rest',points:6},
 {name:'Древняя мастерская',kind:'forge',points:15},
 {name:'Пещера сокровищ',kind:'loot',points:14},
 {name:'Возвращение к ярлу',kind:'port',points:10},
];
export type MonopolyPractice=Readonly<{
 position:number;turn:number;lap:number;score:number;lastDie:number|null;
 message:string;history:readonly string[];finished:boolean;
}>;
export const createMonopolyPractice=():MonopolyPractice=>({
 position:0,turn:0,lap:0,score:0,lastDie:null,
 message:'Брось кубик, чтобы отправиться в поход.',history:[],finished:false
});
export function rollPracticeDice(state:MonopolyPractice,roll:number):MonopolyPractice{
 if(state.finished)return state;
 const die=1+Math.floor(bounded(roll)*6);
 const total=state.position+die;
 const lap=state.lap+Math.floor(total/V2_MONOPOLY_TILES.length);
 const position=total%V2_MONOPOLY_TILES.length;
 const tile=V2_MONOPOLY_TILES[position];
 const score=Math.max(0,state.score+tile.points+(lap>state.lap?10:0));
 const turn=state.turn+1;
 const finished=lap>=3||turn>=45;
 const message='Ход '+turn+' · '+die+' → '+tile.name+' · '+
  (tile.points>=0?'+':'')+tile.points+' очков'+(lap>state.lap?' · +10 за круг':'');
 return {position,turn,lap,score,lastDie:die,message,
  history:[...state.history.slice(-6),message],finished};
}

export const V2_RUNE_SYMBOLS=['ᚠ','ᚱ','ᛟ','ᛞ','⚔','W','✦'] as const;
export type RuneSymbol=typeof V2_RUNE_SYMBOLS[number];
export type RuneGrid=readonly (readonly RuneSymbol[])[];
export const V2_RUNE_LINES:readonly (readonly number[])[]=[
 [0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],
 [0,1,2,1,0],[2,1,0,1,2],[0,0,1,0,0],
 [2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1]
];
export type RunePractice=Readonly<{
 spin:number;grid:RuneGrid;winningLines:readonly number[];
 bonusSymbols:number;points:number;lastPoints:number;doubled:boolean;
 message:string;history:readonly string[];
}>;
export const createRunePractice=():RunePractice=>({
 spin:0,grid:[],winningLines:[],bonusSymbols:0,points:0,lastPoints:0,
 doubled:false,message:'Бесплатная тренировка · без ставок и призов.',history:[]
});
const isWild=(s:RuneSymbol)=>s==='W';
function lineWins(symbols:readonly RuneSymbol[]):boolean{
 // First three must be equal or wild; bonus glyphs are for scatter only.
 const base=symbols.slice(0,3).find(s=>!isWild(s));
 return !!base&&base!=='✦'&&symbols.slice(0,3).every(s=>isWild(s)||s===base);
}
export function spinPracticeRunes(state:RunePractice,rolls:readonly number[]):RunePractice{
 if(rolls.length!==15)return state;
 const grid:Array<RuneSymbol[]>=[[],[],[],[],[]];
 for(let col=0;col<5;col++)for(let row=0;row<3;row++)
  grid[col].push(V2_RUNE_SYMBOLS[Math.floor(bounded(rolls[col*3+row])*V2_RUNE_SYMBOLS.length)]);
 const winningLines=V2_RUNE_LINES.reduce<number[]>((acc,line,i)=>{
  if(lineWins(line.map((row,col)=>grid[col][row])))acc.push(i+1);
  return acc;
 },[]);
 const bonusSymbols=grid.flat().filter(s=>s==='✦').length;
 const lastPoints=winningLines.length*25+(bonusSymbols>=3?75:0);
 const spin=state.spin+1;
 const message='Прокрутка '+spin+' · '+winningLines.length+' линий'+
  (bonusSymbols>=3?' · бонус за 3+ звезды':'')+' · +'+lastPoints+' очков';
 return {...state,grid,winningLines,bonusSymbols,points:state.points+lastPoints,
  lastPoints,doubled:false,message,spin,history:[...state.history.slice(-6),message]};
}
export function doublePracticeWin(state:RunePractice,success:boolean):RunePractice{
 if(state.lastPoints<=0||state.doubled)return state;
 // Visual score only, never touches currencies or awards.
 const updated=Math.max(0,state.points-state.lastPoints+(success?state.lastPoints*2:0));
 const message=success?'Удвоение очков тренировки!':'Очки последней прокрутки потеряны';
 return {...state,points:updated,lastPoints:0,doubled:true,message,
  history:[...state.history.slice(-6),message]};
}
