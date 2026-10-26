# Regenerates state-data.js from CDC USCS BYAREA.TXT. Usage: python3 build_state_data.py BYAREA.TXT
import sys, json, pandas as pd
FIRST, LAST = 1999, 2023   # years where BOTH incidence and mortality exist. (Mortality also has 2024.)
df = pd.read_csv(sys.argv[1], sep="|", dtype=str)
df = df[df.RACE == "All Races"].copy()
df = df[df.YEAR.str.fullmatch(r"\d{4}")]
df = df[(df.YEAR.astype(int) >= FIRST) & (df.YEAR.astype(int) <= LAST)]
for c in ["AGE_ADJUSTED_RATE","AGE_ADJUSTED_CI_LOWER","AGE_ADJUSTED_CI_UPPER","COUNT","POPULATION"]:
    df[c] = pd.to_numeric(df[c], errors="coerce")   # '~' (suppressed) -> NaN -> null
STATES = {"Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"}
df = df[df.AREA.isin(STATES)]
ALL = "All Cancer Sites Combined"
SITES = {"Female Breast":"Female","Prostate":"Male","Lung and Bronchus":"Male and Female","Colon and Rectum":"Male and Female",
 "Melanomas of the Skin":"Male and Female","Urinary Bladder":"Male and Female","Non-Hodgkin Lymphoma":"Male and Female",
 "Kidney and Renal Pelvis":"Male and Female","Corpus and Uterus, NOS":"Female","Thyroid":"Male and Female","Pancreas":"Male and Female",
 "Leukemias":"Male and Female","Liver and Intrahepatic Bile Duct":"Male and Female"}
LABEL = {"Female Breast":"Breast (female)","Prostate":"Prostate","Lung and Bronchus":"Lung & bronchus","Colon and Rectum":"Colorectal",
 "Melanomas of the Skin":"Melanoma of the skin","Urinary Bladder":"Bladder","Non-Hodgkin Lymphoma":"Non-Hodgkin lymphoma",
 "Kidney and Renal Pelvis":"Kidney","Corpus and Uterus, NOS":"Uterine (corpus)","Thyroid":"Thyroid","Pancreas":"Pancreas",
 "Leukemias":"Leukemia","Liver and Intrahepatic Bile Duct":"Liver"}
def r(v): return None if pd.isna(v) else round(float(v), 1)
def i(v): return None if pd.isna(v) else int(v)
L = {}
for t in df.itertuples(index=False):
    L[(t.AREA, t.EVENT_TYPE, int(t.YEAR), t.SITE, t.SEX)] = t
years = list(range(FIRST, LAST+1))
out = {"years":years, "sites":[LABEL[s] for s in SITES], "states":{}}
for st, ab in STATES.items():
    d = {"ab":ab, "y":{}, "trend":{"inc":[], "mort":[]}}
    for y in years:
        rec = {}
        for k, ev in (("inc","Incidence"),("mort","Mortality")):
            t = L.get((st, ev, y, ALL, "Male and Female"))
            rec[k] = None if t is None or pd.isna(t.AGE_ADJUSTED_RATE) else [r(t.AGE_ADJUSTED_RATE), r(t.AGE_ADJUSTED_CI_LOWER), r(t.AGE_ADJUSTED_CI_UPPER), i(t.COUNT), i(t.POPULATION)]
            d["trend"][k].append(None if rec[k] is None else rec[k][0])
        rec["s"] = []
        for s, sex in SITES.items():
            a, b = L.get((st,"Incidence",y,s,sex)), L.get((st,"Mortality",y,s,sex))
            rec["s"].append([i(a.COUNT) if a else None, i(b.COUNT) if b else None])
        d["y"][str(y)] = rec
    out["states"][st] = d
open("state-data.js","w").write("window.HL_STATE_DATA="+json.dumps(out,separators=(",",":"))+";")
print("states:",len(out["states"]),"years:",years[0],"-",years[-1])
