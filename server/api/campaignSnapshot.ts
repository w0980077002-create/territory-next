/**
 * TERRITORY 2.0 — authoritative READ-ONLY campaign snapshot.
 * Fixed parameterized SQL, scoped solely to a verified Telegram user ID.
 * This module never creates sessions, grants rewards, or writes progress.
 * Database role: service_role on the isolated territory_v2 staging schema.
 */
import type {V2CampaignSnapshot} from './telegramGateway.ts';

export const V2_CAMPAIGN_SNAPSHOT_QUERY=`
select
  c.stage_chapter as chapter,
  c.stage_wave as wave,
  c.highest_unlocked_chapter as highest_unlocked_chapter,
  c.revision::text as revision,
  (select count(*)::integer from territory_v2.pve_stage_clears pc
     where pc.player_id=p.id and pc.character_id=c.id) as cleared_count,
  exists(select 1 from territory_v2.pve_stage_clears pc
     where pc.player_id=p.id and pc.character_id=c.id
       and pc.chapter=5 and pc.wave=20) as campaign_completed,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'chapter', recent.chapter,
      'wave', recent.wave,
      'clearedAt', to_char(recent.cleared_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) order by recent.cleared_at desc,recent.chapter desc,recent.wave desc)
    from (
      select pc.chapter,pc.wave,pc.cleared_at
      from territory_v2.pve_stage_clears pc
      where pc.player_id=p.id and pc.character_id=c.id
      order by pc.cleared_at desc,pc.chapter desc,pc.wave desc
      limit 10
    ) recent
  ),'[]'::jsonb) as recent_clears
from territory_v2.players p
join territory_v2.characters c on c.player_id=p.id
where p.telegram_user_id=$1::bigint
limit 1
`;

const object=(v:unknown):v is Record<string,unknown>=>
  !!v&&typeof v==='object'&&!Array.isArray(v);
const inRange=(v:unknown,min:number,max:number):v is number=>
  typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const utc=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Strict projection so an unexpected DB row cannot leak private fields. */
export function toV2CampaignSnapshot(raw:unknown):V2CampaignSnapshot{
  if(raw===null||raw===undefined)return {registered:false};
  if(!object(raw)||!inRange(raw.chapter,1,5)||
     !inRange(raw.wave,1,20)||
     !inRange(raw.highest_unlocked_chapter,raw.chapter,5)||
     typeof raw.revision!=='string'||!/^\d{1,20}$/.test(raw.revision)||
     !inRange(raw.cleared_count,0,100)||
     typeof raw.campaign_completed!=='boolean'||
     !Array.isArray(raw.recent_clears)||
     raw.recent_clears.length>10||
     raw.recent_clears.length>raw.cleared_count)
    throw new Error('INVALID_V2_CAMPAIGN_SNAPSHOT');
  const recentClears:{chapter:number;wave:number;clearedAt:string}[]=[];
  for(const item of raw.recent_clears){
    if(!object(item)||!inRange(item.chapter,1,5)||!inRange(item.wave,1,20)||
       typeof item.clearedAt!=='string'||!utc.test(item.clearedAt)||
       !Number.isFinite(Date.parse(item.clearedAt)))
      throw new Error('INVALID_V2_CAMPAIGN_SNAPSHOT');
    recentClears.push({chapter:item.chapter,wave:item.wave,clearedAt:item.clearedAt});
  }
  return {
    registered:true,chapter:raw.chapter,wave:raw.wave,
    highestUnlockedChapter:raw.highest_unlocked_chapter,
    revision:raw.revision,clearedCount:raw.cleared_count,
    campaignCompleted:raw.campaign_completed,recentClears,
  };
}
