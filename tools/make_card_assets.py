# Backgrounds (frames of the film clips, cropped square) and stickers (portraits) for the greeting-card maker.
import hashlib,json,subprocess,os
LH='/Users/alex/WebstormProjects/Lost Home'
man=json.load(open(LH+'/data/videos-manifest.json')); URL={v['key']:v['url'] for v in man['videos']}
raw=lambda k: (f"work/film/extra/{k}" if os.path.exists(f"work/film/extra/{k}") else f"{LH}/.film-cache/storyboard-media/raw-{hashlib.sha1(URL[k].encode()).hexdigest()[:16]}.mp4")
# name, clip, second, crop x-centre (0..1 of the width)
BG=[('manger','Virgin_Mary_holding_baby_Jesus_202606180115.mp4',6,0.5),('magi','Virgin_Mary_holding_baby_Jesus_202606181640_1_.mp4',3,0.5),('shepherds','Angels_to_shepherds.mp4',2,0.5),
    ('gabriel','Angel_Gabriel_announces_to_Mary_202607210024.mp4',5,0.5),('light','first-coming.mp4',4,0.62),('star','Vision_of_Micah.mp4',4,0.62)]
for n,k,t,cx in BG:
    src=raw(k); w=int(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width','-of','csv=p=0',src]).decode().split()[0]); h=int(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=height','-of','csv=p=0',src]).decode().split()[0])
    x=max(0,min(w-h,int(w*cx-h/2)))
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(t),'-i',src,'-frames:v','1','-vf',f'crop={h}:{h}:{x}:0,scale=1080:1080:flags=lanczos','-q:v','3',f'public/card/bg/{n}.jpg'],check=True); print('bg',n)
