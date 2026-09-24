import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('importer',Path(__file__).parent.parent/'scripts/import-sop-docx.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ParserTests(unittest.TestCase):
 def test_frequency(self):
  self.assertEqual(module.frequency('频次 ★★★★☆'),4)
  self.assertEqual(module.frequency('★☆☆☆☆'),1)
 def test_mixed_paragraph_table_and_unconvertible_math_are_retained(self):
  xml='''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>必修 第1章 集合</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>SOP 001｜原题</w:t></w:r></w:p><w:p><w:r><w:t>频次 ★★★★☆</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>脑内第一句话｜原话</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>第二格</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><m:oMath><m:r><m:t>x²</m:t></m:r></m:oMath></w:p></w:body></w:document>'''
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory)/'fixture.docx'
   with zipfile.ZipFile(path,'w') as archive:archive.writestr('word/document.xml',xml)
   data=module.parse_docx(path)
  self.assertEqual(data['sops'][0]['frequency'],4)
  self.assertEqual(data['sops'][0]['blocks'][1]['rows'],[['脑内第一句话｜原话','第二格']])
  self.assertEqual(data['report']['ommlCount'],1)
  self.assertEqual(len(data['report']['warnings']),1)
  self.assertIn('x²',data['sops'][0]['blocks'][2]['text'])
  self.assertIn('omml',data['sops'][0]['blocks'][2])
if __name__=='__main__':unittest.main()
