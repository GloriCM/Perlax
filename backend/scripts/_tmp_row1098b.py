import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(r"E:\Semillas\Descargas\Cotizador Grupo Elliot 2026 1 (1).xlsx")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
z = zipfile.ZipFile(path)
ss = []
root = ET.fromstring(z.read("xl/sharedStrings.xml"))
for si in root.findall("m:si", NS):
    ss.append("".join((t.text or "") for t in si.findall(".//m:t", NS)))

def val(c):
    t = c.attrib.get("t")
    v = c.find("m:v", NS)
    if v is None or v.text is None:
        return None
    if t == "s":
        return ss[int(v.text)]
    return v.text

# cotizador R663 S663
sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
want = {"R663", "S663", "R1098", "S1098", "AO5", "AH5"}
for c in sheet.findall("m:sheetData/m:row/m:c", NS):
    ref = c.attrib.get("r")
    if ref in want:
        f = c.find("m:f", NS)
        print("COT", ref, val(c), f.text if f is not None else "")

mat = ET.fromstring(z.read("xl/worksheets/sheet2.xml"))
wantm = {f"{col}{row}" for col in "BCDEFG" for row in range(8, 15)}
wantm |= {"M35", "G11", "B11", "C11"}
for c in mat.findall("m:sheetData/m:row/m:c", NS):
    ref = c.attrib.get("r")
    if ref in wantm or (ref and ref[0] in "BCDEFG" and ref[1:].isdigit() and 10 <= int(ref[1:]) <= 12):
        print("MAT", ref, val(c))
