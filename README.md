# riffraff

A super-quick tab scratchpad. Click notes on the neck → turn them into blocks →
assemble blocks into parts → parts into tracks → tracks into a song. No build
step, no dependencies, no color — just mono text and lines.

This was a good amount of work and tokens, please consider to: [buymeacoffee.com/SZ0KFIXKCt](buymeacoffee.com/SZ0KFIXKCt)

**[Open it →](https://themanro.github.io/riffraff/)**

## What it does
- **8-string guitar** and **5-string bass** necks — click frets to drop notes.
- Mark each note **plain / palm-mute / bend / harmonic**.
- Play a block as a **chord** (stacked) or a **sequence** (spread left→right).
- Note the **pickup**: selector (bridge / neck / both) + knob 1 / knob 2 (up / down).
- **Effects per part**, with a picker grounded in my actual rig.
- **Editable tunings** (presets + free text) for either instrument.
- **Save** (autosaves to the browser), **import / export `.json`**, **export `.txt`**
  (plain ASCII tab), and **print** (use the browser's *Save as PDF*).

## Structure
```
song
└─ track   (8-string guitar / 5-string bass · tuning)
   └─ part  (name · effects)
      └─ block  (the notes you clicked · chord|seq · pickup)
```

## Tab notation in the `.txt` export
```
       PM
e |------------------|
B |------------------|
G |--------5b--------|
D |--7--7--5---<12>--|   b = bend   <n> = harmonic
A |--5--5--3---------|   PM line   = palm mute
F#|------------------|
   1  2  3   4           numbers = block index → see the list below the tab
```

## Run locally
It's a static page — just open `index.html`, or:
```
python3 -m http.server   # then visit http://localhost:8000
```

## License
MIT
