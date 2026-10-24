import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac,webcrypto} from 'node:crypto';
import ts from 'typescript';
if(!globalThis.crypto) globalThis.crypto=webcrypto;
const code=ts.transpileModule(readFileSync('server/telegram/verifyInitData.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {verifyV2TelegramInitData, V2_MAX_TELEGRAM_INITDATA_AGE}=await import(
  'data:text/javascript;base64,'+Buffer.from(code).toString('base64')
);
const TOKEN='987654321:totally-fake-bot-token-used-only-in-local-tests';
const NOW=1792828500;
const sign=(params,token=TOKEN)=>{
  const fields=[...params.entries()].filter(([k])=>k!=='hash').sort(([a],[b])=>a.localeCompare(b,'en'));
  const message=fields.map(([k,v])=>k+'='+v).join('\n');
  const secret=createHmac('sha256','WebAppData').update(token).digest();
  const hash=createHmac('sha256',secret).update(message).digest('hex');
  const signed=new URLSearchParams(params);
  signed.set('hash',hash);
  return signed.toString();
};
const base=new URLSearchParams({
  query_id:'test-query',
  auth_date:String(NOW),
  user:JSON.stringify({id:158477433,first_name:'Викинг',last_name:'Тест',username:'not_trusted',photo_url:'https://cdn.example.org/hero.png'})
});
const signed=sign(base);
const good=await verifyV2TelegramInitData(signed,TOKEN,NOW);
assert.deepEqual(good,{telegramUserId:158477433,displayName:'Викинг Тест',photoUrl:'https://cdn.example.org/hero.png',authDate:NOW});
assert.equal(V2_MAX_TELEGRAM_INITDATA_AGE,3600);
assert.deepEqual(await verifyV2TelegramInitData(signed,TOKEN,NOW+3600),good,'within max auth age');
await assert.rejects(()=>verifyV2TelegramInitData(signed,TOKEN,NOW+3601),/TELEGRAM_INITDATA_EXPIRED/);
await assert.rejects(()=>verifyV2TelegramInitData(signed,TOKEN,NOW-61),/TELEGRAM_INITDATA_EXPIRED/);
await assert.rejects(()=>verifyV2TelegramInitData(signed,'wrong-bot-token',NOW),/TELEGRAM_INITDATA_SIGNATURE_INVALID/);
const forged=new URLSearchParams(signed);
forged.set('user',JSON.stringify({id:999999,first_name:'Admin'}));
await assert.rejects(()=>verifyV2TelegramInitData(forged.toString(),TOKEN,NOW),/TELEGRAM_INITDATA_SIGNATURE_INVALID/);
await assert.rejects(()=>verifyV2TelegramInitData(signed+'&user=bad',TOKEN,NOW),/TELEGRAM_INITDATA_INVALID/);
const wrong=new URLSearchParams(signed);
wrong.set('hash','f'.repeat(64));
await assert.rejects(()=>verifyV2TelegramInitData(wrong.toString(),TOKEN,NOW),/TELEGRAM_INITDATA_SIGNATURE_INVALID/);
await assert.rejects(()=>verifyV2TelegramInitData('hash=123',TOKEN,NOW),/TELEGRAM_INITDATA_INVALID/);
await assert.rejects(()=>verifyV2TelegramInitData('user=x',TOKEN,NOW),/TELEGRAM_INITDATA_INVALID/);
await assert.rejects(()=>verifyV2TelegramInitData('x'.repeat(9000),TOKEN,NOW),/TELEGRAM_INITDATA_INVALID/);
const fakeUser=new URLSearchParams(base);
fakeUser.set('user',JSON.stringify({id:-1,first_name:'Fake'}));
await assert.rejects(()=>verifyV2TelegramInitData(sign(fakeUser),TOKEN,NOW),/TELEGRAM_INITDATA_PROFILE_INVALID/);
const missingName=new URLSearchParams(base);
missingName.set('user',JSON.stringify({id:1122,username:''}));
await assert.rejects(()=>verifyV2TelegramInitData(sign(missingName),TOKEN,NOW),/TELEGRAM_INITDATA_PROFILE_INVALID/);
const noPhoto=new URLSearchParams(base);
noPhoto.set('user',JSON.stringify({id:1122,username:'brave_one',photo_url:'javascript:evil()'}));
assert.deepEqual(await verifyV2TelegramInitData(sign(noPhoto),TOKEN,NOW),{telegramUserId:1122,displayName:'brave_one',photoUrl:null,authDate:NOW});
const serviceSql=readFileSync('server/staging/territory_v2_verified_player_identity.sql','utf8');
assert(serviceSql.includes('revoke all on function territory_v2.upsert_verified_telegram_player'));
const activeV2=readFileSync('src/v2/main.tsx','utf8');
assert(!activeV2.includes('verifyInitData') && !activeV2.includes('BOT_TOKEN'));
console.log('OK: Telegram raw initData HMAC, signed profile, no replay past TTL, no spoof/duplicate, server-only verifier');
