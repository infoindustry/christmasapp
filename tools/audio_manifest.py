# Rebuilds data/witnesses-audio.json (durations of every voiced line) and public/data/word.json durations. Paths are relative (site works under any sub-path).
import json,subprocess
dur=lambda f: float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
b=json.load(open('public/data/witnesses.json')); out={}
for w in b:
    out[w['id']]={}
    for l in w['lines']:
        f=f"public/audio/witnesses/{w['id']}/{l['id']}.mp3"
        out[w['id']][l['id']]={'file':f[7:],'sec':round(dur(f),2),'kind':l['kind']}
for p in ('public/data/witnesses-audio.json','data/witnesses-audio.json'): json.dump(out,open(p,'w'),ensure_ascii=False,indent=1)
w=json.load(open('public/data/word.json'))
for k in w: w[k]['sec']=round(dur('public/'+w[k]['file']),1)
json.dump(w,open('public/data/word.json','w'),ensure_ascii=False,indent=1)
print('manifest ok')
