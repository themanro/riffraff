/* riffraff — super quick tab scratchpad
   model: song > track > part > block ; block = notes you clicked on the neck */
"use strict";

/* ---------- config ---------- */
const INSTRUMENTS = {
  guitar8: {
    label: "8-string guitar",
    default: ["F#","B","E","A","D","G","B","E"],          // low -> high
    presets: {
      "Standard F#": ["F#","B","E","A","D","G","B","E"],
      "Drop E":      ["E","B","E","A","D","G","B","E"],
      "E std (8)":   ["E","A","D","G","C","F","A","D"],
    },
  },
  bass5: {
    label: "5-string bass",
    default: ["B","E","A","D","G"],                        // low -> high
    presets: {
      "Standard B": ["B","E","A","D","G"],
      "Drop A":     ["A","E","A","D","G"],
      "E std (5)":  ["E","A","D","G","C"],
    },
  },
};

// effects picker, grounded in the studio-brain rig.
// Headrush rigs mirror devices/headrush-flex-prime.md in studio-brain (68 presets).
// `prefix` is prepended to the value that lands in the part's effects field.
const EFFECTS = [
  { group: "Pedals & outboard", items: [
    "DigiTech XP-100 (Whammy/Wah)",
    "Korn pedal (dist/fuzz)",
    "Chase Bliss Mood MkII",
    "Chase Bliss Ottobit Jr",
    "Line 6 DL4 MkII",
    "Zoom MS-70CDR",
    "DOD Death Metal",
  ]},
  { group: "Headrush rigs — @ (custom)", prefix: "HR ", items: [
    "BAS HG v1","BAS v1","BAS v2","BAS v3",
    "CLN Haunted Reverb (equation)",
    "DRN E-Bow PC5 (black hole)","DRN EBOW FX v2","DRN Swell Grains PC6 (departing saturn)","DRN Tape Chello PC3 (before the noise)",
    "DRT KP PC8","DRT-CLN PC1 (v3)",
    "FX Broken Radio (Black Hole)","FX Synth Seq PC7 (Saturn)","FX Tape Splice PC4 (Saturn)",
    "MEL Cathedral bells (black hole)","MEL Postrev PC2",
    "RTM KP v1","RTM KP v2","RTM KP v3","RTM KP v4","RTM KP v6",
    "RTM v3","RTM v4","RTM v5","RTM v6","RTM v7",
    "RTM-L Mesa v3","RTM-L Mesa v4","RTM-L Mesa v5",
    "RTM-L v3","RTM-L v4",
    "RTM-R v2",
    "Drumbrute",
  ]},
  { group: "Headrush [LAB] presets", prefix: "HR LAB ", items: [
    "80s synth","Acoustic","Amb Dark Drone","Ambient delay seq","Ambient Wall","BAS Darkglasses",
    "Bubbly bath","Delay-lay-lay","DRN Down-Ambient Swells","DRN Super Saw","Fairy Dust","FX Drift",
    "FX Electrogoat Bleech","FX Electrolamb Bleech","FX Electrosheep Bleech","FX Hail Nightmare","FX Red Alert",
    "FX Security Breach","Guitars In Disguise","Md2","MEL Stutter","Organ Synth","phased delay","Prime Synth",
    "Pure Ambient","SNTH Hologram","SNTH Industrial","SNTH Landing","SNTH Lasers","SNTH Rhythm",
    "Spaghetti Western","SYNTH Soviet","Synthy thunder","Tap dance","Warm Distant Echoes",
  ]},
  { group: "Zoom ZDL customs", items: [
    "ZDL: Microloom","ZDL: Flower","ZDL: Shatter","ZDL: Arrakis","ZDL: Corrupt",
    "ZDL: Klang","ZDL: GenLoss","ZDL: Scorch","ZDL: Howl",
  ]},
];

const MAX_FRET = 24;
const KEY = "riffraff.v1";

/* ---------- state ---------- */
let DB = load() || { songs: [], activeSongId: null };
let ui = {
  trackId: null,
  partId: null,
  picker: { mode: "chord", notes: [], activeNote: null, pickup: { k1:"", k2:"", sw:"" } },
};

const app = document.getElementById("app");
const fileInput = document.getElementById("file");

/* ---------- helpers ---------- */
let _seq = 0;
function uid(){ _seq++; return "i" + Date.now().toString(36) + _seq.toString(36) + Math.floor(Math.random()*1e6).toString(36); }
function load(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch(e){ return null; } }
function persist(){ try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch(e){} }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function slug(s){ return (String(s||"song").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")) || "song"; }

function currentSong(){ return DB.songs.find(s => s.id === DB.activeSongId); }
function currentTrack(){ const s = currentSong(); return s ? s.tracks.find(t => t.id === ui.trackId) : null; }
function currentPart(){ const t = currentTrack(); return t ? t.parts.find(p => p.id === ui.partId) : null; }
function findPart(id){ const t = currentTrack(); return t ? t.parts.find(p => p.id === id) : null; }

function newPart(name){ return { id: uid(), name: name || "Part", effects: "", blocks: [] }; }
function newTrack(inst, name){
  return { id: uid(), name: name || (inst==="bass5" ? "Bass" : "Gtr"), instrument: inst,
           tuning: [...INSTRUMENTS[inst].default], parts: [ newPart("Part 1") ] };
}
function newSong(){ const t = newTrack("guitar8","Gtr 1"); return { id: uid(), name:"", artist:"", tracks:[t] }; }

function ensureValid(){
  if (!DB.songs.length) DB.songs = [ newSong() ];
  if (!DB.songs.some(s => s.id === DB.activeSongId)) DB.activeSongId = DB.songs[0].id;
  const s = currentSong();
  if (!s.tracks.some(t => t.id === ui.trackId)) ui.trackId = s.tracks[0] ? s.tracks[0].id : null;
  const t = currentTrack();
  ui.partId = t && t.parts.some(p => p.id === ui.partId) ? ui.partId : (t && t.parts[0] ? t.parts[0].id : null);
}

/* ---------- tab rendering (shared by screen + .txt export) ---------- */
function cellText(n){
  const f = String(n.fret);
  if (n.tech === "bend") return f + "b";
  if (n.tech === "harm") return "<" + f + ">";
  return f;                       // plain or palm-muted (PM shown on its own line)
}
function buildEvents(part){
  const events = [];
  part.blocks.forEach((b, bi) => {
    const evs = b.mode === "chord" ? [b.notes] : b.notes.map(n => [n]);
    evs.forEach((notes, ei) => events.push({ notes, block: b, bi, start: ei === 0 }));
  });
  return events;
}
function pickupText(p){
  if (!p) return "";
  const a = [];
  if (p.sw) a.push(p.sw);
  if (p.k1 === "up") a.push("k1↑"); else if (p.k1 === "down") a.push("k1↓");
  if (p.k2 === "up") a.push("k2↑"); else if (p.k2 === "down") a.push("k2↓");
  return a.join(" ");
}
function legendForPart(part){
  return part.blocks.map((b, i) => {
    const bits = [ b.mode === "chord" ? "chord" : "seq" ];
    const pu = pickupText(b.pickup);
    if (pu) bits.push(pu);
    return (i+1) + ") " + bits.join(" · ");
  });
}
function tabTextForPart(track, part){
  const tuning = track.tuning, n = tuning.length;
  const events = buildEvents(part);
  let width = 1;
  events.forEach(ev => {
    ev.cells = {};
    ev.notes.forEach(nt => { const c = cellText(nt); ev.cells[nt.string] = c; if (c.length > width) width = c.length; });
  });
  const labelW = Math.max(1, ...tuning.map(s => s.length));
  const out = [];

  // palm-mute line (only if needed)
  if (events.some(ev => ev.notes.some(nt => nt.tech === "pm"))){
    let line = " ".repeat(labelW + 1);
    events.forEach(ev => {
      const has = ev.notes.some(nt => nt.tech === "pm");
      line += " " + (has ? "PM".padEnd(width," ") : " ".repeat(width));
    });
    out.push(line.replace(/\s+$/,""));
  }

  // staff (high string on top)
  for (let si = n - 1; si >= 0; si--){
    let row = tuning[si].padStart(labelW," ") + "|";
    events.forEach(ev => {
      const c = ev.cells[si];
      row += "-" + (c ? c.padEnd(width,"-") : "-".repeat(width));
    });
    row += "-|";
    out.push(row);
  }

  // block-number ruler
  if (part.blocks.length){
    let line = " ".repeat(labelW + 1);
    events.forEach(ev => { line += " " + (ev.start ? String(ev.bi+1).padEnd(width," ") : " ".repeat(width)); });
    out.push(line.replace(/\s+$/,""));
  }
  return out.join("\n");
}
function songText(song){
  const L = [];
  const title = (song.name || "Untitled") + (song.artist ? " — " + song.artist : "");
  L.push(title);
  L.push("=".repeat(title.length));
  song.tracks.forEach(t => {
    L.push("");
    L.push("Track: " + (t.name || "untitled") + "  (" + INSTRUMENTS[t.instrument].label + "; tuning " + t.tuning.join(" ") + ")");
    t.parts.forEach(p => {
      L.push("");
      L.push("[" + (p.name || "Part") + "]" + (p.effects ? "   FX: " + p.effects : ""));
      L.push(tabTextForPart(t, p));
      const lg = legendForPart(p);
      if (lg.length) L.push(lg.join("   "));
    });
  });
  L.push(""); L.push("— made with riffraff");
  return L.join("\n");
}

/* ---------- render ---------- */
function arrow(v){ return v === "up" ? "↑" : v === "down" ? "↓" : "—"; }

function renderTopBar(){
  const opts = DB.songs.map(x => `<option value="${x.id}" ${x.id===DB.activeSongId?"selected":""}>${esc(x.name||"untitled")}</option>`).join("");
  return `<div class="bar no-print">
    <span class="brand">riffraff</span>
    <span class="sep"></span>
    <select data-action="select-song" title="open song">${opts}</select>
    <button data-action="new-song">new</button>
    <button data-action="import">import</button>
    <button data-action="export-json">.json</button>
    <button data-action="export-txt">.txt</button>
    <button data-action="print">print</button>
    <span class="sep"></span>
    <button data-action="delete-song">delete song</button>
  </div>`;
}
function renderSongMeta(){
  const s = currentSong();
  return `<div class="song">
    <input class="h1" data-bind="song.name" value="${esc(s.name)}" placeholder="song name">
    <input class="artist" data-bind="song.artist" value="${esc(s.artist)}" placeholder="artist / band">
  </div>`;
}
function renderTrackControls(t){
  const presets = Object.keys(INSTRUMENTS[t.instrument].presets);
  return `<div class="trackctl no-print">
    <span class="muted">name</span> <input data-bind="track.name" value="${esc(t.name)}">
    <span class="sep"></span>
    <span class="muted">tuning</span>
    <select data-action="tuning-preset"><option value="">preset…</option>${presets.map(p=>`<option>${esc(p)}</option>`).join("")}</select>
    ${t.tuning.map((s,i)=>`<input class="tun" data-bind="tuning.${i}" value="${esc(s)}" title="string ${t.tuning.length-i} (low→high)">`).join("")}
    <span class="sep"></span>
    <button data-action="del-track">delete track</button>
  </div>`;
}
function renderTrackBar(){
  const s = currentSong();
  const tabs = s.tracks.map(t => `<button class="tab ${t.id===ui.trackId?"on":""}" data-action="select-track" data-id="${t.id}">${esc(t.name||"track")}</button>`).join("");
  const t = currentTrack();
  return `<div class="trackbar">
    <div class="tabs no-print">${tabs}
      <button data-action="add-track" data-inst="guitar8">+ guitar(8)</button>
      <button data-action="add-track" data-inst="bass5">+ bass(5)</button>
    </div>
    ${ t ? `<div class="track-head">Track — ${esc(t.name||"untitled")} · ${INSTRUMENTS[t.instrument].label} · ${esc(t.tuning.join(" "))}</div>${renderTrackControls(t)}`
         : `<div class="muted">no tracks — add one ↑</div>` }
  </div>`;
}
function renderFretboard(track){
  const n = track.tuning.length;
  let head = `<tr><th></th>`;
  for (let f=0; f<=MAX_FRET; f++){
    const dot = (f===12||f===24) ? "··" : ([3,5,7,9,15,17,19,21].includes(f) ? "·" : "");
    head += `<th>${f}<br><span class="dot">${dot}</span></th>`;
  }
  head += `</tr>`;
  let body = "";
  for (let row=0; row<n; row++){
    const si = n - 1 - row;                       // low-string index for this display row
    body += `<tr><th class="strlabel">${esc(track.tuning[si])}</th>`;
    for (let f=0; f<=MAX_FRET; f++){
      const note = ui.picker.notes.find(nt => nt.string===si && nt.fret===f);
      const mark = note ? (ui.picker.mode==="seq" ? String(ui.picker.notes.indexOf(note)+1) : "●") : "";
      const sel = note && note.id===ui.picker.activeNote ? "sel" : "";
      body += `<td class="${f===0?"open":""} ${note?"on":""} ${sel}" data-action="fret" data-string="${si}" data-fret="${f}">${mark}</td>`;
    }
    body += `</tr>`;
  }
  return `<table class="fb"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
function renderChips(track){
  const n = track.tuning.length;
  const seq = ui.picker.mode === "seq";
  if (!ui.picker.notes.length) return `<span class="muted">click the neck to add notes</span>`;
  return ui.picker.notes.map((nt, i) => {
    const dispNum = n - nt.string;                // 1 = highest string
    const tm = nt.tech==="bend"?"b":nt.tech==="harm"?"h":nt.tech==="pm"?"m":"";
    const active = nt.id===ui.picker.activeNote ? "active" : "";
    const num = seq ? `<input class="seqno" type="text" inputmode="numeric" data-action="seqno" data-id="${nt.id}" value="${i+1}" title="position — type a number to reorder">` : "";
    const moves = seq ? `<b data-action="move-note" data-id="${nt.id}" data-dir="-1" title="move earlier">◀</b><b data-action="move-note" data-id="${nt.id}" data-dir="1" title="move later">▶</b>` : "";
    return `<span class="chip ${active}" data-action="select-note" data-id="${nt.id}">${num}S${dispNum}:${nt.fret}${tm}${moves}<b data-action="del-note" data-id="${nt.id}">×</b></span>`;
  }).join("");
}
function renderPicker(){
  const t = currentTrack();
  if (!t) return `<div class="panel no-print muted">add a track to start writing ↑</div>`;
  const part = currentPart();
  const pk = ui.picker;
  const an = pk.notes.find(x => x.id === pk.activeNote);
  const techBtn = (tech,label)=>`<button class="${an&&an.tech===tech?"on":""}" data-action="set-tech" data-tech="${tech}" ${an?"":"disabled"}>${label}</button>`;
  const pu = pk.pickup;
  return `<div class="panel picker no-print">
    <div class="row"><span class="muted">adding to:</span> ${ part ? "▸ " + esc(part.name||"Part") : "<span class=\"muted\">(no part — add one below)</span>" }</div>
    <div class="fbwrap">${renderFretboard(t)}</div>
    <div class="row">${renderChips(t)}</div>
    <div class="row">
      <span class="muted">play:</span>
      <button class="${pk.mode==="chord"?"on":""}" data-action="set-mode" data-mode="chord">chord</button>
      <button class="${pk.mode==="seq"?"on":""}" data-action="set-mode" data-mode="seq">sequence</button>
      <span class="sep"></span>
      <span class="muted">technique:</span>
      ${techBtn("pm","PM")} ${techBtn("bend","bend")} ${techBtn("harm","harmonic")}
    </div>
    <div class="row">
      <span class="muted">pickup:</span>
      <button data-action="cyc-pickup" data-knob="sw">switch: ${pu.sw||"—"}</button>
      <button data-action="cyc-pickup" data-knob="k1">knob1: ${arrow(pu.k1)}</button>
      <button data-action="cyc-pickup" data-knob="k2">knob2: ${arrow(pu.k2)}</button>
    </div>
    <div class="row">
      <button class="primary" data-action="add-block" ${part?"":"disabled"}>add block ▸</button>
      <button data-action="clear-notes">clear</button>
    </div>
  </div>`;
}
function effectSelect(p){
  const groups = EFFECTS.map(g =>
    `<optgroup label="${esc(g.group)}">` +
    g.items.map(it => `<option value="${esc((g.prefix || "") + it)}">${esc(it)}</option>`).join("") +
    `</optgroup>`
  ).join("");
  return `<select data-action="add-effect" data-id="${p.id}"><option value="">+ effect…</option>${groups}</select>`;
}
function renderBlockChips(p){
  if (!p.blocks.length) return `<span class="muted">no blocks yet — build them on the neck above</span>`;
  return p.blocks.map((b,i)=>`<span class="chip">${i+1}<b data-action="move-block" data-id="${b.id}" data-dir="-1">◀</b><b data-action="move-block" data-id="${b.id}" data-dir="1">▶</b><b data-action="del-block" data-id="${b.id}">×</b></span>`).join("");
}
function renderPart(t, p){
  const active = p.id === ui.partId;
  const tab = esc(tabTextForPart(t, p));
  const legend = legendForPart(p);
  return `<div class="part ${active?"active":""}">
    <div class="part-head" data-action="select-part" data-id="${p.id}">
      [<input data-bind="part.name" data-id="${p.id}" value="${esc(p.name)}" placeholder="part">]
      <span class="muted">FX:</span> <input class="fx" data-bind="part.effects" data-id="${p.id}" value="${esc(p.effects)}" placeholder="effects used…">
      <span class="no-print">${effectSelect(p)}</span>
    </div>
    <pre class="tab">${tab}</pre>
    ${legend.length ? `<div class="legend">${legend.map(esc).join("   ")}</div>` : ""}
    ${active ? `<div class="blockchips no-print">${renderBlockChips(p)}</div>
      <div class="partctl no-print">
        <button data-action="move-part" data-id="${p.id}" data-dir="-1">◀ move</button>
        <button data-action="move-part" data-id="${p.id}" data-dir="1">move ▶</button>
        <button data-action="del-part" data-id="${p.id}">delete part</button>
      </div>` : ""}
  </div>`;
}
function renderParts(){
  const t = currentTrack();
  if (!t) return "";
  return `<div class="parts">${t.parts.map(p=>renderPart(t,p)).join("")}
    <div class="no-print"><button data-action="add-part">+ add part</button></div>
  </div>`;
}
function renderFooter(){
  return `<div class="foot muted">click a fret to add · click a note to highlight, double-click to remove · in sequence mode the square shows its order # — type a # or use ◀▶ in the chips to reorder · chord stacks / sequence spreads · b = bend · &lt;n&gt; = harmonic · PM line = palm mute · numbers under the tab = block · autosaves to this browser</div>`;
}
function render(){
  ensureValid();
  app.innerHTML =
    renderTopBar() + renderSongMeta() + renderTrackBar() +
    renderPicker() + renderParts() + renderFooter();
}

/* ---------- picker actions ---------- */
function pickFret(stringIdx, fret){
  const pk = ui.picker;
  const existing = pk.notes.find(nt => nt.string===stringIdx && nt.fret===fret);
  if (existing){ pk.activeNote = existing.id; render(); return; }   // click a note to highlight it
  if (pk.mode === "chord") for (let j=pk.notes.length-1;j>=0;j--) if (pk.notes[j].string===stringIdx) pk.notes.splice(j,1);
  const note = { id: uid(), string: stringIdx, fret, tech: "none" };
  pk.notes.push(note); pk.activeNote = note.id;
  render();
}
function removeNote(id){
  const pk = ui.picker;
  const i = pk.notes.findIndex(nt => nt.id === id);
  if (i < 0) return;
  pk.notes.splice(i,1);
  if (pk.activeNote === id) pk.activeNote = pk.notes.length ? pk.notes[pk.notes.length-1].id : null;
}
function moveNote(id, dir){
  const pk = ui.picker;
  const i = pk.notes.findIndex(n => n.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= pk.notes.length) return;
  const [x] = pk.notes.splice(i,1); pk.notes.splice(j,0,x);
  pk.activeNote = id; render();
}
function setSeqNo(id, val){                                          // type a position to reorder
  const pk = ui.picker;
  const from = pk.notes.findIndex(n => n.id === id);
  if (from < 0) return;
  let to = (parseInt(val,10) || 1) - 1;
  to = Math.max(0, Math.min(pk.notes.length - 1, to));
  const [x] = pk.notes.splice(from,1); pk.notes.splice(to,0,x);
  pk.activeNote = id; render();
}
function setTech(tech){
  const n = ui.picker.notes.find(x => x.id === ui.picker.activeNote);
  if (!n) return;
  n.tech = (n.tech === tech) ? "none" : tech;
  render();
}
function cyclePickup(knob){
  const pu = ui.picker.pickup;
  if (knob === "sw"){ const o=["","bridge","neck","both"]; pu.sw = o[(o.indexOf(pu.sw)+1)%o.length]; }
  else { const o=["","up","down"]; pu[knob] = o[(o.indexOf(pu[knob])+1)%o.length]; }
  render();
}
function addBlock(){
  const p = currentPart();
  if (!p || !ui.picker.notes.length) return;
  p.blocks.push({
    id: uid(), mode: ui.picker.mode,
    notes: ui.picker.notes.map(nt => ({ string: nt.string, fret: nt.fret, tech: nt.tech })),
    pickup: { ...ui.picker.pickup },
  });
  ui.picker.notes = []; ui.picker.activeNote = null;   // mode + pickup stay sticky
  persist(); render();
}

/* ---------- structural actions ---------- */
function move(arr, id, dir){
  const i = arr.findIndex(x => x.id === id); const j = i + dir;
  if (i<0 || j<0 || j>=arr.length) return;
  const [x] = arr.splice(i,1); arr.splice(j,0,x);
}
function download(name, text, type){
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function importSong(obj){
  if (!obj || !Array.isArray(obj.tracks)){ alert("That doesn't look like a riffraff song (.json)."); return; }
  obj.id = uid();
  DB.songs.push(obj); DB.activeSongId = obj.id; ui.trackId = null; ui.partId = null;
  persist(); render();
}

/* ---------- input binding ---------- */
function applyBind(bind, id, val, doRender){
  const s = currentSong();
  if (bind === "song.name") s.name = val;
  else if (bind === "song.artist") s.artist = val;
  else if (bind === "track.name"){ const t = currentTrack(); if (t) t.name = val; }
  else if (bind === "part.name"){ const p = findPart(id) || currentPart(); if (p) p.name = val; }
  else if (bind === "part.effects"){ const p = findPart(id) || currentPart(); if (p) p.effects = val; }
  else if (bind.startsWith("tuning.")){ const t = currentTrack(); if (t) t.tuning[+bind.split(".")[1]] = val; }
  persist();
  if (doRender) render();
}

/* ---------- events ---------- */
function onClick(e){
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;
  const id = el.dataset.id;
  const s = currentSong();
  switch (a){
    case "new-song": { const ns = newSong(); DB.songs.push(ns); DB.activeSongId = ns.id; ui.trackId=null; ui.partId=null; persist(); render(); break; }
    case "delete-song":
      if (DB.songs.length<=1){ if(!confirm("Delete the only song? A fresh empty one will replace it.")) break; }
      else if (!confirm("Delete this song?")) break;
      DB.songs = DB.songs.filter(x => x.id !== DB.activeSongId);
      DB.activeSongId = DB.songs[0] ? DB.songs[0].id : null; ui.trackId=null; ui.partId=null; persist(); render(); break;
    case "import": fileInput.click(); break;
    case "export-json": download(slug(s.name)+".json", JSON.stringify(s,null,2), "application/json"); break;
    case "export-txt": download(slug(s.name)+".txt", songText(s), "text/plain"); break;
    case "print": window.print(); break;

    case "add-track": { const t = newTrack(el.dataset.inst); s.tracks.push(t); ui.trackId=t.id; ui.partId=t.parts[0].id; persist(); render(); break; }
    case "select-track": { ui.trackId=id; const t=currentTrack(); ui.partId = t&&t.parts[0] ? t.parts[0].id : null; persist(); render(); break; }
    case "del-track":
      if (!confirm("Delete this track and its parts?")) break;
      s.tracks = s.tracks.filter(t => t.id !== ui.trackId); ui.trackId=null; persist(); render(); break;

    case "add-part": { const t=currentTrack(); const p=newPart("Part "+(t.parts.length+1)); t.parts.push(p); ui.partId=p.id; persist(); render(); break; }
    case "select-part":
      ui.partId = id;
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT"){ persist(); break; } // keep focus
      persist(); render(); break;
    case "del-part":
      if (!confirm("Delete this part?")) break;
      { const t=currentTrack(); t.parts = t.parts.filter(p => p.id !== id); ui.partId=null; persist(); render(); } break;
    case "move-part": move(currentTrack().parts, id, +el.dataset.dir); persist(); render(); break;

    case "fret": pickFret(+el.dataset.string, +el.dataset.fret); break;
    case "select-note": ui.picker.activeNote = id; render(); break;
    case "move-note": moveNote(id, +el.dataset.dir); break;
    case "del-note": removeNote(id); render(); break;
    case "clear-notes": ui.picker.notes=[]; ui.picker.activeNote=null; render(); break;
    case "set-mode": ui.picker.mode = el.dataset.mode; render(); break;
    case "set-tech": setTech(el.dataset.tech); break;
    case "cyc-pickup": cyclePickup(el.dataset.knob); break;
    case "add-block": addBlock(); break;

    case "del-block": { const p=currentPart(); if(p){ p.blocks=p.blocks.filter(b=>b.id!==id); persist(); render(); } break; }
    case "move-block": { const p=currentPart(); if(p){ move(p.blocks, id, +el.dataset.dir); persist(); render(); } break; }
  }
}
function onInput(e){
  const b = e.target.dataset.bind;
  if (b) applyBind(b, e.target.dataset.id, e.target.value, false);
}
function onChange(e){
  const el = e.target, a = el.dataset.action;
  if (a === "select-song"){ DB.activeSongId = el.value; ui.trackId=null; ui.partId=null; persist(); render(); return; }
  if (a === "tuning-preset"){
    const t = currentTrack(); const preset = INSTRUMENTS[t.instrument].presets[el.value];
    if (preset){ t.tuning = [...preset]; persist(); render(); } return;
  }
  if (a === "add-effect"){
    const p = findPart(el.dataset.id); if (p && el.value){ p.effects = p.effects ? p.effects + ", " + el.value : el.value; persist(); render(); }
    return;
  }
  if (a === "seqno"){ setSeqNo(el.dataset.id, el.value); return; }
  if (el.dataset.bind) applyBind(el.dataset.bind, el.dataset.id, el.value, true);
}
function onFile(e){
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { importSong(JSON.parse(r.result)); } catch(err){ alert("Could not read that file."); } fileInput.value=""; };
  r.readAsText(f);
}

function onDblClick(e){
  const el = e.target.closest('td[data-action="fret"]');
  if (!el) return;
  const note = ui.picker.notes.find(nt => nt.string === +el.dataset.string && nt.fret === +el.dataset.fret);
  if (note){ removeNote(note.id); render(); }
}

app.addEventListener("click", onClick);
app.addEventListener("dblclick", onDblClick);
app.addEventListener("input", onInput);
app.addEventListener("change", onChange);
fileInput.addEventListener("change", onFile);
render();
