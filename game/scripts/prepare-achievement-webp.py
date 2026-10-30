"""Produce independent, cacheable WebP images from the cinematic art supplied for each milestone.

Run manually after changing the source sheet; the generated files are checked into Git.
Requires Pillow: python3 -m pip install Pillow
"""
from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "game" / "artwork-sources" / "milestone-scenes-hd.webp"
# The source art is temporarily stored under public/assets/achievements before extraction.
if not SOURCE.exists():
    SOURCE = ROOT / "game" / "public" / "assets" / "achievements" / "milestone-scenes-hd.webp"
TARGET = ROOT / "game" / "public" / "assets" / "achievements"
NAMES = (
    "first-room", "builder", "first-dig", "excavator", "first-upgrade",
    "upgrader", "upper-floor", "skyline", "first-cycles",
    "steady-shelter", "diverse-shelter",
)
SIZES = (360, 540)

def main() -> None:
    with Image.open(SOURCE) as sheet:
        width, height = sheet.size
        assert width == 540 and height == len(NAMES) * 180, (
            f"Unexpected sheet dimensions: {width} x {height}"
        )
        colors = sheet.convert("RGB")
    TARGET.mkdir(parents=True, exist_ok=True)
    unique_images = set()
    total_bytes = 0
    for index, name in enumerate(NAMES):
        image = colors.crop((0, index * 180, 540, (index + 1) * 180))
        fingerprint = sha256(image.tobytes()).hexdigest()
        if fingerprint in unique_images:
            raise RuntimeError(f"Duplicate illustration for achievement {name}")
        unique_images.add(fingerprint)
        for width in SIZES:
            resized = image if width == 540 else image.resize(
                (width, width // 3), Image.Resampling.LANCZOS
            )
            destination = TARGET / f"{name}-{width}.webp"
            resized.save(destination, format="WEBP", quality=80, method=6)
            total_bytes += destination.stat().st_size
    assert len(unique_images) == 11
    print(f"Created {len(NAMES) * len(SIZES)} individual full-color WebP files; "
          f"{total_bytes / 1024:.1f} KiB total.")

if __name__ == "__main__":
    main()
