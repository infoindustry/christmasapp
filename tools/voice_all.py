import json,urllib.request,urllib.error,os,time,sys,threading
from concurrent.futures import ThreadPoolExecutor
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
W=json.load(open('data/witnesses.json'))
jobs=[]
for w in W:
    os.makedirs(f"public/audio/witnesses/{w['id']}",exist_ok=True)
    for l in w['lines']:
        out=f"public/audio/witnesses/{w['id']}/{l['id']}.mp3"
        if not os.path.exists(out) or os.path.getsize(out)<5000: jobs.append((w,l,out))
print('to do',len(jobs),flush=True)
lock=threading.Lock(); done=[0]; fails=[]
def run(job):
    w,l,out=job
    for attempt in range(5):
        try:
            req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{w['voiceId']}?output_format=mp3_44100_128",data=json.dumps({'text':l['text'],'model_id':'eleven_v4'}).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'})
            b=urllib.request.urlopen(req,timeout=120).read(); open(out,'wb').write(b)
            with lock: done[0]+=1; print(f"{done[0]:3}/{len(jobs)} {l['id']} {len(b)//1024}KB",flush=True)
            return
        except urllib.error.HTTPError as e:
            body=e.read().decode()[:200]
            if e.code in (429,500,502,503) and attempt<4: time.sleep(3*(attempt+1)); continue
            with lock: fails.append((l['id'],e.code,body)); print('FAIL',l['id'],e.code,body,flush=True); return
        except Exception as e:
            if attempt<4: time.sleep(3); continue
            with lock: fails.append((l['id'],'exc',str(e))); print('FAIL',l['id'],e,flush=True); return
with ThreadPoolExecutor(5) as ex: list(ex.map(run,jobs))
print('finished, failed:',len(fails))
json.dump(fails,open('work/voice_fails.json','w'),ensure_ascii=False)
