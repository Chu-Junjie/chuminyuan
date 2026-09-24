"""Lossless ordered DOCX ingestion. Uses only Python's standard library."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math'}
W = '{' + NS['w'] + '}'
M = '{' + NS['m'] + '}'

def frequency(text):
    return text.count('★')

def plain(element):
    out = []
    for node in element.iter():
        if node.tag in (W+'t', M+'t'): out.append(node.text or '')
        elif node.tag == W+'tab': out.append('\t')
        elif node.tag == W+'br': out.append('\n')
    return ''.join(out)

def parse_docx(path):
    with zipfile.ZipFile(path) as doc:
        raw = doc.read('word/document.xml')
        root = ET.fromstring(raw)
        body = root.find('w:body', NS)
        assert body is not None
        blocks, warnings = [], []
        for position, node in enumerate(body):
            if node.tag == W+'sectPr': continue
            style_node = node.find('w:pPr/w:pStyle', NS)
            style = style_node.get(W+'val', '') if style_node is not None else ''
            if node.tag == W+'tbl':
                rows = [[ '\n'.join(plain(p) for p in cell.findall('w:p',NS)) for cell in row.findall('w:tc',NS)] for row in node.findall('w:tr',NS)]
                block = {'type':'table','rows':rows,'text':'\n'.join('\n'.join(row) for row in rows)}
            else:
                block = {'type':'paragraph','text':plain(node),'style':style}
            block['sourceIndex'] = position
            equations = node.findall('.//m:oMath', NS)
            if equations:
                block['omml'] = [ET.tostring(eq,encoding='unicode') for eq in equations]
                warnings.append({'block':position,'reason':'OMML retained as XML and text; manual LaTeX conversion required'})
            if node.findall('.//w:drawing',NS) or node.findall('.//w:pict',NS):
                warnings.append({'block':position,'reason':'Drawing requires manual inspection; source XML retained'})
                block['sourceXml'] = ET.tostring(node,encoding='unicode')
            blocks.append(block)
        chapters, sops, current, chapter = [], [], None, None
        # TOC entries have no heading style. Actual chapters are Heading1.
        for block in blocks:
            text = block['text']
            if block.get('style') == 'Heading1' and re.search(r'第\d+章',text):
                chapter = {'id':f'chapter-{len(chapters)+1:02d}','title':text,'subject_id':'math','sort_order':len(chapters)}
                chapters.append(chapter)
                current = None
            elif block.get('style') == 'Heading1':
                # Book-level appendices belong in sourceBlocks, not the final SOP's practice section.
                current = None
            match = re.match(r'^SOP\s*(\d{3})[｜|]\s*(.+)',text)
            if match and block.get('style') == 'Heading2':
                if chapter is None: raise ValueError('SOP without chapter: '+text)
                current = {'id':'SOP'+match[1],'code':'SOP'+match[1],'title':match[2],'chapter_id':chapter['id'],'chapter':chapter['title'],'frequency':0,'keywords':[],'blocks':[],'sections':[],'sort_order':len(sops)}
                sops.append(current)
                continue
            if current is not None:
                current['blocks'].append(block)
                if text.startswith('频次 '): current['frequency']=frequency(text)
                label = None
                if block.get('style') == 'Heading3': label = text
                elif block['type']=='table': label = text.split('｜')[0]
                if label:
                    current['sections'].append({'id':f'section-{len(current["sections"])}','title':label,'blocks':[]})
                if current['sections']: current['sections'][-1]['blocks'].append(block)
        for sop in sops:
            sop['brain_first'] = next((b['text'].split('｜',1)[-1].strip() for b in sop['blocks'] if '脑内第一句话｜' in b['text']), '')
            sop['keywords'] = re.split('[、与：，]',sop['title'])
        report = {'source':Path(path).name,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'sopCount':len(sops),'chapterCount':len(chapters),'paragraphCount':len(root.findall('.//w:body/w:p',NS)),'tableCount':len(root.findall('.//w:tbl',NS)),'ommlCount':len(root.findall('.//m:oMath',NS)),'sourceBlockCount':len(blocks),'importedSopBlocks':sum(len(s['blocks'])+1 for s in sops),'warnings':warnings,'missingSections':[{ 'sop':s['id'],'section':label} for s in sops for label in ['脑内第一句话','固定SOP','典型例题','易错警报','30秒速记'] if not any(label in b['text'] for b in s['blocks'])]}
        return {'chapters':chapters,'sops':sops,'sourceBlocks':blocks,'report':report}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('source'); parser.add_argument('--out',default='public/data')
    args=parser.parse_args(); data=parse_docx(args.source)
    out=Path(args.out); (out/'sops').mkdir(parents=True,exist_ok=True)
    if len(data['sops']) != 100: raise ValueError(f'Expected 100 SOPs; got {len(data["sops"])}. Inspect input before publishing.')
    def write(name,value): (out/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
    write('chapters.json',data['chapters'])
    write('catalog.json',[{k:v for k,v in s.items() if k not in ('blocks','sections')} for s in data['sops']])
    write('search.json',[{'id':s['id'],'text':'\n'.join(b['text'] for b in s['blocks'])} for s in data['sops']])
    for sop in data['sops']: write('sops/'+sop['id']+'.json',sop)
    write('import-report.json',data['report'])
    write('source-blocks.json',data['sourceBlocks'])
    print(json.dumps(data['report'],ensure_ascii=False,indent=2))

if __name__=='__main__': main()
