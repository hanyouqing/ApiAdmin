import os
import re
from pathlib import Path

version = os.environ["VERSION"]
root = Path(__file__).resolve().parents[2]

chart = root / "Helm/apiadmin/Chart.yaml"
text = chart.read_text()
text = re.sub(r"(?m)^version:.*", f"version: {version}", text, count=1)
text = re.sub(r'(?m)^appVersion:.*', f'appVersion: "{version}"', text, count=1)
text, image_count = re.subn(
    r"(?m)^(\s+image:\s+\S*apiadmin):.*$",
    rf"\1:{version}",
    text,
)
if image_count != 2:
    raise SystemExit(f"expected to update 2 Chart.yaml images, updated {image_count}")
chart.write_text(text)

values_files = [
    root / "Helm/apiadmin/values.yaml",
    root / "Helm/apiadmin/values-examples.yaml",
]
for values in values_files:
    src = values.read_text()
    updated, count = re.subn(
        r"(?m)^([ \t]*tag:\s*).*([ \t]# apiadmin-image-tag\s*)$",
        rf'\1"{version}"\2',
        src,
    )
    if count != 1:
        raise SystemExit(f"{values.name}: expected to update 1 image tag, updated {count}")
    values.write_text(updated)

print(f"chart version {version}")
