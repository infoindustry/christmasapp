# Voices the gingerbread's short lines + makes the little game sounds. Run: python3 tools/game_voice.py
import json,urllib.request,urllib.error,os,subprocess,time
env=dict(l.split('=',1) for l in open('/Users/alex/WebstormProjects/gospel-context/.env.local').read().split('\n') if '=' in l and not l.startswith('#'))
K=env['ELEVENLABS_API_KEY'].strip().strip('"\'')
VOICE=json.load(open('work/game/voices.json'))['0']
LINES={
 'start':'[excitedly] Побежали собирать звёздочки!',
 'hint':'[cheerfully] Касайся стола, и я побегу туда!',
 'c1':'[delighted] Ура! Звёздочка!','c2':'[laughing] Ух ты, ещё одна!','c3':'[amazed] Вот это да!','c4':'[giggling] Блестяшка моя!',
 'big':'[in awe] Вау! Вифлеемская звезда!',
 'idle':'[curiously] Эй, куда бежать? Покажи пальчиком!',
 'tickle':'[giggling] Хи-хи, щекотно!',
 'end':'[warmly] Какой чудесный день! Спасибо, что играл со мной!',
 'w1':'[joyfully] Ура, мы победили! А знаешь, главная звезда Рождества — Иисус, наш Спаситель. Он любит тебя!',
 'w2':'[warmly] Мы выиграли! Над Вифлеемом тоже зажглась звезда, когда родился Иисус, Сын Божий.',
 'w3':'[excitedly] Победа! Иисус пришёл на землю, чтобы спасти каждого из нас. И тебя, и меня!',
 'w4':'[softly] Мы молодцы! Помни: Бог так любит тебя, что послал Иисуса. Это самый лучший подарок на Рождество.',
 'f1':'[warmly] Знаешь, почему на Рождество зажигают звёзды? Потому что над Вифлеемом зажглась особенная звезда: родился Иисус!',
 'f2':'[reverently] Иисус — Сын Божий. Сам Бог пришёл на землю, чтобы быть рядом с нами!',
 'f3':'[in awe] Ангел сказал пастухам: «Ныне родился вам Спаситель, Который есть Христос Господь!»',
 'f4':'[gently] Спаситель — это Тот, Кто спасает. Иисус пришёл, чтобы вернуть всех нас к Богу.',
 'f5':'[softly] Иисус родился не во дворце, а в простой семье, и первыми об этом узнали пастухи.',
 'f6':'[amazed] Мудрецы из далёких стран пришли к Нему и принесли золото, ладан и смирну.',
 'f7':'[giggling] Бог любит каждого из нас. Даже маленьких пряничков! Хи-хи.',
 'f8':'[warmly] Иисус вырос и учил людей любить друг друга. Он говорил: «Я есмь свет миру».',
 'f9':'[warmly] С Рождеством! Иисус любит тебя, и я тоже.',
 'b1':'[cheerfully] Ух, как здорово бегать по столу!','b2':'[giggling] Я быстрее самого быстрого пряника!','b3':'[curiously] А что там блестит? Сейчас проверю!','b4':'[excitedly] Давай ещё, ещё!','b5':'[warmly] Рождество — это когда все рядом.','b6':'[laughing] Не поймаешь меня, снежок!','b7':'[proudly] Вот это прыжок!','b8':'[warmly] С тобой играть — одно удовольствие.',
 'oops1':'[startled] Ой-ой!','oops2':'[laughing] Ай, снежок!','lose':'[warmly] Ничего! Мы ещё попробуем, правда?',
 'jump':'[excitedly] Оп! Перепрыгнул!',
}
SFX={'splat':('a soft snowball thump hitting, cartoon, short, clean',0.8),'boing':('a cartoon spring boing jump sound, short, playful, clean',1.2),'fanfare':('a short joyful cartoon victory fanfare with sparkles, clean',2.5),'pop':('a soft cute sparkle pop, magical collect sound, very short, clean',0.8)}
def post(path,body):
    req=urllib.request.Request('https://api.elevenlabs.io'+path,data=json.dumps(body).encode(),headers={'xi-api-key':K,'Content-Type':'application/json'}); return urllib.request.urlopen(req,timeout=120).read()
for k,t in LINES.items():
    out=f'public/audio/game/{k}.mp3'
    if os.path.exists(out): continue
    for a in range(4):
        try: open(out+'.raw','wb').write(post(f'/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',{'text':t,'model_id':'eleven_v4'})); break
        except urllib.error.HTTPError as e:
            print('FAIL',k,e.code,e.read().decode()[:120]); time.sleep(3)
    if os.path.exists(out+'.raw'): subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out+'.raw','-ac','1','-c:a','libmp3lame','-b:a','64k',out]); os.remove(out+'.raw'); print('ok',k)
for k,(t,d) in SFX.items():
    out=f'public/audio/game/{k}.mp3'
    if os.path.exists(out): continue
    try: open(out,'wb').write(post('/v1/sound-generation',{'text':t,'duration_seconds':d,'prompt_influence':0.6})); print('ok',k)
    except urllib.error.HTTPError as e: print('FAIL',k,e.code)
