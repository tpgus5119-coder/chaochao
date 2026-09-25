import json,hashlib,pathlib,sys,os
from PIL import Image,ImageDraw,ImageFont
slug=lambda v:hashlib.sha1(v.encode()).hexdigest()[:10]
P=json.load(open("regen_prompts.json",encoding="utf-8")); reg=json.load(open("shared_regen.json",encoding="utf-8"))
prio={}
for r in reg: prio[r["vi"]]=min(prio.get(r["vi"],9),0 if any(s in r["src"] for s in "mdo") else 1)
order=sorted(P,key=lambda w:(prio.get(w,1),w))
sen=[w for w in order if prio.get(w,1)==1]
done=[w for w in sen if pathlib.Path(f"regen/imgnew/{slug(w)}.webp").exists()]
a=int(sys.argv[1]); b=int(sys.argv[2]); part=done[a:b]
print("선배 새 그림 완료",len(done),"/",len(sen),"→ 이번 판",len(part))
font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf",15)
cols,T=6,196
os.makedirs("regen_sheets",exist_ok=True)
for si in range(0,len(part),30):
    ch=part[si:si+30]; rows=(len(ch)+cols-1)//cols
    S=Image.new("RGB",(cols*T,rows*(T+40)),"white");D=ImageDraw.Draw(S)
    for k,w in enumerate(ch):
        x=(k%cols)*T;y=(k//cols)*(T+40)
        S.paste(Image.open(f"regen/imgnew/{slug(w)}.webp").convert("RGB").resize((T-6,T-6)),(x+3,y+2))
        D.text((x+3,y+T-4),f"{a+si+k+1}. {w}",fill="black",font=font); D.text((x+3,y+T+14),P[w]["ko"][:16],fill=(90,90,90),font=font)
    S.save(f"regen_sheets/s_{a}_{si//30+1}.jpg",quality=78); print(f"regen_sheets/s_{a}_{si//30+1}.jpg")
