import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(r"E:\Semillas\Descargas\Cotizador Grupo Elliot 2026 1 (1).xlsx")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def col_row(cell_ref):
    col = ""
    row = ""
    for ch in cell_ref:
        if ch.isalpha():
            col += ch
        else:
            row += ch
    return col, int(row)

def col_index(col):
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n

# shared strings
z = zipfile.ZipFile(path)
ss = []
if "xl/sharedStrings.xml" in z.namelist():
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("m:si", NS):
        texts = [t.text or "" for t in si.findall(".//m:t", NS)]
        ss.append("".join(texts))

# find sheet named cotizador
wb = ET.fromstring(z.read("xl/workbook.xml"))
rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
rid_to_target = {}
for rel in rels:
    rid_to_target[rel.attrib.get("Id")] = rel.attrib.get("Target")

sheets = []
for sh in wb.findall("m:sheets/m:sheet", NS):
    name = sh.attrib.get("name")
    rid = sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    sheets.append((name, rid_to_target.get(rid)))

print("SHEETS:")
for name, target in sheets:
    print(f"  {name} -> {target}")

# pick cotizador-like
target = None
for name, t in sheets:
    if name and "cotiz" in name.lower():
        target = t
        print("USING", name, t)
        break
if target is None:
    target = sheets[0][1]
    print("USING FIRST", sheets[0])

if not target.startswith("xl/"):
    target = "xl/" + target.lstrip("/")

root = ET.fromstring(z.read(target))
wanted_row = 1098
# also header rows 4 and 5
headers = {4: {}, 5: {}}
row_cells = {}
for c in root.findall("m:sheetData/m:row/m:c", NS):
    ref = c.attrib.get("r")
    if not ref:
        continue
    col, row = col_row(ref)
    if row not in (4, 5, wanted_row):
        continue
    t = c.attrib.get("t")
    v = c.find("m:v", NS)
    f = c.find("m:f", NS)
    val = v.text if v is not None else None
    if t == "s" and val is not None:
        val = ss[int(val)]
    formula = f.text if f is not None else None
    if row in headers:
        headers[row][col] = val
    else:
        row_cells[col] = (val, formula)

print("\nROW 1098")
# print in column order for interesting range A-DH
interesting = []
for col, (val, formula) in row_cells.items():
    interesting.append((col_index(col), col, val, formula))
interesting.sort()
for _, col, val, formula in interesting:
    h4 = headers[4].get(col) or ""
    h5 = headers[5].get(col) or ""
    label = (str(h4) + " " + str(h5)).strip()
    if val is None and formula is None:
        continue
    print(f"{col}\t{label}\t{val}\t{formula or ''}")
