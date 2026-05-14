"""Генератор data.js для Mini App: данные из prices.json + preparation.json."""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
prices = json.loads((ROOT / "data" / "prices.json").read_text(encoding="utf-8"))
prep = json.loads((ROOT / "data" / "preparation.json").read_text(encoding="utf-8"))

CAT_LABELS = {
    "consultation": "Консультация",
    "prevention": "Профилактика",
    "surgery": "Хирургия",
    "dental": "Стоматология",
    "diagnostics": "Диагностика",
    "lab": "Анализы",
    "fee": "Тариф",
}

services = []
for it in prices.get("items", []):
    if it.get("category") == "fee":
        continue   # ночной тариф клиенту в каталоге не нужен
    services.append({
        "id": it["id"],
        "name": it["name"],
        "category": it["category"],
        "categoryLabel": CAT_LABELS.get(it["category"], it["category"]),
        "species": it.get("species", []),
        "price": it.get("price", 0),
        "duration": it.get("duration_min", 30),
        "prepRef": it.get("preparation_ref"),
    })

prep_items = []
for it in prep.get("items", []):
    prep_items.append({
        "id": it["id"],
        "title": it["title"],
        "content": it.get("content", "").strip(),
        "species": it.get("species", []),
    })

out_path = ROOT / "webapp" / "data.js"
js = "// auto-generated from prices.json + preparation.json\n"
js += "window.VM_SERVICES = " + json.dumps(services, ensure_ascii=False, indent=2) + ";\n"
js += "window.VM_PREP = " + json.dumps(prep_items, ensure_ascii=False, indent=2) + ";\n"
out_path.write_text(js, encoding="utf-8")
print(f"OK: {out_path}, услуг {len(services)}, памяток {len(prep_items)}")
