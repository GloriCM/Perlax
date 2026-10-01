import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(r"E:\Semillas\Descargas\Presupuesto.xlsx")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
z = zipfile.ZipFile(path)
ss = []
if "xl/sharedStrings.xml" in z.namelist():
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("m:si", NS):
        ss.append("".join((t.text or "") for t in si.findall(".//m:t", NS)))

wb = ET.fromstring(z.read("xl/workbook.xml"))
rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
rid_to_target = {rel.attrib.get("Id"): rel.attrib.get("Target") for rel in rels}

def cell_val(c):
    t = c.attrib.get("t")
    v = c.find("m:v", NS)
    if v is None or v.text is None:
        return ""
    if t == "s":
        return ss[int(v.text)]
    return v.text

for sh in wb.findall("m:sheets/m:sheet", NS):
    name = sh.attrib.get("name")
    rid = sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    target = rid_to_target.get(rid)
    if not target.startswith("xl/"):
        target = "xl/" + target.lstrip("/")
    root = ET.fromstring(z.read(target))
    rows = []
    for row in root.findall("m:sheetData/m:row", NS):
        r = int(row.attrib.get("r", "0"))
        if r > 25:
            break
        cells = []
        for c in row.findall("m:c", NS):
            ref = c.attrib.get("r", "")
            val = cell_val(c)
            if val:
                cells.append(f"{ref}={val}")
        if cells:
            rows.append(f"  r{r}: " + " | ".join(cells[:12]))
    print(f"\n=== {name} ===")
    print("\n".join(rows[:18]))
