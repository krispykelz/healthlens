# Regenerates national-data.js from CDC USCS BYSITE.TXT. Usage: python3 build_national_data.py BYSITE.TXT
import sys, json, pandas as pd
df = pd.read_csv(sys.argv[1], sep="|", dtype=str)
df = df[(df.RACE == "All Races") & df.YEAR.str.fullmatch(r"\d{4}")].copy()
df["COUNT"] = pd.to_numeric(df.COUNT, errors="coerce")
FIRST, LAST = 1999, 2023
C = {"breast":("Female Breast","Female"),"colorectal":("Colon and Rectum","Male and Female"),
     "lung":("Lung and Bronchus","Male and Female"),"prostate":("Prostate","Male")}
yrs = list(range(FIRST, LAST+1)); out = {"years":yrs, "c":{}}
for k,(site,sex) in C.items():
    out["c"][k] = {}
    for ev,key in (("Incidence","inc"),("Mortality","mort")):
        x = df[(df.SITE==site)&(df.SEX==sex)&(df.EVENT_TYPE==ev)]
        m = dict(zip(x.YEAR.astype(int), x.COUNT))
        out["c"][k][key] = [None if m.get(y) is None or pd.isna(m.get(y)) else int(m[y]) for y in yrs]
open("national-data.js","w").write("window.HL_NATIONAL="+json.dumps(out,separators=(",",":"))+";")
print({k:(v["inc"][-2],v["mort"][-1]) for k,v in out["c"].items()})
