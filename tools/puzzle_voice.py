# Narrator lines for the puzzle pictures (a short story after each finished puzzle) (the film's storyteller voice). Run: python3 tools/puzzle_voice.py
import json,urllib.request,urllib.error,os,subprocess,importlib.util
spec=importlib.util.spec_from_file_location('f','tools/film_src.py'); f=importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
L={'p5':'[warmly] В городе Назарете к Марии пришёл ангел Гавриил. Он сказал: «Радуйся, Благодатная!» Ангел принёс радостную весть: у Марии родится Сын, и Его имя будет Иисус. Мария ответила: «Се, раба Господня; да будет мне по слову твоему».',
   'p2':'[softly] Иосиф очень волновался за Марию. Но ночью во сне ему явился ангел и сказал не бояться: Сын Марии от Святого Духа. Иосиф должен назвать Его Иисус, потому что Он спасёт людей от грехов. Иосиф проснулся и послушался ангела.',
   'p4':'[excitedly] В поле возле Вифлеема пастухи ночью стерегли стадо. Вдруг перед ними явился ангел, и всё вокруг осветилось. Он сказал: «Не бойтесь!» И возвестил великую радость: родился Спаситель. Пастухи поспешили в Вифлеем.',
   'p1':'[reverently] Старик Симеон долго ждал обещанного Спасителя. В храме он взял Младенца Иисуса на руки и прославил Бога: «Ибо видели очи мои спасение Твоё». Мария и Иосиф очень удивились его словам.',
   'p8':'[warmly] Рядом в храме была пророчица Анна. Она была уже очень старенькая и не отходила от храма: служила Богу днём и ночью. Увидев Младенца, Анна стала славить Бога и рассказывать о Нём всем, кто ждал спасения.',
   'p7':'[thoughtfully] Мудрецы с востока изучали древние свитки и звёзды. Увидев на небе необычную звезду, они отправились в далёкий путь. Дойдя до Иерусалима, спросили: «Где родившийся Царь Иудейский? Ибо мы видели звезду Его на востоке и пришли поклониться Ему».',
   'p3':'[warmly] Мудрецы шли за звездой на верблюдах. Дорога была долгой, но звезда снова вела их вперёд. Когда они нашли Младенца, то очень обрадовались, поклонились Ему и принесли золото, ладан и смирну.',
   'p6':'[gravely] Царь Ирод встревожился, когда услышал о новорождённом Царе. Он собрал книжников, и они ответили: в Вифлееме. Ирод попросил волхвов сообщить ему, где Младенец, будто хочет поклониться Ему. Но на самом деле он вовсе этого не хотел. Бог предупредил волхвов во сне, и они вернулись домой другим путём.'}
for k,t in L.items():
    out=f'public/audio/puzzle/{k}.mp3'
    if os.path.exists(out): continue
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{f.NARRATOR}?output_format=mp3_44100_128",data=json.dumps({'text':t,'model_id':'eleven_v4'}).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'})
    try:
        open(out+'.raw','wb').write(urllib.request.urlopen(req,timeout=120).read()); subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out+'.raw','-ac','1','-c:a','libmp3lame','-b:a','64k',out]); os.remove(out+'.raw'); print('ok',k)
    except urllib.error.HTTPError as e: print('FAIL',k,e.code,e.read().decode()[:100])
