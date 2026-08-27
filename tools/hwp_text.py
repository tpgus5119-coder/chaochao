import olefile, zlib, re, glob, os
def hwptext(p):
    o=olefile.OleFileIO(p)
    names=['/'.join(s) for s in o.listdir()]
    secs=sorted([n for n in names if n.startswith('BodyText')])
    txt=[]
    for s in secs:
        d=o.openstream(s).read()
        try: d=zlib.decompress(d,-15)
        except Exception: pass
        i=0
        while i < len(d)-4:
            h=int.from_bytes(d[i:i+4],'little')
            tag=h&0x3ff; sz=(h>>20)&0xfff
            i+=4
            if sz==0xfff:
                sz=int.from_bytes(d[i:i+4],'little'); i+=4
            if tag==67:
                raw=d[i:i+sz]; out=''; j=0
                while j<len(raw)-1:
                    c=int.from_bytes(raw[j:j+2],'little')
                    if c==0: pass
                    elif c in (10,13): out+='\n'
                    elif c<32: j+=14; continue
                    else: out+=chr(c)
                    j+=2
                txt.append(out)
            i+=sz
    return '\n'.join(txt)
