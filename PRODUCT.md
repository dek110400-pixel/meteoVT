# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript + Leaflet (react-leaflet, leaflet.markercluster); Vercel Serverless Functions as proxy. Fixed by the user's brief.

## Users

One user: the owner, for personal use only (not public). Uses it for mountain outings/hiking and wind sports, where direction and gusts matter. Opens it mostly on a smartphone, outdoors: in the car, at a trailhead parking lot, at a hut — small screen, often in sunlight, one hand.

## Product Purpose

A single map of Veneto and Trentino that answers "what is it like up there right now?" by combining every official weather station (ARPAV, Meteotrentino) with nearby public webcams. Success: in a few seconds on a phone, the user sees the current image and the live readings for the place they're heading to, and can tell whether the data is fresh.

## Positioning

Official station networks of two regions plus webcams on one map, with the nearest webcam inside each station popup. Missing data is shown as missing, never estimated.

## Operating Context

- Checked just before or during an outing, often with weak mobile signal.
- When a popup opens, the **webcam image comes first**; numbers come second.
- Within the numbers, wind (speed, gust, direction) matters as much as temperature.
- Data older than 1 hour must be visibly marked (grey).

## Capabilities and Constraints

- Sources: ARPAV (233 stations, 30-min data, no gusts), Meteotrentino (112 stations, 15-min data), webcams from Windy (free key) + ARPAV webcam list. See DATA_SOURCES.md.
- Layers: temperature, wind arrows, snow depth; always-visible legend for the active layer.
- Favourites in localStorage with a side panel; manual refresh + auto refresh every 10 min.
- Source attributions (CC BY 4.0 ARPAV / Meteotrentino, Windy link) must be visible on the map.
- If a source fails the app keeps working with the others and shows a discreet notice.
- Missing value → "n.d.", never estimated.

## Evidence on Hand

Live data only; no logos, brand assets or copy exist. Do not fabricate any.

## Product Principles

1. The image tells the truth first: the webcam leads, numbers confirm.
2. Freshness is part of the data: every reading shows its age, stale ones look stale.
3. Readable in the sun with one thumb: large targets, high contrast, no hover-only information.
4. Never invent a number: absent stays absent.
5. Map first: chrome stays out of the way of the terrain.

## Accessibility & Inclusion

Outdoor phone use: high contrast in bright light, touch targets ≥ 44 px, no information conveyed by colour alone (values are always printed next to the colour scales).
