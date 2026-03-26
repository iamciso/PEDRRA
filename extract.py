import os, zipfile
import xml.etree.ElementTree as ET

def extract(path):
    try:
        with zipfile.ZipFile(path) as z:
            tree = ET.XML(z.read('word/document.xml'))
            ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
            return '\n'.join(''.join(n.text for n in p.iter(ns+'t') if n.text) for p in tree.iter(ns+'p') if any(n.text for n in p.iter(ns+'t')))
    except Exception as e: return str(e)

docs_dir = r"C:\Users\chema\OneDrive\14. Python\PEDRRA\docs"
out_path = r"C:\Users\chema\OneDrive\14. Python\PEDRRA\extracted.txt"
with open(out_path, 'w', encoding='utf-8') as f:
    for doc in os.listdir(docs_dir):
        if doc.endswith('.docx'):
            f.write(f"\n\n--- {doc} ---\n{extract(os.path.join(docs_dir, doc))}")
print("Done")
