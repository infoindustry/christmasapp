# Voices the quiz: every question and its explanation, plus the gingerbread's reactions. Run: python3 tools/quiz_voice.py
import json,urllib.request,urllib.error,os,subprocess,time,importlib.util
from concurrent.futures import ThreadPoolExecutor
spec=importlib.util.spec_from_file_location('q','tools/quiz_src.py'); qs=importlib.util.module_from_spec(spec); spec.loader.exec_module(qs)
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
VOICE=json.load(open('work/game/voices.json'))['0']
os.makedirs('public/audio/quiz',exist_ok=True)
J={}
for i,(q,a,e) in enumerate(qs.Q,1):
    J[f'q{i:03d}']='[curiously] '+q
    J[f'e{i:03d}']=('[warmly] ' if a else '[gently] ')+e
J.update({'intro':'[excitedly] Давай проверим, что ты знаешь о Рождестве! Правда или нет?',
 'ok1':'[delighted] Верно! Молодец!','ok2':'[cheerfully] Правильно! Ты настоящий знаток!','ok3':'[excitedly] Ура, ты знаешь!','ok4':'[warmly] Точно так!','ok5':'[amazed] Вот это да, всё верно!','ok6':'[giggling] Хи-хи, угадал!',
 'no1':'[gently] Ой, не совсем!','no2':'[warmly] Почти! Давай послушаем, как на самом деле.','no3':'[softly] Не угадал, но ничего страшного!','no4':'[curiously] Упс! А вот как всё было.','no5':'[kindly] Ничего, в следующий раз получится!',
 'next':'[cheerfully] Следующий вопрос!'})
def post(path,body):
    req=urllib.request.Request('https://api.elevenlabs.io'+path,data=json.dumps(body).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'}); return urllib.request.urlopen(req,timeout=120).read()
def run(item):
    k,t=item; out=f'public/audio/quiz/{k}.mp3'
    if os.path.exists(out) and os.path.getsize(out)>3000: return
    for a in range(5):
        try:
            open(out+'.raw','wb').write(post(f'/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',{'text':t,'model_id':'eleven_v4'})); break
        except urllib.error.HTTPError as e:
            if e.code in (429,500,502,503) and a<4: time.sleep(3*(a+1)); continue
            print('FAIL',k,e.code,e.read().decode()[:100]); return
        except Exception as e:
            time.sleep(3)
    if os.path.exists(out+'.raw'):
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out+'.raw','-ac','1','-c:a','libmp3lame','-b:a','56k',out]); os.remove(out+'.raw'); print('ok',k,flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run,J.items()))
print('done',len(os.listdir('public/audio/quiz')))
