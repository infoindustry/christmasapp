# Narrator lines for the Bethlehem diorama (the film's storyteller voice). Run: python3 tools/beth_voice.py
import json,urllib.request,urllib.error,os,subprocess,importlib.util
spec=importlib.util.spec_from_file_location('f','tools/film_src.py'); f=importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
L={'n0':'[warmly] Это Вифлеем, маленький город, где родился Иисус. Нажми «Ночь» и посмотри, что будет.',
   'n1':'[softly] Вот ночь над Вифлеемом. В окнах зажигаются огоньки, а над маленьким домом сияет особенная звезда.',
   'n2':'[reverently] Здесь, в простом доме, родился Иисус, Сын Божий и наш Спаситель. Он пришёл, чтобы быть рядом с каждым из нас.',
   'n3':'[warmly] В каждом окошке живут люди. Но в ту ночь самую большую радость получили пастухи и все, кто искал Спасителя.'}
for k,t in L.items():
    out=f'public/audio/beth/{k}.mp3'
    if os.path.exists(out): continue
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{f.NARRATOR}?output_format=mp3_44100_128",data=json.dumps({'text':t,'model_id':'eleven_v4'}).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'})
    try:
        open(out+'.raw','wb').write(urllib.request.urlopen(req,timeout=120).read()); subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out+'.raw','-ac','1','-c:a','libmp3lame','-b:a','64k',out]); os.remove(out+'.raw'); print('ok',k)
    except urllib.error.HTTPError as e: print('FAIL',k,e.code,e.read().decode()[:100])
