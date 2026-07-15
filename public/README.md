# North Brand Pack

Approved identity: the North athletic footprint with `NORTH` cut through the forefoot.

## Brand colours

| Token | Hex | Use |
| --- | --- | --- |
| Deep charcoal-teal | `#193136` | Primary logo, dark surfaces, dark app icon |
| Warm off-white | `#F3EDE2` | Light surfaces and reversed logo |
| Accent teal | `#168B8C` | Focus, outlines and active UI states—not the core one-colour mark |
| Monochrome black | `#161A1B` | Single-colour production |

## Which asset to use

- `footprint-stamp-*`: large branding, completion moments, Journey, print and merchandise.
- `footprint-clean-*`: navigation, headers and any small digital placement.
- `app-icons/`: installable app, Apple touch and PWA assets. The operating system applies its own icon mask.
- `favicons/`: browser tabs and pinned shortcuts.
- `lockup-horizontal-*`: website headers, email and wide placements.
- `lockup-stacked-*`: splash/loading screens and narrow placements.
- `footer/you-showed-up-*`: the signature at the bottom of North pages.
- `social/`: Telegram, X and other profile avatars.
- `svg/`: scalable masters. Prefer these whenever the platform supports SVG.
- `transparent-background/`: standalone marks with a true alpha background. This is the easiest folder to use when placing North over an arbitrary UI colour.

## Transparent-background assets

Every standalone mark is supplied in teal, pure white, warm off-white and black as both SVG and PNG:

- Clean footprint
- Textured footprint stamp
- Lowercase `north` wordmark
- Horizontal footprint + wordmark lockup
- Stacked footprint + wordmark lockup
- Footprint + `You showed up.` signature

These files contain no coloured canvas, square or holding shape. Only the visible logo pixels have opacity. App-store, Apple Touch and PWA icons are the exception because those platforms require a complete icon canvas.

## Usage rules

1. Keep the footprint vertical or at its existing slight natural lean. Do not rotate it randomly.
2. Keep enough clear space around the mark—at least the width of the `N` in `NORTH`.
3. Do not recolour individual tread blocks.
4. Use the textured stamp only when it has room to breathe. Use the clean version at small sizes.
5. Do not place the mark on a busy photograph without a solid or softly translucent holding surface.
6. Keep `You showed up.` exactly punctuated and sentence-cased.
7. The primary logo is one colour. Accent teal belongs to UI states and supporting lines.

## Loading-screen direction

- First launch: several prints travel north; earlier prints fade; the final print remains and the `north` wordmark resolves below it.
- Everyday launch: one heel-to-toe stamp, then the wordmark fades in. Keep the full sequence under one second.
- In-app loading: reveal tread sections from heel to toe, resolving `NORTH` last.

## Notes

The supplied SVGs are vector traces of the approved stamped artwork. Preserve `source/` if future refinements are required.
