# Renders the film: clips (Lost Home cache) + narration → scenes → one MP4 with music, subtitles and chapters.
import json,hashlib,os,re,subprocess,importlib.util,shutil
spec=importlib.util.spec_from_file_location('f','tools/film_src.py'); f=importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
LH='/Users/alex/WebstormProjects/Lost Home'
man=json.load(open(LH+'/data/videos-manifest.json'))
URL={v['key']:v['url'] for v in man['videos']}
raw=lambda k: (f"work/film/extra/{k}" if os.path.exists(f"work/film/extra/{k}") else f"{LH}/.film-cache/storyboard-media/raw-{hashlib.sha1(URL[k].encode()).hexdigest()[:16]}.mp4")
W,H,FPS=1280,720,24
os.makedirs('work/film/scenes',exist_ok=True); os.makedirs('public/film',exist_ok=True)
sh=lambda *a: subprocess.run(a,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
dur=lambda p: float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p]))
LEAD,TAIL=0.5,0.9

def render(s):
    out=f"work/film/scenes/{s['id']}.mp4"
    a=f"work/film/audio/{s['id']}.mp3"; ad=dur(a); T=LEAD+ad+TAIL
    segs=[]
    for i,(k,ss,to) in enumerate(s['clips']):
        seg=f"work/film/scenes/{s['id']}_c{i}.mp4"
        args=['ffmpeg','-y','-loglevel','error','-ss',str(ss)]+(['-to',str(to)] if to else [])+['-i',raw(k),'-an','-vf',f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p",'-c:v','libx264','-crf','20','-preset','fast',seg]
        sh(*args); segs.append(seg)
    base=segs[0]
    if len(segs)>1:
        lst='work/film/scenes/%s_l.txt'%s['id']; open(lst,'w').write(''.join(f"file '{os.getcwd()}/{x}'\n" for x in segs)); base=f"work/film/scenes/{s['id']}_b.mp4"; sh('ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',lst,'-c','copy',base)
    L=dur(base)
    if T<=L: slow,hold=1.0,0.0; vf=f"trim=duration={T},setpts=PTS-STARTPTS"
    else:
        slow=min(T/L,1.45); hold=max(0,T-L*slow); vf=f"setpts={slow}*PTS"
    part=f"work/film/scenes/{s['id']}_p.mp4"
    sh('ffmpeg','-y','-loglevel','error','-i',base,'-vf',vf+f",fps={FPS},format=yuv420p",'-c:v','libx264','-crf','20','-preset','fast',part)
    final=part
    if hold>0.05:   # keep the picture alive: a slow push-in on the last frame
        png=f"work/film/scenes/{s['id']}_last.png"; sh('ffmpeg','-y','-loglevel','error','-sseof','-0.1','-i',part,'-frames:v','1','-update','1',png)
        n=int(hold*FPS)+2; still=f"work/film/scenes/{s['id']}_s.mp4"
        sh('ffmpeg','-y','-loglevel','error','-loop','1','-i',png,'-vf',f"scale=3840:2160,zoompan=z='1+0.00045*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},format=yuv420p",'-frames:v',str(n),'-c:v','libx264','-crf','20','-preset','fast',still)
        lst='work/film/scenes/%s_h.txt'%s['id']; open(lst,'w').write(f"file '{os.getcwd()}/{part}'\nfile '{os.getcwd()}/{still}'\n"); final=f"work/film/scenes/{s['id']}_m.mp4"
        sh('ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',lst,'-c','copy',final)
    # fades + narration (delayed a little), exact length T
    sh('ffmpeg','-y','-loglevel','error','-i',final,'-i',a,'-filter_complex',f"[0:v]trim=duration={T},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.5,fade=t=out:st={T-0.7:.2f}:d=0.7[v];[1:a]adelay={int(LEAD*1000)}|{int(LEAD*1000)},apad=whole_dur={T},atrim=duration={T},afade=t=out:st={T-0.3:.2f}:d=0.3[a]",'-map','[v]','-map','[a]','-c:v','libx264','-crf','22','-preset','medium','-r',str(FPS),'-c:a','aac','-b:a','160k','-ar','44100','-ac','2',out)
    return T,ad

if __name__=='__main__':
    import sys
    sel=sys.argv[1:]
    info={}
    for s in f.S:
        out=f"work/film/scenes/{s['id']}.mp4"
        if (not sel and os.path.exists(out)) : info[s['id']]=(dur(out),dur(f"work/film/audio/{s['id']}.mp3")); continue
        if sel and s['id'] not in sel and os.path.exists(out): info[s['id']]=(dur(out),dur(f"work/film/audio/{s['id']}.mp3")); continue
        info[s['id']]=render(s); print('scene',s['id'],round(info[s['id']][0],1),flush=True)
    # concat
    lst='work/film/all.txt'; open(lst,'w').write(''.join(f"file '{os.getcwd()}/work/film/scenes/{s['id']}.mp4'\n" for s in f.S))
    sh('ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',lst,'-c','copy','work/film/nomusic.mp4')
    total=dur('work/film/nomusic.mp4')
    # music: one continuous bed made of the scenes' themes
    groups=[]; 
    for s in f.S:
        d=info[s['id']][0]
        if groups and groups[-1][0]==s['music']: groups[-1][1]+=d
        else: groups.append([s['music'],d])
    parts=[]
    for i,(th,d) in enumerate(groups):
        p=f"work/film/music_{i}.wav"; fi=1.0 if i else 0.0; fo=1.6
        sh('ffmpeg','-y','-loglevel','error','-stream_loop','-1','-i',f"public/audio/theme-{th}.mp3",'-t',str(d),'-af',f"afade=t=in:d={max(fi,0.01)},afade=t=out:st={d-fo:.2f}:d={fo},aformat=sample_rates=44100:channel_layouts=stereo",p); parts.append(p)
    open('work/film/music.txt','w').write(''.join(f"file '{os.getcwd()}/{p}'\n" for p in parts))
    sh('ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i','work/film/music.txt','-c','copy','work/film/music.wav')
    sh('ffmpeg','-y','-loglevel','error','-i','work/film/nomusic.mp4','-i','work/film/music.wav','-filter_complex',"[1:a]volume=0.20[m];[0:a][m]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=%.2f:d=2.5[a]"%(total-2.5),'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','160k','public/film/story.mp4')
    # chapters + subtitles
    t=0.0; chapters=[]; vtt=['WEBVTT\n']; scenes=[]
    ts=lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{x%60:06.3f}"
    for s in f.S:
        T,ad=info[s['id']]; txt=re.sub(r'\[[^\]]*\]\s*','',s['text']).strip()
        scenes.append(dict(id=s['id'],chapter=s['ch'],start=round(t,2),end=round(t+T,2),text=txt))
        if not chapters or chapters[-1]['ch']!=s['ch']: chapters.append(dict(ch=s['ch'],title=f.CHAPTERS[s['ch']],start=round(t,2)))
        sents=[x.strip() for x in re.findall(r'[^.!?]+[.!?»]*\s*',txt) if x.strip()]
        # merge very short ones, split time by length
        tot=sum(len(x) for x in sents); a0=t+LEAD; 
        for x in sents:
            d=ad*len(x)/tot; vtt.append(f"{ts(a0)} --> {ts(a0+d)}\n{x}\n"); a0+=d
        t+=T
    open('public/film/story.vtt','w',encoding='utf-8').write('\n'.join(vtt))
    json.dump(dict(title='История Рождества',duration=round(total,1),chapters=chapters,scenes=scenes),open('public/film/story.json','w'),ensure_ascii=False,indent=1)
    sh('ffmpeg','-y','-loglevel','error','-ss',str(scenes[13]['start']+8),'-i','public/film/story.mp4','-frames:v','1','-vf','scale=1280:-2','public/film/poster.jpg')
    print('done',round(total,1),'sec',os.path.getsize('public/film/story.mp4')//1024//1024,'MB')
