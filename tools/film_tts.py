import json,urllib.request,urllib.error,os,time,importlib.util,sys
from concurrent.futures import ThreadPoolExecutor
spec=importlib.util.spec_from_file_location('f','tools/film_src.py'); f=importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
os.makedirs('work/film/audio',exist_ok=True)
only=sys.argv[1:] 
def run(s):
    out=f"work/film/audio/{s['id']}.mp3"
    if os.path.exists(out) and os.path.getsize(out)>5000 and not only: return
    for a in range(5):
        try:
            req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{f.NARRATOR}?output_format=mp3_44100_128",data=json.dumps({'text':s['text'],'model_id':'eleven_v4'}).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'})
            open(out,'wb').write(urllib.request.urlopen(req,timeout=120).read()); print('ok',s['id'],flush=True); return
        except urllib.error.HTTPError as e:
            b=e.read().decode()[:200]
            if e.code in (429,500,502,503) and a<4: time.sleep(3*(a+1)); continue
            print('FAIL',s['id'],e.code,b,flush=True); return
jobs=[s for s in f.S if not only or s['id'] in only]
with ThreadPoolExecutor(3) as ex: list(ex.map(run,jobs))
