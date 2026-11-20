# -*- coding: utf-8 -*-
"""주간시험 5 모의고사 그림 — 듣기 2 다섯 벌 × 한 사람 다섯 장면, 쓰기 3 다섯 장(글자 없이 굽고 이름표는 w3_labels5.py). Draw Things FLUX schnell 4단계.
쓰기: python3 tools/mock5/gen_scenes.py [파일이름 ...]   (이름을 주면 그것만 — 씨앗을 바꿔 다시 그림)"""
import base64, io, json, pathlib, sys, urllib.request
from PIL import Image
R = pathlib.Path(__file__).resolve().parent.parent.parent
API = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
KEEP = pathlib.Path.home() / '짜오짜오/_보관/mock5_w3_이름표전_20261120'
TAIL = 'Flat vector illustration, clean outlines, flat pastel colors, simple soft background, friendly modern Asian character, full clear view of the action.'
WT = 'Flat vector illustration, clean outlines, flat pastel colors, wide scene, every person fully visible and separated from the others, plain walls.'
M1 = 'A young Vietnamese man with short black hair and a light blue shirt'
F2 = 'A young Vietnamese woman with a brown hair bun and a green blouse'
M3 = 'A young Vietnamese man with glasses and an orange polo shirt'
F4 = 'A young Vietnamese woman with long straight black hair and a pink blouse'
M5 = 'A young Vietnamese man with curly hair and a yellow t-shirt'
P = {
 '1-pa': f'{M1} at a market shoe stall holding up one shoe and bargaining with a female seller, pairs of shoes on the stall, plain walls without any letters',
 '1-pb': f'{M1} sitting at a desk plugging a charging cable into his smartphone, the cable goes to a wall socket',
 '1-pc': f'{M1} at the open door of his apartment receiving a boxed rice meal from a delivery man in a uniform and helmet',
 '1-pd': f'{M1} sitting on a bed with a thermometer in his mouth, looking sick, red cheeks, a blanket on his legs',
 '1-pe': f'{M1} asleep in bed with eyes closed, a big ringing alarm clock on the bedside table with shaking lines around it',
 '2-pa': f'{F2} wearing a red skirt and looking at herself in a tall mirror in a clothing shop, trying it on',
 '2-pb': f'{F2} sitting on a bench typing a text message on her smartphone with both thumbs, a chat bubble icon above the phone',
 '2-pc': f'{F2} at a restaurant table holding a long paper receipt and looking at it carefully',
 '2-pd': f'{F2} holding her throat with one hand and a glass of water and a pill in the other hand, looking sick',
 '2-pe': f'{F2} putting folded clothes into an open wooden wardrobe in a bedroom',
 '3-pa': f'{M3} in a men\'s shop looking at a rack of colorful neckties and holding one tie up',
 '3-pb': f'{M3} standing and holding a smartphone to his ear, talking on the phone',
 '3-pc': f'{M3} kicking a soccer ball on a green grass field',
 '3-pd': f'{M3} sitting in a clinic while a doctor in a white coat listens to his chest with a stethoscope',
 '3-pe': f'{M3} sitting in a small wooden boat on a calm river',
 '4-pa': f'{F4} at an outdoor fruit stall with no signs, handing money to a seller and receiving yellow mangoes',
 '4-pb': f'{F4} holding up a smartphone and taking a photo of a flower garden',
 '4-pc': f'{F4} singing into a microphone in a karaoke room, a big screen behind her',
 '4-pd': f'{F4} holding her swollen cheek with one hand because of a toothache, a sad face',
 '4-pe': f'{F4} cooking at a stove in a home kitchen, stirring a frying pan',
 '5-pa': f'{M5} in a shop sitting on a stool trying on a pair of sandals, a shelf of sandals beside him',
 '5-pb': f'{M5} talking on a smartphone, a small picture of a smiling older woman in a speech bubble',
 '5-pc': f'{M5} sitting at a desk reading news on a desktop computer, the screen shows only a photo and grey lines, no letters',
 '5-pd': f'{M5} lying on his side in bed, both hands pressing his lower back, red pain marks on his lower back, a pained face',
 '5-pe': f'{M5} at a table eating a big plate of fresh green lettuce and herbs with chopsticks',
 '1-w3': 'A clothing shop interior with racks of shirts and dresses. On the left a saleswoman stands behind a counter. In the middle a woman holds a dress in front of her body and looks in a tall mirror. On the right a man holds up a shirt and looks at it. Far right a child sits on a chair. Empty sign panel on the back wall. Four people with space between them.',
 '2-w3': 'A small clinic room. On the left a doctor in a white coat sits at a desk writing. In the middle a man sits on a chair holding his head, looking sick. On the right a nurse stands holding a thermometer. Far right a woman sits on a bench waiting and coughing. Empty sign panel on the back wall. Four people with space between them.',
 '3-w3': 'A hotel lobby. On the left a male receptionist stands behind the front desk talking on a telephone. In the middle a woman stands at the desk holding a passport. On the right a man sits on a sofa looking at his smartphone. Far right a porter pushes a luggage cart with suitcases. Empty sign panel on the back wall. Four people with space between them.',
 '4-w3': 'An apartment building entrance hall. On the left a delivery man in a uniform and helmet holds a food bag. In the middle a woman stands holding money to pay. On the right a security guard sits at a small desk reading a newspaper. Far right a boy stands drinking milk. Empty sign panel above the door. Four people with space between them.',
 '5-w3': 'A busy indoor market with stalls of fruit, shoes and bags under plain awnings. On the left a seller woman stands behind a fruit stall. In the middle a man holds up a pair of shoes, bargaining. On the right a woman carries a shopping bag. Far right a child eats a baguette sandwich. Empty sign panel at the top. Four people with space between them.'}
def make(prompt, seed, w, h):
    body = json.dumps({'prompt': prompt, 'steps': 4, 'shift': 1, 'width': w, 'height': h, 'cfg_scale': 1, 'seed': seed, 'sampler_name': 'Euler A Trailing'}).encode()
    req = urllib.request.Request(API, body, {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=240) as r:
        return base64.b64decode(json.loads(r.read())['images'][0])
if __name__ == '__main__':
    KEEP.mkdir(parents=True, exist_ok=True)
    want = [a for a in sys.argv[1:] if not a.startswith('--')] or list(P)
    bump = sum(ord(c) for c in ''.join(a for a in sys.argv[1:] if a.startswith('--s')))
    for k in want:
        wide = k.endswith('w3')
        seed = (sum(ord(c) * (i + 3) for i, c in enumerate(k)) * 97 + bump) % 2000000
        png = make(P[k] + ' ' + (WT if wide else TAIL), seed, 768 if wide else 512, 512)
        im = Image.open(io.BytesIO(png)).convert('RGB')
        if wide:
            im = im.resize((576, 384), Image.LANCZOS); im.save(KEEP / f'mock5-{k}.webp', 'WEBP', quality=90); im.save(R / f'img/mock5-{k}.webp', 'WEBP', quality=88)
        else:
            im.resize((384, 384), Image.LANCZOS).save(R / f'img/mock5-{k}.webp', 'WEBP', quality=86)
        print(k, flush=True)
