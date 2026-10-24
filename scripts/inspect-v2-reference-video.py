"""Verify supplied video metadata and available captions without guessing.
The result is temporary CI logs, not evidence until source confirms it.
Only YouTube ID RUP2vit5BDo; no video/audio downloading or user secrets.
"""
import json
import re
import urllib.request
from urllib.parse import quote

VIDEO_ID="RUP2vit5BDo"
URL="https://www.youtube.com/watch?v="+VIDEO_ID
def small(value,max_chars=1800):
    return str(value or "")[:max_chars].replace("\r"," ")
def safe_fetch(url,timeout=14):
    request=urllib.request.Request(url,headers={
        "User-Agent":"Mozilla/5.0 (compatible; TerritoryReferenceAudit/1.0)"
    })
    with urllib.request.urlopen(request,timeout=timeout) as response:
        return response.read(2_000_000)
print("VIDEO_ID",VIDEO_ID)
try:
    raw=safe_fetch("https://www.youtube.com/oembed?url="+quote(URL,safe="")+"&format=json")
    data=json.loads(raw)
    print("OEMBED_TITLE",small(data.get("title")))
    print("OEMBED_AUTHOR",small(data.get("author_name")))
except Exception as e:
    print("OEMBED_UNAVAILABLE",type(e).__name__,small(e,250))

try:
    import yt_dlp
    with yt_dlp.YoutubeDL({
        "quiet":True,"no_warnings":True,"skip_download":True,
        "ignoreerrors":False,"extract_flat":False,
        "youtube_include_dash_manifest":False,
        "extractor_args":{"youtube":{"player_client":["web","android"]}}
    }) as ydl:
        info=ydl.extract_info(URL,download=False)
    if not info:
        print("YTDLP_NO_METADATA")
    else:
        for field in ("id","title","channel","uploader","duration","release_date","upload_date","availability","live_status"):
            print("META_"+field.upper(),small(info.get(field),300))
        print("DESCRIPTION",small(info.get("description"),2200))
        chapters=info.get("chapters") or []
        for chapter in chapters[:36]:
            print("CHAPTER",small(chapter.get("start_time"),60),small(chapter.get("title"),150))
        languages=info.get("subtitles") or {}
        auto=info.get("automatic_captions") or {}
        print("MANUAL_CAPTION_LANGS",list(languages)[:40])
        print("AUTO_CAPTION_LANGS",list(auto)[:40])
        tracks=[]
        for source in (languages,auto):
            for lang in ("ru","uk","en"):
                for record in source.get(lang,[]):
                    if record.get("ext") in ("json3","vtt") and record.get("url"):
                        tracks.append((lang,record["ext"],record["url"]))
                        break
                if tracks:break
            if tracks:break
        if tracks:
            lang,ext,url=tracks[0]
            print("CAPTION_TRACK",lang,ext)
            try:
                raw=safe_fetch(url,timeout=15)
                if ext=="json3":
                    events=json.loads(raw).get("events",[])
                    rows=[]
                    for event in events:
                        text="".join(segment.get("utf8","") for segment in event.get("segs",[])).strip()
                        if text:
                            rows.append((round(event.get("tStartMs",0)/1000),text))
                else:
                    rows=[]
                    for ln in raw.decode("utf-8","replace").splitlines():
                        if ln.strip() and "-->" not in ln and not re.match(r"^(WEBVTT|[0-9]+|NOTE)",ln):
                            rows.append((0,ln.strip()))
                print("TRANSCRIPT_LINES",len(rows))
                if rows:
                    for sec,text in rows[:110]:
                        print("CAPTION",sec,small(text,165))
                    keywords=("навык","сражен","класс","предмет","босс","руна","спутник","арен","loot","компань","реликви","глава","оружи","магазин","избран")
                    for sec,text in rows[110:]:
                        if any(key in text.lower() for key in keywords):
                            print("MATCH",sec,small(text,160))
            except Exception as e:
                print("CAPTIONS_FETCH_UNAVAILABLE",type(e).__name__,small(e,250))
        else:
            print("NO_COMPATIBLE_RU_UK_EN_CAPTIONS")
except Exception as e:
    print("YTDLP_UNAVAILABLE",type(e).__name__,small(e,650))
