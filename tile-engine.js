/*!
 * tile-engine.js — tiny isometric tile engine for "Penguin Park Tycoon"
 * ---------------------------------------------------------------------
 * Drop it in with a script tag with src="tile-engine.js" and call:
 *
 *   set_tile(3, 5, 'path');
 *   set_tile(6, 8, 'icecream');
 *   set_tile(2, 2, 'sign', { text: 'PARK' });
 *   fill_tiles(1, 1, 3, 2, 'pond');       // rectangle of tiles
 *   clear_tile(3, 5);                     // back to plain snow
 *
 * Coordinates: (0,0) is the back (top) corner of the park.
 *   x grows toward the bottom-right, y grows toward the bottom-left.
 *
 * Two layers per tile:
 *   GROUND  types: snow, path, pond, enclosure, gate
 *   OBJECT  types: platform, icecream, bench, rock, crystal, pine, flag,
 *                  sign, penguin, visitor, swimmer
 * set_tile with a ground type replaces the ground, with an object type it
 * puts the object ON TOP of whatever ground is there (so a penguin can stand
 * on a path or in an enclosure). set_tile(x, y, 'snow') wipes the whole tile.
 *
 * Options (3rd/4th arg):  { flip:1 }  mirror a sprite / rotate a bench
 *   penguin: { scarf:'#ff6b6b' }   visitor: { coat:'#6c8cff', hat:'#fff' }
 *   flag: { color:'#ffd93d' }      sign: { text:'PENGUIN PARK' }
 *
 * Other API:
 *   get_tile(x,y)  remove_object(x,y)  clear_all()  fill_tiles(x1,y1,x2,y2,type,opts)
 *   TileEngine.init({ canvas:'#id'|element, size:10, parent:element, background:true, grid:true })
 *   TileEngine.animate(true)           bobbing penguins/visitors/swimmers
 *   TileEngine.on('click'|'hover', (x, y, event) => {})
 *   TileEngine.export_map() / TileEngine.load_map(data)
 *   TileEngine.register('name', { layer:'object', draw(T, opts){...} })   custom tiles
 *   TileEngine.types()                 list of type names
 */
(function (g) {
  'use strict';
  const OL = '#2a3f66';
  const C = {
    ice: ['#effaff', '#bfe6f7', '#93cde8'], wood: ['#f1c78f', '#c58a52', '#a87040'],
    post: ['#d9a066', '#a8723f', '#8a5a30'], teal: ['#9be8da', '#47b3a2', '#2f8f82'],
    snow: ['#fbfdff', '#d3e6f4', '#b4d1e8'], pink: ['#fff6ea', '#ffc2d9', '#f099b8'],
    coral: ['#ffe3b0', '#ff7f6e', '#d95f4f']
  };
  const PAL = ['#ff6b6b', '#ffd93d', '#4dd0c4', '#ff8fb1', '#8a7dff', '#ff9f43', '#6c8cff', '#5fd38d'];
  const ALIAS = { 'ice-cream': 'icecream', ice_cream: 'icecream', kiosk: 'icecream', shop: 'icecream',
    ice: 'pond', water: 'pond', tree: 'pine', empty: 'snow', clear: 'snow', pen: 'penguin',
    person: 'visitor', people: 'visitor', fence: 'enclosure', wall: 'enclosure', deck: 'platform' };

  const S = { n: 10, cvs: null, auto: false, W: 0, H: 0, d: 1, tw: 64, th: 32, k: 1, ox: 0, oy: 0,
    dirty: true, anim: false, t: 0, hover: null, h: {}, bg: true, showGrid: true, cells: null };
  let c = null;
  const mkGrid = n => Array.from({ length: n * n }, () => ({ g: 'snow', go: {}, o: null, oo: {} }));
  S.cells = mkGrid(S.n);
  const cell = (x, y) => (x >= 0 && y >= 0 && x < S.n && y < S.n) ? S.cells[y * S.n + x] : null;
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const scr = (x, y, u = 0, v = 0, z = 0) => [S.ox + ((x + u) - (y + v)) * S.tw / 2, S.oy + ((x + u) + (y + v)) * S.th / 2 - z * S.k];

  /* ---------- canvas primitives ---------- */
  const trace = a => { c.beginPath(); a.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); };
  function fill(a, f, s, w) { trace(a); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); } }
  function ell(x, y, rx, ry, f, s, w = 1.5, r = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), r, 0, 6.2832); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = w; c.stroke(); } }
  function rr(x, y, w, h, r, f, s, lw = 1.5) { c.beginPath(); c.roundRect(x, y, w, h, r); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); } }

  /* ---------- sprites (local px, feet at 0,0) ---------- */
  function dPenguin(bob, flip, scarf) {
    ell(0, 1, 12, 4, 'rgba(47,84,134,.2)'); c.save(); c.scale(flip, 1); c.translate(0, -bob);
    ell(-4.5, -1, 4.5, 2.2, '#ff9f43', OL, 1.4); ell(5, -1, 4.5, 2.2, '#ff9f43', OL, 1.4);
    ell(0, -15, 11, 15, '#27406b', OL, 2); ell(2, -12, 7, 11, '#fff');
    ell(-11, -14, 3, 8, '#1f3358', OL, 1.5, .25); ell(11, -14, 3, 8, '#1f3358', OL, 1.5, -.25);
    ell(0, -22, 2.5, 2.5, '#fff'); ell(7, -22, 2.5, 2.5, '#fff'); ell(.8, -22, 1.2, 1.2, OL); ell(7.8, -22, 1.2, 1.2, OL);
    ell(-2, -18, 1.8, 1.8, 'rgba(255,154,168,.8)'); ell(10, -18, 1.8, 1.8, 'rgba(255,154,168,.8)');
    fill([[3, -19.5], [11.5, -18], [3, -15.5]], '#ffb02e', OL, 1.4);
    if (scarf) { c.strokeStyle = scarf; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-9, -14); c.quadraticCurveTo(1, -9, 11, -14); c.stroke(); rr(5, -14, 4.5, 9, 1.5, scarf, OL, 1.2); }
    c.restore();
  }
  function dPerson(coat, hat, bob) {
    ell(0, 1, 10, 3.5, 'rgba(47,84,134,.2)'); c.save(); c.translate(0, -bob);
    rr(-5.5, -10, 4.5, 10, 1.8, '#2e3f66', OL, 1.6); rr(1, -10, 4.5, 10, 1.8, '#2e3f66', OL, 1.6);
    rr(-7.5, -25, 15, 17, 6.5, coat, OL, 1.8); ell(-9, -16, 2.6, 6, coat, OL, 1.5, .17); ell(9, -16, 2.6, 6, coat, OL, 1.5, -.17);
    ell(0, -31, 6.5, 6.5, '#ffd3b0', OL, 1.8); ell(-2.3, -30.5, 1, 1, OL); ell(2.7, -30.5, 1, 1, OL);
    c.beginPath(); c.arc(0, -32, 6.8, Math.PI, 0); c.closePath(); c.fillStyle = hat; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.8; c.stroke();
    ell(0, -40, 2.8, 2.8, '#fff', OL, 1.5); c.restore();
  }
  function dSwim(bob, flip) {
    c.save(); c.scale(flip, 1); ell(0, 2, 28, 10, null, 'rgba(255,255,255,.85)', 2); c.translate(0, -bob * .5);
    ell(-4, -5, 13, 7, '#27406b', OL, 2); ell(8, -10, 7.5, 7.5, '#27406b', OL, 2);
    ell(10.5, -11.5, 2.4, 2.4, '#fff'); ell(11.2, -11.5, 1.1, 1.1, OL);
    fill([[14, -11], [22, -9], [14, -7]], '#ffb02e', OL, 1.4); ell(-14, -2, 5, 2, '#1f3358', OL, 1.3);
    c.translate(0, bob * .5); ell(0, 3, 21, 6, '#9fdcf3', '#fff', 2); c.restore();
  }
  function dPine() {
    ell(0, 1, 18, 7, 'rgba(47,84,134,.2)'); rr(-4, -10, 8, 11, 0, '#9a6a3e', OL, 2);
    [[-8, 22, 26], [-28, 18, 24], [-46, 13, 22]].forEach(([b, w, h]) => { const t = b - h;
      fill([[-w, b], [w, b], [0, t]], '#3fae8c', OL, 2);
      fill([[0, t], [-w * .55, t + h * .55], [-w * .2, t + h * .45], [0, t + h * .62], [w * .2, t + h * .45], [w * .55, t + h * .55]], '#f8fcff'); });
  }
  function dRock() {
    ell(0, 1, 19, 6, 'rgba(47,84,134,.2)');
    c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-20, -13, -6, -17); c.quadraticCurveTo(6, -23, 15, -10); c.quadraticCurveTo(21, -1, 16, 0); c.closePath();
    c.fillStyle = '#8fa8c4'; c.fill(); c.strokeStyle = OL; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
    c.beginPath(); c.moveTo(-15, -6); c.quadraticCurveTo(-12, -16, -5, -16); c.quadraticCurveTo(6, -22, 14, -10); c.quadraticCurveTo(7, -11, 3, -8); c.quadraticCurveTo(-5, -13, -15, -6);
    c.fillStyle = '#fbfdff'; c.fill();
  }
  function dCrystal() {
    ell(0, 1, 18, 6, 'rgba(47,84,134,.2)');
    fill([[-15, 0], [-14, -13], [-9, -20], [-4, -12], [-4, 0]], '#b8ecff', OL, 1.8);
    fill([[10, 0], [11, -10], [15, -15], [19, -8], [19, 0]], '#b8ecff', OL, 1.8);
    fill([[-5, 0], [-6, -26], [1, -38], [9, -26], [8, 0]], '#aee8ff', OL, 2);
    fill([[1, -38], [9, -26], [8, 0], [1, 0]], '#7fd0f0');
    c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-2, -6); c.lineTo(-2.5, -24); c.stroke();
  }
  function dFlag(col) {
    c.strokeStyle = '#7b8aa8'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -38); c.stroke();
    c.beginPath(); c.moveTo(1.5, -37); c.quadraticCurveTo(12, -41, 23, -34); c.quadraticCurveTo(12, -30, 1.5, -26); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.8; c.lineJoin = 'round'; c.stroke(); ell(0, -39, 2.5, 2.5, '#ffd54f', OL, 1.3);
  }

  /* ---------- tile helper handed to every draw function ---------- */
  const EDGE = [[-.5, -.5, .5, -.5], [.5, -.5, .5, .5], [.5, .5, -.5, .5], [-.5, .5, -.5, -.5]]; // N, E, S, W
  const NB = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function mkT(x, y) {
    const T = { x, y, r: hash(x, y), sw: false, k: S.k };
    [T.cx, T.cy] = scr(x, y);
    T.P = (u, v, z = 0) => T.sw ? scr(x, y, v, u, z) : scr(x, y, u, v, z);
    T.poly = (a, f, s = OL, w = 1.7) => fill(a, f, s, w * S.k);
    T.dia = (f, s, w) => T.poly([T.P(-.5, -.5), T.P(.5, -.5), T.P(.5, .5), T.P(-.5, .5)], f, s, w);
    T.box = (u0, v0, u1, v1, h, col, z = 0) => {
      const q = T.sw ? [col[0], col[2], col[1]] : col, t = z + h, P = T.P;
      T.poly([P(u1, v0, z), P(u1, v1, z), P(u1, v1, t), P(u1, v0, t)], q[2]);
      T.poly([P(u0, v1, z), P(u1, v1, z), P(u1, v1, t), P(u0, v1, t)], q[1]);
      T.poly([P(u0, v0, t), P(u1, v0, t), P(u1, v1, t), P(u0, v1, t)], q[0]);
    };
    T.line = (a, b, col, w, z = 0) => { const p = scr(x, y, a[0], a[1], z), q = scr(x, y, b[0], b[1], z);
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.strokeStyle = col; c.lineWidth = w * S.k; c.lineCap = 'round'; c.stroke(); };
    T.edge = (i, col, w) => T.line([EDGE[i][0], EDGE[i][1]], [EDGE[i][2], EDGE[i][3]], col, w);
    T.nb = i => cell(x + NB[i][0], y + NB[i][1]);
    T.same = (i, ...ty) => { const n = T.nb(i); return !!n && ty.includes(n.g); };
    T.shadow = (rx, ry) => ell(T.cx + 3 * S.k, T.cy + 2 * S.k, rx * S.tw / 2, ry * S.th / 2, 'rgba(47,84,134,.2)');
    T.at = (p, sc, fn) => { c.save(); c.translate(p[0], p[1]); c.scale(sc * S.k, sc * S.k); fn(); c.restore(); };
    T.sprite = (sc, fn) => T.at([T.cx, T.cy], sc, fn);
    T.bob = () => S.anim ? Math.abs(Math.sin(S.t * 5 + T.r * 20)) * 2.5 : 0;
    return T;
  }

  /* ---------- tile type registry ---------- */
  const TYPES = {};
  const reg = (name, def) => { TYPES[name] = def; };
  const ENC = ['enclosure', 'gate'];

  reg('snow', { layer: 'ground' });
  reg('path', { layer: 'ground',
    ground: T => T.dia('#e4f1fb'),
    edges: T => { for (let i = 0; i < 4; i++) if (!T.same(i, 'path', 'gate')) T.edge(i, '#b3cde3', 2.2);
      const p = T.P(T.r * .6 - .3, hash(T.y, T.x) * .6 - .3); ell(p[0], p[1], 2.2 * S.k, 1.2 * S.k, '#cfe0ef'); } });
  reg('pond', { layer: 'ground',
    ground: T => T.dia('#9fdcf3'),
    edges: T => { for (let i = 0; i < 4; i++) if (!T.same(i, 'pond')) { T.edge(i, OL, 9); T.edge(i, '#fff', 5); }
      T.line([-.25, -.05], [.05, -.25], '#fff', 2.2);
      if (T.r > .45) ell(T.cx, T.cy, 16 * S.k, 7 * S.k, null, 'rgba(255,255,255,.9)', 1.8 * S.k); } });
  const WALL = .12, WH = 10;
  reg('enclosure', { layer: 'ground',
    ground: T => T.dia('#e8f7ff'),
    walls: (T, ph) => { const e = i => T.same(i, ...ENC);
      if (ph === 'back') { if (!e(0)) T.box(-.5, -.5, .5, -.5 + WALL, WH, C.ice);
        if (!e(3)) T.box(-.5, -.5 + (e(0) ? 0 : WALL), -.5 + WALL, .5, WH, C.ice);
      } else { if (!e(1)) T.box(.5 - WALL, -.5, .5, .5, WH, C.ice);
        if (!e(2)) T.box(-.5, .5 - WALL, .5 - (e(1) ? 0 : WALL), .5, WH, C.ice); } } });
  reg('gate', { layer: 'ground',
    ground: T => { T.dia('#e8f7ff'); T.poly([T.P(-.18, -.5), T.P(.18, -.5), T.P(.18, .5), T.P(-.18, .5)], '#e4f1fb', null); },
    walls: (T, ph) => { if (ph !== 'front') return;
      T.box(-.46, .34, -.34, .46, 18, C.ice); T.box(.34, .34, .46, .46, 18, C.ice);
      T.at(T.P(-.4, .4, 18), .7, () => dFlag('#ff6b6b')); T.at(T.P(.4, .4, 18), .7, () => dFlag('#ffd93d')); } });

  reg('platform', { layer: 'object', draw: T => {
    const W = C.wood, here = i => { const n = T.nb(i); return n && n.o === 'platform'; };
    T.box(-.5, -.5, .5, .5, 9, W);
    for (const v of [-.17, .17]) T.line([-.5, v], [.5, v], '#c9965e', 1.1, 9);
    T.box(-.5, -.5, -.4, -.4, 14, C.post, 9); T.box(.4, -.5, .5, -.4, 14, C.post, 9); T.box(-.5, .4, -.4, .5, 14, C.post, 9);
    if (!here(0)) T.box(-.4, -.5, .4, -.44, 2, W, 21);
    if (!here(3)) T.box(-.5, -.4, -.44, .4, 2, W, 21);
    T.box(.4, .4, .5, .5, 14, C.post, 9);
    if (!here(1)) T.box(.44, -.4, .5, .4, 2, W, 21); } });
  reg('icecream', { layer: 'object', draw: T => {
    T.shadow(.95, .85);
    T.box(-.38, -.3, .38, .3, 24, C.pink);
    T.poly([T.P(-.25, .3, 10), T.P(.25, .3, 10), T.P(.25, .3, 20), T.P(-.25, .3, 20)], '#7ec8ea');
    T.box(-.3, .3, .3, .4, 2.5, ['#fff', '#ffe3a0', '#d9b45a'], 9);
    for (let i = 0; i < 4; i++) T.box(-.46 + i * .23, -.35, -.46 + (i + 1) * .23, .48, 5,
      i % 2 ? ['#fff', '#e8eef7', '#c7d3e6'] : ['#ff5d6c', '#ff8e9b', '#c93d4f'], 24);
    T.at(T.P(0, .05, 29), .8, () => { fill([[-8, -16], [8, -16], [0, 2]], '#f3b562', OL, 2);
      ell(0, -22, 9, 9, '#ff9fc0', OL, 2); ell(0, -33, 8, 8, '#fff3d6', OL, 2); ell(2, -43, 3, 3, '#ff4d6a', OL, 1.6); }); } });
  reg('bench', { layer: 'object', draw: (T, o) => {
    T.sw = !!o.flip; T.shadow(.7, .4); const t = C.teal;
    T.box(-.34, -.08, -.26, .04, 5, C.post); T.box(.26, -.08, .34, .04, 5, C.post);
    T.box(-.4, -.14, .4, -.06, 8, t, 5); T.box(-.4, -.14, .4, -.06, 1.4, C.snow, 13);
    T.box(-.4, -.06, .4, .18, 3, t, 5); T.box(-.32, -.02, .32, .14, 1.2, C.snow, 8); } });
  reg('rock', { layer: 'object', draw: T => T.sprite(.8, dRock) });
  reg('crystal', { layer: 'object', draw: T => T.sprite(.8, dCrystal) });
  reg('pine', { layer: 'object', draw: T => T.sprite(.9, dPine) });
  reg('flag', { layer: 'object', draw: (T, o) => { const col = o.color || PAL[Math.floor(T.r * PAL.length)]; T.sprite(.9, () => dFlag(col)); } });
  reg('sign', { layer: 'object', draw: (T, o) => {
    T.shadow(.9, .3);
    T.box(-.4, -.05, -.3, .05, 32, C.post); T.box(.3, -.05, .4, .05, 32, C.post);
    T.box(-.46, -.05, .46, .08, 24, C.coral, 12); T.box(-.48, -.08, .48, .1, 3, C.snow, 36);
    const p = T.P(0, .08, 24), t = String(o.text || 'PARK').toUpperCase(), mw = .84 * S.tw / 2;
    c.save(); c.transform(1, .5, 0, 1, p[0], p[1]); c.fillStyle = '#fff8e1'; c.strokeStyle = OL; c.lineWidth = 3 * S.k; c.lineJoin = 'round';
    c.font = `700 ${11 * S.k}px Fredoka,'Trebuchet MS',sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.strokeText(t, 0, 0, mw); c.fillText(t, 0, 0, mw); c.restore(); } });
  reg('penguin', { layer: 'object', draw: (T, o) => {
    const flip = o.flip != null ? (o.flip ? -1 : 1) : (T.r > .5 ? 1 : -1), scarf = o.scarf || (T.r > .7 ? PAL[Math.floor(T.r * 40) % PAL.length] : null);
    T.sprite(.85, () => dPenguin(T.bob(), flip, scarf)); } });
  reg('visitor', { layer: 'object', draw: (T, o) => {
    const coat = o.coat || PAL[Math.floor(T.r * 100) % PAL.length], hat = o.hat || PAL[Math.floor(T.r * 977) % PAL.length];
    T.sprite(.8, () => dPerson(coat, hat, T.bob())); } });
  reg('swimmer', { layer: 'object', draw: (T, o) => {
    const flip = o.flip != null ? (o.flip ? -1 : 1) : (T.r > .5 ? 1 : -1); T.sprite(.85, () => dSwim(T.bob(), flip)); } });

  /* ---------- rendering ---------- */
  function slab() {
    const n = S.n, r = scr(n - 1, 0, .5, -.5), b = scr(n - 1, n - 1, .5, .5), l = scr(0, n - 1, -.5, .5), t = 16 * S.k, dn = p => [p[0], p[1] + t];
    c.save(); c.shadowColor = 'rgba(29,74,124,.4)'; c.shadowBlur = 26 * S.k; c.shadowOffsetY = 14 * S.k;
    fill([r, b, dn(b), dn(r)], '#adcce5', OL, 2.4 * S.k); c.restore();
    fill([l, b, dn(b), dn(l)], '#cfe3f3', OL, 2.4 * S.k);
    fill([r, b, dn(b), dn(r)], '#adcce5', OL, 2.4 * S.k);
  }
  function render() {
    if (!c || !S.W) return;
    c.setTransform(S.d, 0, 0, S.d, 0, 0); c.clearRect(0, 0, S.W, S.H);
    if (S.bg) { const gr = c.createRadialGradient(S.W / 2, S.H * .48, 0, S.W / 2, S.H * .48, Math.max(S.W, S.H) * .75);
      gr.addColorStop(0, '#eaf7ff'); gr.addColorStop(1, '#86bde6'); c.fillStyle = gr; c.fillRect(0, 0, S.W, S.H); }
    const n = S.n, Ts = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) Ts[y * n + x] = mkT(x, y);
    slab();
    for (let i = 0; i < n * n; i++) { const T = Ts[i], q = S.cells[i];
      T.dia((T.x + T.y) % 2 ? '#f9fcff' : '#f2f8fd', S.showGrid ? '#e1edf7' : null, 1);
      if (T.r > .55) { const p = T.P(T.r - .75, hash(T.y + 9, T.x) - .5); c.strokeStyle = '#d9e9f6'; c.lineWidth = 2 * S.k; c.lineCap = 'round';
        c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(p[0] + 4 * S.k, p[1] - 3 * S.k, p[0] + 9 * S.k, p[1]); c.stroke(); }
      const d = TYPES[q.g]; if (d && d.ground) d.ground(T, q.go); }
    for (let i = 0; i < n * n; i++) { const d = TYPES[S.cells[i].g]; if (d && d.edges) d.edges(Ts[i], S.cells[i].go); }
    if (S.hover) { const T = Ts[S.hover.y * n + S.hover.x]; T.dia('rgba(255,255,255,.4)', '#ffd93d', 2.5); }
    for (let s = 0; s <= 2 * n - 2; s++) for (let x = Math.max(0, s - n + 1); x <= Math.min(n - 1, s); x++) {
      const y = s - x, q = S.cells[y * n + x], T = Ts[y * n + x], gd = TYPES[q.g];
      if (gd && gd.walls) gd.walls(T, 'back');
      if (q.o && TYPES[q.o]) TYPES[q.o].draw(T, q.oo);
      if (gd && gd.walls) gd.walls(T, 'front'); }
  }

  /* ---------- setup / sizing / input ---------- */
  function resize() {
    if (!S.cvs) return;
    const r = S.cvs.getBoundingClientRect(), d = g.devicePixelRatio || 1;
    S.d = d; S.W = r.width; S.H = r.height; S.cvs.width = Math.round(r.width * d); S.cvs.height = Math.round(r.height * d);
    const n = S.n; S.tw = Math.max(8, Math.min(S.W / n * .95, S.H * .8 / (n / 2))); S.th = S.tw / 2; S.k = S.tw / 64;
    S.ox = S.W / 2; S.oy = (S.H - n * S.th) / 2 + S.th / 2 + 8 * S.k; S.dirty = true;
  }
  function toGrid(ev) {
    const r = S.cvs.getBoundingClientRect(), a = (ev.clientX - r.left - S.ox) / (S.tw / 2), b = (ev.clientY - r.top - S.oy) / (S.th / 2);
    const x = Math.round((a + b) / 2), y = Math.round((b - a) / 2); return cell(x, y) ? { x, y } : null;
  }
  function init(o = {}) {
    if (S.auto && S.cvs && S.cvs.parentNode) S.cvs.parentNode.removeChild(S.cvs);
    if (o.size && o.size !== S.n) { S.n = o.size; S.cells = mkGrid(S.n); }
    if (o.background != null) S.bg = !!o.background; if (o.grid != null) S.showGrid = !!o.grid;
    S.cvs = typeof o.canvas === 'string' ? document.querySelector(o.canvas) : o.canvas; S.auto = false;
    if (!S.cvs) { S.auto = true; S.cvs = document.createElement('canvas');
      S.cvs.style.cssText = o.parent ? 'position:absolute;inset:0;width:100%;height:100%;display:block' : 'position:fixed;inset:0;width:100%;height:100%;display:block';
      (o.parent || document.body).appendChild(S.cvs); }
    c = S.cvs.getContext('2d');
    S.cvs.onpointermove = e => { const t = toGrid(e), h = S.hover; if ((t && h && t.x === h.x && t.y === h.y) || (!t && !h)) return;
      S.hover = t; S.dirty = true; if (t && S.h.hover) S.h.hover(t.x, t.y, e); };
    S.cvs.onpointerleave = () => { S.hover = null; S.dirty = true; };
    S.cvs.onclick = e => { const t = toGrid(e); if (t && S.h.click) S.h.click(t.x, t.y, e); };
    if (g.ResizeObserver) new ResizeObserver(resize).observe(S.cvs); else g.addEventListener('resize', resize);
    resize(); return api;
  }
  (function loop(t) { S.t = t / 1000; if (c && (S.dirty || S.anim)) { render(); S.dirty = false; } g.requestAnimationFrame(loop); })(0);

  /* ---------- public API ---------- */
  const canon = t => { t = String(t == null ? 'snow' : t).trim().toLowerCase().replace(/[\s-]+/g, '_'); return ALIAS[t] || t; };
  function set_tile(x, y, type, opts) {
    const q = cell(x, y), name = canon(type), d = TYPES[name];
    if (!q) { console.warn(`set_tile: (${x}, ${y}) is outside the ${S.n}x${S.n} grid`); return false; }
    if (!d) { console.warn(`set_tile: unknown tile type "${type}". Try: ${Object.keys(TYPES).join(', ')}`); return false; }
    if (name === 'snow') { q.g = 'snow'; q.go = {}; q.o = null; q.oo = {}; }
    else if (d.layer === 'object') { q.o = name; q.oo = opts || {}; }
    else { q.g = name; q.go = opts || {}; }
    S.dirty = true; return true;
  }
  const get_tile = (x, y) => { const q = cell(x, y); return q ? { ground: q.g, object: q.o, options: { ...q.go, ...q.oo } } : null; };
  const remove_object = (x, y) => { const q = cell(x, y); if (q) { q.o = null; q.oo = {}; S.dirty = true; } };
  const clear_tile = (x, y) => set_tile(x, y, 'snow');
  const clear_all = () => { S.cells = mkGrid(S.n); S.dirty = true; };
  function fill_tiles(x1, y1, x2, y2, type, opts) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) set_tile(x, y, type, opts);
  }
  const export_map = () => ({ size: S.n, tiles: S.cells.map((q, i) => ({ x: i % S.n, y: Math.floor(i / S.n), g: q.g, go: q.go, o: q.o, oo: q.oo }))
    .filter(t => t.g !== 'snow' || t.o) });
  function load_map(m) {
    if (Array.isArray(m)) { clear_all(); m.forEach((row, y) => (Array.isArray(row) ? row : String(row).split(/\s+/)).forEach((v, x) => { if (v && v !== '.') set_tile(x, y, v); })); return; }
    if (m.size && m.size !== S.n) { S.n = m.size; resize(); } clear_all();
    m.tiles.forEach(t => { const q = cell(t.x, t.y); if (q) { q.g = t.g; q.go = t.go || {}; q.o = t.o; q.oo = t.oo || {}; } }); S.dirty = true;
  }
  const api = { init, resize, set_tile, get_tile, clear_tile, clear_all, remove_object, fill_tiles, export_map, load_map,
    register: (name, def) => { TYPES[canon(name)] = def; }, types: () => Object.keys(TYPES),
    animate: on => { S.anim = on !== false; S.dirty = true; }, on: (evt, fn) => { S.h[evt] = fn; },
    get size() { return S.n; } };
  g.TileEngine = api;
  Object.assign(g, { set_tile, get_tile, clear_tile, clear_all, remove_object, fill_tiles });

  const boot = () => { if (!S.cvs) init(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : this);
