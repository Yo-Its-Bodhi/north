#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/source"
TEAL="#193136"
OFFWHITE="#F3EDE2"
ACCENT="#168B8C"
BLACK="#161A1B"

mask_to_png() {
  local mask="$1" color="$2" out="$3"
  local geometry
  geometry="$(identify -format '%wx%h' "$mask")"
  convert -size "$geometry" xc:"$color" \
    "$mask" -alpha off -compose CopyOpacity -composite "$out"
}

mkdir -p "$ROOT"/{svg,png/transparent,png/light,png/dark,app-icons,favicons,social,email,footer,preview}

# Rebuild the footer signature from the current footprint master so logo fixes
# automatically propagate to `You showed up.` too.
convert "$SRC/footprint-mask-clean.png" -resize x106 \
  "$SRC/tagline-mask.png" -background black -gravity center +append \
  -trim +repage -bordercolor black -border 7 "$SRC/footer-mask.png"

# Transparent master marks.
mask_to_png "$SRC/footprint-mask-textured.png" "$TEAL" "$ROOT/png/transparent/footprint-stamp-teal.png"
mask_to_png "$SRC/footprint-mask-textured.png" "$OFFWHITE" "$ROOT/png/transparent/footprint-stamp-offwhite.png"
mask_to_png "$SRC/footprint-mask-textured.png" "$BLACK" "$ROOT/png/transparent/footprint-stamp-black.png"
mask_to_png "$SRC/footprint-mask-clean.png" "$TEAL" "$ROOT/png/transparent/footprint-clean-teal.png"
mask_to_png "$SRC/footprint-mask-clean.png" "$OFFWHITE" "$ROOT/png/transparent/footprint-clean-offwhite.png"
mask_to_png "$SRC/footprint-mask-clean.png" "$BLACK" "$ROOT/png/transparent/footprint-clean-black.png"
mask_to_png "$SRC/wordmark-mask.png" "$TEAL" "$ROOT/png/transparent/wordmark-north-teal.png"
mask_to_png "$SRC/wordmark-mask.png" "$OFFWHITE" "$ROOT/png/transparent/wordmark-north-offwhite.png"
mask_to_png "$SRC/wordmark-mask.png" "$BLACK" "$ROOT/png/transparent/wordmark-north-black.png"
mask_to_png "$SRC/footer-mask.png" "$TEAL" "$ROOT/footer/you-showed-up-teal-transparent.png"
mask_to_png "$SRC/footer-mask.png" "$OFFWHITE" "$ROOT/footer/you-showed-up-offwhite-transparent.png"
mask_to_png "$SRC/footer-mask.png" "$BLACK" "$ROOT/footer/you-showed-up-black-transparent.png"

# Composite masks for vector tracing and raster lockups.
convert "$SRC/footprint-mask-clean.png" -resize x340 \
  \( "$SRC/wordmark-mask.png" -resize 700x -bordercolor black -border 70x0 \) \
  -background black -gravity center +append -trim +repage -bordercolor black -border 24 "$SRC/lockup-horizontal-mask.png"

convert "$SRC/footprint-mask-clean.png" -resize x720 \
  \( "$SRC/wordmark-mask.png" -resize 620x -bordercolor black -border 0x45 \) \
  -background black -gravity center -append -trim +repage -bordercolor black -border 30 "$SRC/lockup-stacked-mask.png"

mask_to_png "$SRC/lockup-horizontal-mask.png" "$TEAL" "$ROOT/png/transparent/lockup-horizontal-teal.png"
mask_to_png "$SRC/lockup-horizontal-mask.png" "$OFFWHITE" "$ROOT/png/transparent/lockup-horizontal-offwhite.png"
mask_to_png "$SRC/lockup-horizontal-mask.png" "$BLACK" "$ROOT/png/transparent/lockup-horizontal-black.png"
mask_to_png "$SRC/lockup-stacked-mask.png" "$TEAL" "$ROOT/png/transparent/lockup-stacked-teal.png"
mask_to_png "$SRC/lockup-stacked-mask.png" "$OFFWHITE" "$ROOT/png/transparent/lockup-stacked-offwhite.png"
mask_to_png "$SRC/lockup-stacked-mask.png" "$BLACK" "$ROOT/png/transparent/lockup-stacked-black.png"

# Light and dark background lockups.
convert -size 1600x600 xc:"$OFFWHITE" \
  \( "$ROOT/png/transparent/lockup-horizontal-teal.png" -resize 1250x \) -gravity center -composite \
  "$ROOT/png/light/lockup-horizontal-light.png"
convert -size 1600x600 xc:"$TEAL" \
  \( "$ROOT/png/transparent/lockup-horizontal-offwhite.png" -resize 1250x \) -gravity center -composite \
  "$ROOT/png/dark/lockup-horizontal-dark.png"
convert -size 1200x1500 xc:"$OFFWHITE" \
  \( "$ROOT/png/transparent/lockup-stacked-teal.png" -resize 900x1250 \) -gravity center -composite \
  "$ROOT/png/light/lockup-stacked-light.png"
convert -size 1200x1500 xc:"$TEAL" \
  \( "$ROOT/png/transparent/lockup-stacked-offwhite.png" -resize 900x1250 \) -gravity center -composite \
  "$ROOT/png/dark/lockup-stacked-dark.png"

# Footer signatures.
convert -size 1200x220 xc:"$OFFWHITE" \
  \( "$ROOT/footer/you-showed-up-teal-transparent.png" -resize 850x180 \) -gravity center -composite \
  "$ROOT/footer/you-showed-up-light.png"
convert -size 1200x220 xc:"$TEAL" \
  \( "$ROOT/footer/you-showed-up-offwhite-transparent.png" -resize 850x180 \) -gravity center -composite \
  "$ROOT/footer/you-showed-up-dark.png"

# App icon masters. OSes apply their own masks, so the source squares stay square.
convert -size 1024x1024 xc:"$OFFWHITE" \
  \( "$ROOT/png/transparent/footprint-clean-teal.png" -resize x850 \) -gravity center -composite \
  "$ROOT/app-icons/app-icon-light-1024.png"
convert -size 1024x1024 xc:"$TEAL" \
  \( "$ROOT/png/transparent/footprint-clean-offwhite.png" -resize x850 \) -gravity center -composite \
  "$ROOT/app-icons/app-icon-dark-1024.png"
convert -size 1024x1024 xc:"$TEAL" \
  \( "$ROOT/png/transparent/footprint-clean-offwhite.png" -resize x650 \) -gravity center -composite \
  "$ROOT/app-icons/app-icon-maskable-1024.png"

for size in 512 192; do
  convert "$ROOT/app-icons/app-icon-light-1024.png" -resize "${size}x${size}" "$ROOT/app-icons/pwa-icon-light-${size}.png"
  convert "$ROOT/app-icons/app-icon-dark-1024.png" -resize "${size}x${size}" "$ROOT/app-icons/pwa-icon-dark-${size}.png"
  convert "$ROOT/app-icons/app-icon-maskable-1024.png" -resize "${size}x${size}" "$ROOT/app-icons/pwa-maskable-${size}.png"
done
convert "$ROOT/app-icons/app-icon-light-1024.png" -resize 180x180 "$ROOT/app-icons/apple-touch-icon-180.png"

# Browser icons.
for size in 16 32 48; do
  convert -size "${size}x${size}" xc:"$OFFWHITE" \
    \( "$ROOT/png/transparent/footprint-clean-teal.png" -resize "x$((size-4))" \) -gravity center -composite \
    "$ROOT/favicons/favicon-${size}.png"
done
convert "$ROOT/favicons/favicon-16.png" "$ROOT/favicons/favicon-32.png" "$ROOT/favicons/favicon-48.png" "$ROOT/favicons/favicon.ico"

# Social avatars and email headers.
convert -size 1024x1024 xc:"$OFFWHITE" \
  \( "$ROOT/png/transparent/footprint-stamp-teal.png" -resize x820 \) -gravity center -composite \
  "$ROOT/social/social-avatar-light-1024.png"
convert -size 1024x1024 xc:"$TEAL" \
  \( "$ROOT/png/transparent/footprint-stamp-offwhite.png" -resize x820 \) -gravity center -composite \
  "$ROOT/social/social-avatar-dark-1024.png"
convert "$ROOT/social/social-avatar-light-1024.png" -resize 512x512 "$ROOT/social/social-avatar-light-512.png"
convert "$ROOT/social/social-avatar-dark-1024.png" -resize 512x512 "$ROOT/social/social-avatar-dark-512.png"
convert -size 1200x320 xc:"$OFFWHITE" \
  \( "$ROOT/png/transparent/lockup-horizontal-teal.png" -resize 950x \) -gravity center -composite \
  "$ROOT/email/email-header-light-1200x320.png"
convert -size 1200x320 xc:"$TEAL" \
  \( "$ROOT/png/transparent/lockup-horizontal-offwhite.png" -resize 950x \) -gravity center -composite \
  "$ROOT/email/email-header-dark-1200x320.png"

# Contact sheet for quick review.
convert \
  "$ROOT/app-icons/app-icon-light-1024.png" -resize 360x360 \
  "$ROOT/app-icons/app-icon-dark-1024.png" -resize 360x360 \
  "$ROOT/social/social-avatar-light-1024.png" -resize 360x360 \
  "$ROOT/social/social-avatar-dark-1024.png" -resize 360x360 \
  +append "$ROOT/preview/icons-row.png"
convert \
  "$ROOT/png/light/lockup-horizontal-light.png" -resize 720x \
  "$ROOT/png/dark/lockup-horizontal-dark.png" -resize 720x \
  -append "$ROOT/preview/lockups-row.png"
convert "$ROOT/preview/icons-row.png" "$ROOT/preview/lockups-row.png" -append "$ROOT/preview/north-brand-pack-preview.png"

echo "$ACCENT" > "$SRC/accent-teal.txt"
