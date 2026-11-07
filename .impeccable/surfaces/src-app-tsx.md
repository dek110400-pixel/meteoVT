---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: the whole app (single map screen + station sheet + layers + favourites panel). Mode: Operate.
Audience/job: the owner on a phone outdoors, checking webcam + live readings before/during a mountain outing or wind session.
Constraints: light ground (sunlight), touch targets >= 44px, values always printed next to colour, missing = "n.d.", stale (>1h) = grey.

## Direction contract
THESIS: The weather map printed as a 1:25.000 hiking map: readings are map symbols with their numbers lettered beside them, like spot heights. Refuses the default of coloured blobs and floating rounded white popups.
OWN-WORLD: OpenTopoMap topographic base (contours, hillshade). Paper #fbfaf6, ink #2b2118, contour brown #6b4a2b, trail red #c8322a for station symbols and selection, water blue #2f6fa8, forest green #3d7a46, stale grey #9b8f80. Barlow Condensed for map lettering, labels and values; Barlow for body. 2px ink rules frame every panel like a map legend box (cartiglio); 1px hairlines inside; no shadows, no rounded cards.
STORY: Open the map, see the whole region lettered with live values, tap a station, the legend box rises with the nearest webcam first, then readings; star it; come back later and it is in the list.
FIRST VIEWPORT: Full-screen topo map. Top strip: title left, data time + refresh button right, 2px ink rule below. Station symbols = red diamonds with value lettering; clusters = paper roundels with ink count. Tapping opens a bottom sheet (phone) / left panel (desktop): webcam image, NAME in condensed caps, quota and province, a hairline grid of readings. Attribution bottom-right.
FORM: Carta escursionistica, #1 on my ordered list (IMPECCABLE’S PICK), seed:0f2301ac40b298dc. Signature move: values lettered on the map beside each symbol like spot heights.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
