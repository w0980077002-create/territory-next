/** Separate V2 offline campaign key; NEVER access V1 or production storage. */
import {createV2StageCampaign,parseV2StageCampaign,type V2StageCampaign} from './gameplayOverhaul';
export const V2_STAGE_STORAGE_KEY='territory-next-v2:stage-campaign:v1';
const MAX_LENGTH=18000;
export function readV2StageSave(storage:Pick<Storage,'getItem'>|null):V2StageCampaign{
 try{
  const raw=storage?.getItem(V2_STAGE_STORAGE_KEY);
  if(!raw||raw.length>MAX_LENGTH)return createV2StageCampaign();
  return parseV2StageCampaign(JSON.parse(raw))??createV2StageCampaign();
 }catch{return createV2StageCampaign();}
}
export function writeV2StageSave(storage:Pick<Storage,'setItem'>|null,state:V2StageCampaign):boolean{
 try{
  if(!storage||!parseV2StageCampaign(state))return false;
  const data=JSON.stringify(state);
  if(data.length>MAX_LENGTH)return false;
  storage.setItem(V2_STAGE_STORAGE_KEY,data);
  return true;
 }catch{return false;}
}
export function clearV2StageSave(storage:Pick<Storage,'removeItem'>|null):boolean{
 try{if(!storage)return false;storage.removeItem(V2_STAGE_STORAGE_KEY);return true;}
 catch{return false;}
}
