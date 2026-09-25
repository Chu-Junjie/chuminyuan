"""Import the supplied handbook, preserving tables, page provenance and original text.
Requires pdfplumber. Usage: python scripts/import-english-pdf.py PATH_TO_PDF
"""
import hashlib, json, re, shutil, sys
from pathlib import Path
import pdfplumber
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/data"
MODULES = [(5,"listening","听力"),(24,"reading","阅读理解"),(53,"gap","七选五"),(63,"cloze","完形填空"),(75,"grammar-filling","语法填空"),(92,"practical","应用文写作"),(97,"continuation","读后续写"),(105,"grammar","语法工具箱"),(115,"vocabulary","词汇工具箱"),(122,"writing","写作工具箱"),(124,"yilin","译林版教材对接"),(127,"rescue","急救与索引"),(132,"appendix","巩固与附录")]
LABELS = {"RECOGNISE":"如何识别", "TERM":"术语白话", "THINK":"脑内第一反应", "WHY":"为什么这样做", "STEPS":"固定SOP步骤", "IF/THEN":"分支判断", "STOP":"何时停下", "STUCK":"卡住时自救", "EXAMPLE":"典型例题", "TRAPS":"易错提醒", "CHECK":"最后检查", "MEMORY":"30秒速记"}
def dump(path, value):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def extract(page, number):
 # Remove running headers and page numbers by coordinates, not by text guesses.
 body=page.crop((35,40,page.width-35,page.height-40))
 words=body.extract_words()
 regions=[]
 for rec in (w for w in words if w['text']=='RECOGNISE'):
  think=next((w for w in words if w['text']=='THINK' and w['top']>rec['top']),None)
  top=rec['top']-2; bottom=think['top']-5 if think else page.height-40; mid=page.width/2
  regions.append((top,bottom,[(35,top,mid,bottom),(mid,top,page.width-35,bottom)]))
 # Real multi-column tables, excluding decorative SOP cards.
 if number==2 or (number>=94 and not 97<=number<=104):
  for t in body.find_tables():
   rows=t.extract()
   if rows and max(len(r) for r in rows)>1:
    regions.append((t.bbox[1],t.bbox[3],rows))
 regions.sort(key=lambda r:r[0]); result=[]; cursor=40
 def text_region(box):
  if box[3]<=box[1]: return
  text=page.crop(box).extract_text() or ""
  for line in text.splitlines():
   line=line.strip()
   if line: result.append({"type":"paragraph","text":line,"sourcePage":number})
 for top,bottom,data in regions:
  text_region((35,cursor,page.width-35,top))
  if isinstance(data[0],tuple):
   for box in data: text_region(box)
  else:
   rows=[[c or "" for c in row] for row in data]
   result.append({"type":"table","rows":rows,"text":"\n".join(" | ".join(r) for r in rows),"sourcePage":number})
  cursor=bottom
 text_region((35,cursor,page.width-35,page.height-40))
 return result

def main(source):
 source=Path(source); blocks=[]; pages=[]
 with pdfplumber.open(source) as pdf:
  for n,p in enumerate(pdf.pages,1):
   pages.append({"page":n,"text":p.extract_text() or ""})
   blocks.extend(extract(p,n))
 for i,b in enumerate(blocks): b['sourceIndex']=i
 dump(OUT/'english/source-pages.json',pages)
 dump(OUT/'english/source-blocks.json',blocks)
 chapters=[{"id":"en-overview","subject_id":"english","title":"使用说明与范围","sort_order":0}]+[{"id":"en-"+slug,"subject_id":"english","title":title,"sort_order":i+1} for i,(_,slug,title) in enumerate(MODULES)]
 records=[]; current=None; seq=0
 def start(code,title,chapter,kind="resource",freq=0):
  nonlocal current,seq
  seq+=1
  current={"id":"EN-"+code.replace('.','-'),"code":code,"title":title,"subject_id":"english","chapter_id":chapter['id'],"chapter":chapter['title'],"kind":kind,"frequency":freq,"keywords":[code,title,chapter['title']],"brain_first":"","sort_order":1000+seq,"blocks":[],"sections":[],"source":{"file":"Jiangsu_Gaokao_English_SOP_Final.pdf","startPage":0,"endPage":0}}
  duplicates=sum(r['code']==code for r in records)
  if duplicates: current['id']+='-'+str(duplicates+1)
  records.append(current)
 chapter=chapters[0]; start('GUIDE','使用说明、考试参考与双入口目录',chapter)
 for b in blocks:
  t=b['text']; page=b['sourcePage']
  target=max([i+1 for i,(p,_,_) in enumerate(MODULES) if page>=p],default=0)
  if chapter['id']!=chapters[target]['id']:
   chapter=chapters[target]; start('INTRO-'+chapter['id'][3:].upper(),chapter['title']+' · 总览',chapter)
  sop=re.match(r'^(L\d+|R\d+|G\d+|C\d+|GF\d+|PW1|CW\d+)\s+(.+)',t) if 5<=page<=104 and b['type']=='paragraph' else None
  resource=re.match(r'^((?:8|9|10|11|12)\.\d+[A-Z]?|PW2)\s+(.+)',t) if page>=96 and b['type']=='paragraph' else None
  if sop:
   start(sop[1],sop[2],chapter,'sop')
   continue
  if resource:
   start(resource[1],resource[2],chapter)
   continue
  if t=='常见应用文任务卡': start('PW-TASKS',t,chapter)
  if re.match(r'^Appendix [A-D] -',t):
   code='APP-'+t[9]; start(code,{'A':'可选巩固：阅读、语法、应用文与续写','B':'白话语法术语表','C':'最终覆盖审计','D':'范围依据与来源'}[t[9]],chapter)
  if re.match(r'^[★☆]{3,}',t):
   current['frequency']=t.count('★'); continue
  if t=='🎯': continue
  current['blocks'].append(dict(b))
 # Merge PDF line wraps into paragraphs while respecting semantic boundaries.
 marker=re.compile(r'^(RECOGNISE|TERM|THINK|WHY|STEPS|IF/THEN|STOP|STUCK|EXAMPLE|TRAPS|CHECK|MEMORY) -')
 for r in records:
  if not r['blocks']: continue
  r['source']['startPage']=min(b['sourcePage'] for b in r['blocks'])
  r['source']['endPage']=max(b['sourcePage'] for b in r['blocks'])
  sections=[]; section=None
  for b in r['blocks']:
   t=b['text']; match=marker.match(t)
   heading=LABELS[match[1]] if match else '可选巩固 · 先做再看答案' if t.startswith('可选巩固') else '纠错动作' if t.startswith('🔧') else None
   if heading or section is None:
    section={"id":r['id']+'-s'+str(len(sections)),"title":heading or '原文内容',"blocks":[]};sections.append(section)
   if match:
    if ': ' in t: t=t.split(': ',1)[1]
    else: continue
   if t.startswith('— ') and '本题型到这里' in t: continue
   if t.startswith('可选巩固'): continue
   if section['title']=='固定SOP步骤':
    t=re.sub(r'^\d+\.\s+(\d+)\s+',r'\1. ',t)
    t=re.sub(r'^(\d+)\s+',r'\1. ',t)
   b={**b,"text":t}
   if section['blocks'] and b['type']=='paragraph':
    previous=section['blocks'][-1]
    if previous['type']=='paragraph' and previous['text'].startswith(('答案速查','Answers:')) and not re.match(r'^A[1-4] ',t):
     previous['text']+=' '+t;continue
    boundary=bool(re.match(r'^(?:\d+[. ]|· |✏|🔧|答案速查|Answers:|Part |Appendix |A[1-4] |脑内|Step |Example|Page )',t))
    if previous['type']=='paragraph' and not boundary and not match and not previous['text'].endswith(('。','？','！','：',':','；')):
     previous['text']+=' '+t;continue
   section['blocks'].append(b)
  r['sections']=sections
  r['brain_first']=next((' '.join(b['text'] for b in s['blocks']) for s in sections if s['title']=='脑内第一反应'),'按原文查阅 '+r['title'])
  r['keywords']+=list(dict.fromkeys(re.findall(r'[A-Za-z][A-Za-z/-]{2,}', ' '.join(b['text'] for b in r['blocks']))))[:100]
 records=[r for r in records if r['blocks']]
 # Duplicate wrapped appendix headers are merged into one record.
 unique={}
 for r in records:
  if r['id'] in unique: raise ValueError('Duplicate '+r['id'])
  unique[r['id']]=r
 expected={f'{p}{i}' for p,a,z in [('L',0,10),('R',1,18),('G',1,6),('C',1,7),('GF',1,10),('PW',1,1),('CW',1,5)] for i in range(a,z+1)}
 actual={r['code'] for r in records if r['kind']=='sop'}
 assert actual==expected,(expected-actual,actual-expected)
 assert all(r['frequency'] in [3,4,5] for r in records if r['kind']=='sop')
 for r in records: dump(OUT/'sops'/ (r['id']+'.json'),r)
 dump(OUT/'english/catalog.json',[{k:v for k,v in r.items() if k not in ['blocks','sections']} for r in records])
 dump(OUT/'english/chapters.json',chapters)
 dump(OUT/'english/search.json',[{"id":r['id'],"text":"\n".join(b['text'] for b in r['blocks'])} for r in records])
 report={"source":source.name,"sha256":hashlib.sha256(source.read_bytes()).hexdigest(),"pages":len(pages),"sops":len(actual),"resources":len(records)-len(actual),"chapters":len(chapters),"tables":sum(b['type']=='table' for b in blocks),"warnings":["原文 GF 部分草稿与纠错标签复用了七选五内容；原文保留，平台错因选择使用第128页语法代码。","原文不是完整3100词逐词词库，也不包含听力音频。","原文8.17编号重复，平台保留两个条目并为第二条生成独立ID。"],"method":"Coordinate-aware extraction: running headers removed, two-column cards split, table cells retained. Raw pages archived for audit."}
 dump(OUT/'english/import-report.json',report)
 (ROOT/'public/source').mkdir(exist_ok=True)
 shutil.copyfile(source,ROOT/'public/source'/source.name)
 print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__': main(sys.argv[1])
