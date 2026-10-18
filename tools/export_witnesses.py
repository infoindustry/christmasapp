import json,re,importlib.util
spec=importlib.util.spec_from_file_location('w','tools/witnesses_src.py'); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ids=json.load(open('work/auditions/ids.json'))
spec2=importlib.util.spec_from_file_location('o','tools/witnesses_overrides.py'); mo=importlib.util.module_from_spec(spec2); spec2.loader.exec_module(mo)
for w in m.W:
    ov=mo.O.get(w['id'],{})
    for i,t in ov.get('story',{}).items(): w['story'][i]=t
    for i,qa in ov.get('qa',{}).items(): w['qa'][i]=qa

for w in m.W: w['qa']=list(w['qa'])+list(mo.X.get(w['id'],[]))
PICK={'MARAT_PLACEHOLDER':'vQxSi2Eu'}
out=[]; total=0
for w in m.W:
    vid=ids[PICK[w['voiceId']]] if w['voiceId'] in PICK else w['voiceId']
    lines=[]
    for i,t in enumerate(w['story'],1): lines.append(dict(id=f"{w['id']}-s{i:02d}",kind='story',text=t))
    for i,(q,a) in enumerate(w['qa'],1): lines.append(dict(id=f"{w['id']}-q{i:02d}",kind='answer',question=q,text=a))
    for i,t in enumerate(mo.P.get(w['id'],[]),1): lines.append(dict(id=f"{w['id']}-p{i:02d}",kind='poke',text=t))
    total+=sum(len(re.sub(r'\[[^\]]*\]','',l['text'])) for l in lines)
    out.append(dict(id=w['id'],name=w['name'],voiceId=vid,voiceName=w['voiceName'],model=w['model'],scripture=w['intro'],lines=lines))
out.append(dict(id='word',name='Слово Божье',type='book',voiceId='',voiceName='аудиокнига',model='',scripture='Лк 1–2; Мф 1–2; Ин 1:14',lines=[]))
out.append(dict(id='room',name='Рождественская комната',type='room',voiceId='',voiceName='',model='',scripture='Загляни внутрь',lines=[]))
out.append(dict(id='game',name='Пряничек',type='game',voiceId='',voiceName='',model='',scripture='Игра: собери звёзды',lines=[]))
json.dump(out,open('data/witnesses.json','w'),ensure_ascii=False,indent=1)
md=['# 11 свидетелей Рождества — реплики\n','Каждому: 15 реплик рассказа по порядку и 7 ответов на вопросы ребёнка (всего 22). Теги в [скобках] — подача голоса Eleven v4, не произносятся. Цитаты Писания слово в слово по Синодальному переводу (из базы gospel-context).\n']
for w in out:
    md.append(f"\n## {w['name']}  \nГолос: **{w['voiceName']}** · Модель: `{w['model']}` · Писание: {w['scripture']}\n")
    md.append('**Рассказ**\n'); n=0
    for l in w['lines']:
        if l['kind']=='story': n+=1; md.append(f"{n}. {l['text']}")
    md.append('\n**Вопросы ребёнка**\n')
    for l in w['lines']:
        if l['kind']=='answer': md.append(f"- **{l['question']}**  \n  {l['text']}")
open('data/witnesses.md','w').write('\n'.join(md)+'\n')
print('witnesses',len(out),'lines',sum(len(w['lines']) for w in out),'chars',total)

import shutil,os
os.makedirs('public/data',exist_ok=True)
shutil.copy('data/witnesses.json','public/data/witnesses.json')
if os.path.exists('data/witnesses-audio.json'): shutil.copy('data/witnesses-audio.json','public/data/witnesses-audio.json')
print('published to public/data')
