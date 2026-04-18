import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_text(path):
    try:
        with zipfile.ZipFile(path, 'r') as zf:
            if 'word/document.xml' not in zf.namelist():
                print("word/document.xml not found")
                return
            xml_content = zf.read('word/document.xml')
            
        tree = ET.fromstring(xml_content)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        texts = []
        for node in tree.iter():
            if node.tag == f"{{{ns['w']}}}t":
                if node.text:
                    texts.append(node.text)
        
        with open('scratch/research_text.txt', 'w', encoding='utf-8') as f:
            f.write('\n'.join(texts))
            
        print(f"Extracted {len(texts)} text nodes.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    extract_text('public/Research.docx')
