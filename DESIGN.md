---
name: Meteo Veneto · Trentino
description: Live station readings and webcams lettered onto a topographic hiking map.
colors:
  paper: "#fbfaf6"
  paper-2: "#f1ede3"
  ink: "#2b2118"
  ink-2: "#5e5246"
  contour: "#6b4a2b"
  trail: "#c8322a"
  water: "#2f6fa8"
  forest: "#3d7a46"
  stale: "#716659"
  stale-fill: "#cfc7bb"
  snow-fill: "rgba(159, 205, 233, 0.85)"
  hairline: "rgba(43, 33, 24, 0.28)"
typography:
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.02em"
  wordmark:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  value-hero:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  value:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
    fontFeature: "tnum"
  map-lettering:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  meta:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.3
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.06em"
  list-name:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.02em"
  caption:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: "tnum"
  micro:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
  fine-print:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
  roundel: "50%"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  topbar: "56px"
  target: "44px"
components:
  topbar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
    height: "56px"
    padding: "0 6px 0 14px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "44px"
  icon-button-hover:
    backgroundColor: "{colors.paper-2}"
  icon-button-active:
    backgroundColor: "{colors.stale-fill}"
  layer-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 6px"
  layer-tab-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  legend-box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    width: "300px"
  station-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    width: "380px"
  reading-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.value}"
    padding: "8px 14px 10px"
  cluster-roundel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.roundel}"
    size: "40px"
  cluster-roundel-cam:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.roundel}"
    size: "30px"
  favourite-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "64px"
    padding: "10px 4px 10px 14px"
  notice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.trail}"
    typography: "{typography.meta}"
    padding: "6px 12px"
---

# Design System: Meteo Veneto · Trentino

## Overview

**Creative North Star: "The Carta Escursionistica"**

The whole app is a 1:25.000 hiking map that happens to be live. Readings are cartographic symbols with their numbers lettered beside them like spot heights; every panel is a legend box (cartiglio) framed by a 2px ink rule on warm paper. The OpenTopoMap base is printed a step back (50% opacity, 60% saturation) so the weather reads first. Density is map-like: tight condensed lettering, hairline grids, no decoration that is not also information.

It is built for one thumb in direct sunlight: light paper ground, near-black brown ink, 44px targets, and colour that never carries a value alone. It rejects coloured blobs and floating rounded white popups.

**Key Characteristics:**
- Paper, ink and trail red; colour scales only inside map symbols and legends.
- Values lettered beside symbols with a paper halo, like spot heights.
- 2px ink rules frame panels; 1px hairlines divide inside them.
- Flat: no drop shadows, no rounded cards, square corners on every container.
- Stale data (>1 h) is grey, missing data is "n.d.", never estimated.

## Colors

A printed-map palette: warm paper, brown-black ink, and the conventional map colours for trail, water and forest.

### Primary
- **Trail Red** (`trail`): station symbols, star when favourited, favourites count badge, the notice outline and text, text selection, selected-webcam outline. The map's one loud colour.

### Secondary
- **Lake Blue** (`water`): focus ring (3px outline), links, wind arrow in readings and favourites, snow-circle border.

### Tertiary
- **Forest Green** (`forest`): reserved map colour from the contract; defined in `:root` but not yet used by any component.

### Neutral
- **Map Paper** (`paper`): app ground, every panel, halo behind map lettering.
- **Shaded Paper** (`paper-2`): hover fill, map loading ground, webcam frame placeholder, scrollbar track.
- **Map Ink** (`ink`): text, 2px frame rules, selected tab fill, cluster count.
- **Faded Ink** (`ink-2`): secondary text, labels, unit suffixes, webcam symbol.
- **Contour Brown** (`contour`): station meta line (altitude · province · network).
- **Weathered Grey** (`stale`): every stale or missing value, stale symbols. Darkened from the contract's #9b8f80 to keep 4.5:1 on paper.
- **Worn Paper** (`stale-fill`): pressed state of icon buttons.
- **Hairline** (`hairline`): 1px dividers inside panels, reading-grid gutters.

### Data scales (src/scales.ts)
- **Temperature** (continuous, -20 to 40 °C): `#24317a` · `#2f6fb8` · `#9fcde9` · `#f1e39a` · `#f0a24f` · `#c8322a` · `#6e1712`, linearly interpolated, clamped at the ends.
- **Wind classes** (km/h): <10 `#7c9a74` · 10–20 `#2f6fa8` · 20–40 `#d99a1e` · 40–60 `#c8322a` · >60 `#6b2a7a`. Arrow length also scales (14–56px), so shape carries intensity without colour.
- **Snow**: `snow-fill` circle with water border; radius grows with the square root of depth (5–32px).

**The Value-Beside-Colour Rule.** A colour never stands alone: every coloured symbol has its number lettered next to it, and every legend's last tick carries the unit ("40 °C", "> 60 km/h", "150 cm").

**The Grey Means Old Rule.** Weathered Grey is the only stale signal: symbols turn paper-filled with a grey outline, values and timestamps turn grey. Never use grey for decoration.

## Typography

**Display / Lettering Font:** Barlow Condensed 500/700 (with Arial Narrow)
**Body Font:** Barlow 400/600 (with system-ui)

**Character:** Condensed grotesque lettering as on a map sheet: uppercase names, tabular figures, tight leading. Barlow regular is kept for the few running sentences.

### Hierarchy
- **Value hero** (700, 44px, 1): the temperature in the station sheet.
- **Title** (700, 26px, 1.05, uppercase, 0.02em): station name in the sheet; 22px for the favourites heading, 18px for favourite rows.
- **Value** (700, 24px, 1.15, tabular): reading-grid values; units in 15px 500 Faded Ink.
- **Wordmark** (700, 20px, uppercase, 0.04em): top bar title; 18px under 420px.
- **Map lettering** (700, 16px, tabular, paper halo): values beside symbols and clusters; 18px when selected.
- **Meta** (500, 15–16px, 1.3): times, quota/province, notices, captions.
- **Label** (500, 14px, uppercase, 0.06em): reading-grid labels; legend ticks 13px.
- **Body** (400, 16px, 1.4, max 36ch): empty states only.

**The Tabular Figures Rule.** Every number uses `font-variant-numeric: tabular-nums` so live values do not jitter on refresh.

## Layout

Full-bleed map under a fixed 56px top bar (plus safe-area inset). Chrome floats on the map as framed boxes anchored 10–12px from the edges:
- **Layer box** top-left, `min(300px, 100% - 76px)` wide; on desktop it shifts to 404px from the left so it clears the sheet.
- **Station sheet**: phone = bottom sheet, full width, max 62dvh, 2px rule on top; ≥760px = left panel, 380px, framed on all sides.
- **Favourites**: right panel, full width on phone, 360px on desktop; zoom buttons shift left (370px) when it is open.
- **Zoom** bottom-right, above the attribution.

Breakpoints: 420px (compact top bar, smaller tabs), 760px (panel layout). Inner padding is 14px horizontal throughout; vertical rhythm runs 6/8/10/12px. Touch targets are never under 44px; favourite rows are 64px. On phone, the legend folds to tabs and symbols while a sheet is open. Cluster labels that would run past the map's right edge are hidden.

## Elevation & Depth

Flat. No drop shadows anywhere. Depth comes from framing (2px ink rule), the paper ground over a faded base map, and the map-lettering halo (a 1.5px paper `text-shadow` ring), which is a cartographic knockout, not elevation. The only `box-shadow` is a 3px ink ring around temperature symbols, used as a stroke.

**The Legend-Box Rule.** Anything that sits on the map is a paper box with a 2px ink rule and square corners. If it needs to feel "above", make the rule heavier, never add a shadow.

## Shapes

Square corners on every container, button and panel. Circles and rounded forms exist only as map symbols: station diamond (12px square rotated 45°, 16px selected), cluster roundel (40px circle, 2px ink border), webcam cluster (30px ink circle), snow circle, no-data dot (6px), favourites count pill (9px radius), webcam camera glyph (2px radius). Dividers are 1px hairlines; frames are 2px ink.

## Components

### Top bar
Paper strip, 2px ink rule below. Wordmark left; data time (Meta, time in ink bold) and icon buttons right.

### Icon buttons
44px square, transparent, square corners, lucide icons. Hover Shaded Paper, pressed Worn Paper, disabled Weathered Grey with spinning refresh icon (stopped under reduced motion). Favourites toggle inverts to ink with paper icon when the panel is open; count badge in Trail Red.

### Layer tabs
Three equal tabs in the legend box, 44px, Condensed 700 15px uppercase, hairline separators. Off: Faded Ink on paper; on: paper on ink. Radiogroup semantics.

### Legend
Under the tabs: title in Meta ink, 10px gradient bar with 1px ink border or symbol samples, ticks at 13px, and a hairline-topped footer keying stations, webcams, stale and data count.

### Station sheet (signature)
Rises 24px over 200ms (`cubic-bezier(0.16, 1, 0.3, 1)`, off under reduced motion). Order: webcam image (16:9, or `min(30dvh, 56vw)` on phone) with caption, then name in Title, contour-brown meta, last-data time, then a two-column hairline reading grid between a 2px rule and a hairline. Temperature spans the full row with the 44px value. Missing values print "n.d." in 500 grey.

### Map symbols
Station diamond in Trail Red (or temperature fill with ink ring on the temperature layer) with 2px paper outline; wind = coloured arrow with paper casing pointing where the wind goes; snow = sized blue circle. Selected: larger symbol, ink outline, underlined lettering. Stale: paper fill, grey outline, grey lettering.

### Favourites list
Rows 64px with hairline below: optional 88×50 webcam thumb (1px ink border), uppercase name, contour meta, right-aligned values (temperature 26px).

### Notice
Centered above the bottom, paper box with 1px Trail Red border and red Meta text. Used for a failed source.

## Do's and Don'ts

### Do:
- **Do** frame every floating panel with a 2px ink rule on paper, square corners.
- **Do** letter the number beside every coloured symbol, with the paper halo.
- **Do** use Barlow Condensed with tabular figures for every value, label and name.
- **Do** turn stale data Weathered Grey (#716659) and print missing data as "n.d.".
- **Do** keep targets at 44px minimum and use the Lake Blue 3px focus outline.
- **Do** keep the base map faded (opacity 0.5, saturate 0.6) so readings lead.

### Don't:
- **Don't** add drop shadows or rounded cards; rounding is for map symbols only.
- **Don't** convey a value by colour alone or by hover alone.
- **Don't** use Trail Red for anything except stations, favourites, selection and failure notices.
- **Don't** use grey as decoration; it means "older than an hour".
- **Don't** estimate or interpolate a missing reading.
