# -*- coding: utf-8 -*-
"""카카오톡 PC(윈도우) 화면 자동화로 오픈채팅방에 메시지 전송.

전제: 클라우드 윈도우 PC에 카카오톡 PC가 설치·로그인되어 있고,
     대상 오픈채팅방 3개에 이미 입장해 있어야 한다.
동작: 메인창 검색 → 방 열기 → 입력창에 붙여넣기 → Enter 전송.
※ 카톡 UI는 버전마다 조금씩 달라서, 첫 배포 때 반드시 실제로 눈으로 확인한다.
"""
import time

import pyperclip
from pywinauto import Application, Desktop
from pywinauto.keyboard import send_keys

MAIN_TITLE_RE = "카카오톡.*"
MAIN_CLASS = "EVA_Window_Dblclk"


def _main_window():
    app = Application(backend="win32").connect(class_name=MAIN_CLASS, title_re=MAIN_TITLE_RE, timeout=10)
    w = app.window(class_name=MAIN_CLASS, title_re=MAIN_TITLE_RE)
    w.set_focus()
    return w


def _open_room(main, room_name: str):
    """메인창 상단 검색에 방 이름을 넣고 Enter 로 방을 연다."""
    main.set_focus()
    # 검색창 활성화 (카톡 단축키). 안되면 좌상단 돋보기 클릭으로 대체 필요.
    send_keys("^f")
    time.sleep(0.6)
    pyperclip.copy(room_name)
    send_keys("^a{BACKSPACE}")
    send_keys("^v")
    time.sleep(1.2)
    send_keys("{ENTER}")
    time.sleep(1.5)
    # 방 창은 별도 top-level 윈도우로 뜬다 (제목 = 방 이름)
    for _ in range(10):
        for w in Desktop(backend="win32").windows():
            try:
                if room_name in w.window_text() and w.class_name() == "EVA_Window":
                    return w
            except Exception:
                pass
        time.sleep(0.5)
    raise RuntimeError(f"방 창을 찾지 못함: {room_name}")


def _paste_and_send(room_win, text: str):
    room_win.set_focus()
    time.sleep(0.4)
    # 입력창(RichEdit) 클릭
    try:
        edit = room_win.child_window(class_name="RichEdit20W")
        edit.click_input()
    except Exception:
        room_win.click_input()
    time.sleep(0.3)
    pyperclip.copy(text)
    send_keys("^a{BACKSPACE}")
    send_keys("^v")
    time.sleep(0.8)
    send_keys("{ENTER}")
    time.sleep(0.6)


def send(room_name: str, text: str, retries: int = 1):
    last = None
    for attempt in range(retries + 1):
        try:
            main = _main_window()
            room = _open_room(main, room_name)
            _paste_and_send(room, text)
            try:
                room.close()
            except Exception:
                pass
            return True
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3)
    raise RuntimeError(f"전송 실패({room_name}): {last}")
