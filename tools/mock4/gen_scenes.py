# -*- coding: utf-8 -*-
"""주간시험 4 모의고사 그림 — 듣기 2 다섯 벌 × 한 사람 다섯 장면, 쓰기 3 다섯 장(글자 없이 굽고 이름표는 w3_labels4.py). Draw Things FLUX schnell 4단계.
쓰기: python3 tools/mock4/gen_scenes.py [파일이름 ...]   (이름을 주면 그것만 — 씨앗을 바꿔 다시 그림)"""
import base64, io, json, pathlib, sys, urllib.request
from PIL import Image
R = pathlib.Path(__file__).resolve().parent.parent.parent
API = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
KEEP = pathlib.Path.home() / '짜오짜오/_보관/mock4_w3_이름표전_20261106'
TAIL = 'Flat vector illustration, clean outlines, flat pastel colors, simple soft background, friendly modern Asian character, full clear view of the action.'
WT = 'Flat vector illustration, clean outlines, flat pastel colors, wide scene, every person fully visible and separated from the others, plain walls.'
M1 = 'A young Vietnamese man with short black hair and a light blue shirt'
F2 = 'A young Vietnamese woman with a brown hair bun and a green blouse'
M3 = 'A young Vietnamese man with glasses and an orange polo shirt'
F4 = 'A young Vietnamese woman with long straight black hair and a pink blouse'
M5 = 'A young Vietnamese man with curly hair and a yellow t-shirt'
P = {
 '1-pa': f'{M1} riding a scooter on a city street, wearing a helmet, going to work with a backpack',
 '1-pb': f'{M1} sitting on a sofa eating a bowl of rice with chopsticks while watching television',
 '1-pc': f'{M1} sitting at a desk talking on a smartphone, a small restaurant table with two chairs shown in a thought bubble',
 '1-pd': f'{M1} at a hotel front desk handing a passport to a smiling female receptionist',
 '1-pe': f'{M1} standing alone inside an open hotel elevator, doors open, carrying a small suitcase',
 '2-pa': f'{F2} standing alone at a city bus stop shelter with a bench, looking down the road, waiting',
 '2-pb': f'{F2} sitting at a cafe table reading a newspaper and holding a cup of coffee',
 '2-pc': f'{F2} sitting at a small street restaurant table eating a bowl of pho noodle soup with chopsticks',
 '2-pd': f'{F2} on a sunny tropical beach holding up a camera and taking a photo of the sea',
 '2-pe': f'{F2} standing at a green school chalkboard writing with chalk in a classroom, seen from the side',
 '3-pa': f'{M3} riding a small electric bicycle on a road, helmet on, no pedalling',
 '3-pb': f'{M3} walking along a path in a green park, seen from the side in mid stride, wearing big headphones, musical notes in the air',
 '3-pc': f'{M3} at a restaurant table holding money out to a waitress who is holding a small bill tray, paying the bill',
 '3-pd': f'{M3} with a suitcase at a hotel front desk receiving a room key from a receptionist',
 '3-pe': f'{M3} swimming and playing in the sea waves wearing swim trunks, beach behind him',
 '4-pa': f'{F4} riding a bicycle with a basket full of vegetables on a quiet street',
 '4-pb': f'{F4} cooking at a kitchen stove stirring a pot, wearing wireless headphones, music notes in the air',
 '4-pc': f'{F4} at a dining table dipping a fried spring roll held with chopsticks into a small bowl of fish sauce',
 '4-pd': f'{F4} at a hotel front desk handing a room key to a male receptionist, a suitcase beside her',
 '4-pe': f'{F4} lying flat on her back asleep on a long sofa chair, eyes closed, whole body visible from head to feet, side view, plain room',
 '5-pa': f'{M5} sitting alone on a seat inside a city bus, looking out of the big window',
 '5-pb': f'{M5} sitting at a breakfast table eating a sandwich while reading a newspaper in the morning',
 '5-pc': f'{M5} in a home kitchen frying a big yellow crispy pancake in a pan',
 '5-pd': f'{M5} walking across a zebra crossing on a street, a tall beige building with many windows and a blank facade behind him',
 '5-pe': f'{M5} walking up a small green grassy hill on a dirt path, seen from the side',
 '1-w3': 'A Vietnamese restaurant interior. On the left a woman in a red dress and a man in a blue shirt sit at a table and eat. On the right a woman with short hair stands and drinks from a glass. In the middle a waiter in a white shirt stands carrying a tray with one big bowl. Four adults with space between them.',
 '2-w3': 'A hotel lobby. On the left a receptionist woman in a uniform stands behind a front desk. In the middle a man in a grey suit stands at the desk holding a passport. On the right a woman with a suitcase stands in front of an open elevator. Far right a child sits on a chair reading a book. Empty sign panel on the back wall.',
 '3-w3': 'A sunny tropical beach with palm trees and blue sea. On the left a man stands holding a camera and taking a photo. In the middle a woman sits on a beach chair drinking from a coconut. On the right a child plays in the sand with a bucket. In the sea a man swims. Four people with space between them.',
 '4-w3': 'A city street scene. On the left a woman stands at a bus stop shelter with a bench. In the middle a man rides a scooter on the road wearing a helmet. On the right a young man rides a bicycle. In front a grandmother walks across a zebra crossing. Four people with space between them. An empty rectangular sign on the bus shelter roof.',
 '5-w3': 'An evening night market with paper lanterns and plain food stalls with blank awnings. On the left a seller woman behind a stall grills food. In the middle a man sits on a small stool eating a bowl of noodles. On the right a woman stands drinking from a cup. Far right a child eats a sandwich. Four people with space between them.'}
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
            im = im.resize((576, 384), Image.LANCZOS); im.save(KEEP / f'mock4-{k}.webp', 'WEBP', quality=90); im.save(R / f'img/mock4-{k}.webp', 'WEBP', quality=88)
        else:
            im.resize((384, 384), Image.LANCZOS).save(R / f'img/mock4-{k}.webp', 'WEBP', quality=86)
        print(k, flush=True)
