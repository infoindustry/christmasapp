# Narrator lines for the two sky pages (the film's storyteller voice). Run: python3 tools/sky_voice.py
import json,urllib.request,urllib.error,os,subprocess,importlib.util
spec=importlib.util.spec_from_file_location('f','tools/film_src.py'); f=importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
L={'s0':'[softly] Ты в поле под Вифлеемом. Ночь, пастухи стерегут стадо. Подними телефон и посмотри вокруг: где-то в небе сияет Вифлеемская звезда. Найди её и держи в центре.',
   's1':'[warmly] Вот она, Вифлеемская звезда! Её увидели мудрецы с востока. А пастухам в ту ночь явился ангел.',
   's2':'[reverently] Ангел сказал: «Не бойтесь; я возвещаю вам великую радость, которая будет всем людям: ибо ныне родился вам в городе Давидовом Спаситель, Который есть Христос Господь».',
   's3':'[joyfully] И вдруг появилось с ангелом многочисленное воинство небесное, славящее Бога и взывающее: «Слава в вышних Богу, и на земле мир, в человеках благоволение!»',
   'm0':'[warmly] Это небо, каким его видели волхвы, мудрецы с востока. Они изучали звёзды и пришли в Иерусалим с вопросом: где родившийся Царь Иудейский? Мы видели звезду Его на востоке и пришли поклониться Ему.',
   'm1':'[thoughtfully] Библия не говорит, какая именно это была звезда. Учёные предполагают разное. Одна из версий: Юпитер и Сатурн трижды сошлись в созвездии Рыб. Юпитер называли царской звездой, а Сатурн связывали с Израилем. Рассмотри это небо сам.'}
for k,t in L.items():
    out=f'public/audio/sky/{k}.mp3'
    if os.path.exists(out): continue
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{f.NARRATOR}?output_format=mp3_44100_128",data=json.dumps({'text':t,'model_id':'eleven_v4'}).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'})
    try:
        open(out+'.raw','wb').write(urllib.request.urlopen(req,timeout=120).read()); subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out+'.raw','-ac','1','-c:a','libmp3lame','-b:a','64k',out]); os.remove(out+'.raw'); print('ok',k)
    except urllib.error.HTTPError as e: print('FAIL',k,e.code,e.read().decode()[:100])
