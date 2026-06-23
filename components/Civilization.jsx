"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

// ============ CONSTANTS ============
const MAP_W = 34, MAP_H = 22, TILE = 32, END_TURN = 140;

// selectable game lengths — differ by how many turns (and therefore years per turn)
const GAME_MODES = [
  { name: "Дуже швидкий", turns: 80,   desc: "≈75 років/хід" },
  { name: "Швидкий",      turns: 140,  desc: "≈43 роки/хід" },
  { name: "Середній",     turns: 220,  desc: "≈27 років/хід" },
  { name: "Довгий",       turns: 340,  desc: "≈18 років/хід" },
  { name: "Дуже довгий",  turns: 1200, desc: "≈5 років/хід" },
  { name: "Оригінальний", turns: 6000, desc: "≈1 рік/хід" },
];

const TERRAIN = {
  ocean:    { color: "#0e57a0", food: 1, prod: 0, def: 1.0, name: "Океан" },
  coast:    { color: "#2a93dd", food: 1, prod: 0, def: 1.0, name: "Узбережжя" },
  grass:    { color: "#4ec23a", food: 2, prod: 1, def: 1.0, name: "Луки" },
  plains:   { color: "#cdd84a", food: 1, prod: 1, def: 1.0, name: "Рівнини" },
  forest:   { color: "#1c9636", food: 1, prod: 2, def: 1.5, name: "Ліс" },
  hills:    { color: "#cca648", food: 1, prod: 2, def: 2.0, name: "Пагорби" },
  mountain: { color: "#9a9bab", food: 0, prod: 1, def: 3.0, name: "Гори" },
  desert:   { color: "#f4d35e", food: 0, prod: 1, def: 1.0, name: "Пустеля" },
};
const WATER = (t) => t === "ocean" || t === "coast";

const SPECIALS = {
  game:   { name: "Дичина",  terr: "forest",   food: 2, prod: 0, trade: 0, icon: "🦌" },
  coal:   { name: "Вугілля", terr: "hills",    food: 0, prod: 2, trade: 0, icon: "⬛" },
  oasis:  { name: "Оазис",   terr: "desert",   food: 3, prod: 0, trade: 0, icon: "🌴" },
  gold:   { name: "Золото",  terr: "mountain", food: 0, prod: 0, trade: 3, icon: "✨" },
  horses: { name: "Коні",    terr: "plains",   food: 1, prod: 1, trade: 0, icon: "🐎" },
  fish:   { name: "Риба",    terr: "coast",    food: 2, prod: 0, trade: 1, icon: "🐟" },
};

const UNIT_TYPES = {
  settler:  { name: "Поселенець", att: 0, def: 1, move: 1, cost: 40, icon: "S", emoji: "🛖", tech: null },
  diplomat: { name: "Дипломат",   att: 0, def: 1, move: 2, cost: 30, icon: "D", emoji: "🎩", tech: "writing" },
  warrior:  { name: "Воїн",       att: 1, def: 1, move: 1, cost: 10, icon: "W", emoji: "🪓", tech: null },
  phalanx:  { name: "Фаланга",    att: 1, def: 2, move: 1, cost: 20, icon: "P", emoji: "🛡️", tech: "bronze" },
  horseman: { name: "Вершник",    att: 2, def: 1, move: 2, cost: 20, icon: "H", emoji: "🐎", tech: "horseback" },
  archer:   { name: "Лучник",     att: 3, def: 2, move: 1, cost: 30, icon: "A", emoji: "🏹", tech: "warrior_code" },
  legion:   { name: "Легіон",     att: 4, def: 2, move: 1, cost: 40, icon: "L", emoji: "⚔️", tech: "iron" },
  chariot:  { name: "Колісниця",  att: 4, def: 1, move: 2, cost: 40, icon: "C", emoji: "🛞", tech: "wheel" },
  catapult: { name: "Катапульта", att: 6, def: 1, move: 1, cost: 50, icon: "K", emoji: "🪨", tech: "mathematics" },
  knight:   { name: "Лицар",      att: 4, def: 2, move: 2, cost: 60, icon: "R", emoji: "🏇", tech: "chivalry" },
  trireme:  { name: "Трирема",    att: 1, def: 1, move: 3, cost: 40, icon: "T", emoji: "⛵", tech: "map_making", sea: true, cap: 2 },
};
const isShip = (t) => !!UNIT_TYPES[t].sea;

const BUILDINGS = {
  barracks:    { name: "Казарми",      cost: 40, tech: null,         desc: "Нові юніти — ветерани (+50% бою)" },
  temple:      { name: "Храм",         cost: 40, tech: "ceremonial", desc: "+3 задоволених мешканці (з Оракулом +6)" },
  granary:     { name: "Зерносховище", cost: 60, tech: "pottery",    desc: "Після росту зберігає ½ їжі" },
  walls:       { name: "Міські стіни", cost: 60, tech: "masonry",    desc: "Захист у місті ×2" },
  library:     { name: "Бібліотека",   cost: 60, tech: "writing",    desc: "Наука міста +50%" },
  marketplace: { name: "Ринок",        cost: 60, tech: "currency",   desc: "Золото міста +50%" },
};

const WONDERS = {
  pyramids:        { name: "Піраміди",          cost: 200, tech: "masonry",    desc: "+1 їжа в усіх ваших містах" },
  colossus:        { name: "Колос",             cost: 200, tech: "bronze",     desc: "+4 золота за хід" },
  great_library:   { name: "Велика бібліотека", cost: 200, tech: "literacy",   desc: "+4 науки за хід" },
  hanging_gardens: { name: "Висячі сади",       cost: 200, tech: "pottery",    desc: "+1 задоволений мешканець у всіх містах" },
  oracle:          { name: "Оракул",            cost: 180, tech: "ceremonial", desc: "Ефект храмів подвоюється" },
};

const TECHS = {
  bronze:       { name: "Бронза",         cost: 14, req: [] },
  alphabet:     { name: "Алфавіт",         cost: 14, req: [] },
  pottery:      { name: "Гончарство",      cost: 14, req: [] },
  wheel:        { name: "Колесо",          cost: 14, req: [] },
  warrior_code: { name: "Кодекс воїна",    cost: 14, req: [] },
  ceremonial:   { name: "Церемонії",       cost: 14, req: [] },
  horseback:    { name: "Верхова їзда",    cost: 14, req: [] },
  masonry:      { name: "Мурування",       cost: 14, req: [] },
  writing:      { name: "Писемність",      cost: 22, req: ["alphabet"] },
  map_making:   { name: "Картографія",     cost: 22, req: ["alphabet"] },
  iron:         { name: "Обробка заліза",  cost: 22, req: ["bronze"] },
  currency:     { name: "Валюта",          cost: 22, req: ["bronze"] },
  mathematics:  { name: "Математика",      cost: 28, req: ["alphabet", "masonry"] },
  literacy:     { name: "Літописання",     cost: 28, req: ["writing"] },
  monarchy:     { name: "Монархія",        cost: 32, req: ["ceremonial", "writing"] },
  republic:     { name: "Республіка",      cost: 36, req: ["writing", "currency"] },
  feudalism:    { name: "Феодалізм",       cost: 36, req: ["monarchy"] },
  chivalry:     { name: "Лицарство",       cost: 44, req: ["feudalism", "horseback"] },
};

const GOVERNMENTS = {
  despotism: { name: "Деспотизм", tech: null,       desc: "Базова форма правління" },
  monarchy:  { name: "Монархія",  tech: "monarchy", desc: "+1 виробництво в кожному місті" },
  republic:  { name: "Республіка", tech: "republic", desc: "+1 торгівля в кожному місті" },
};

const CIVS_DEF = [
  { name: "Українці", color: "#f5cf3d", cityNames: ["Київ", "Львів", "Одеса", "Харків", "Дніпро", "Полтава", "Чернігів", "Вінниця"] },
  { name: "Римляни",  color: "#e34d4d", cityNames: ["Рим", "Помпеї", "Равенна", "Неаполь", "Верона", "Мілан", "Капуя", "Остія"] },
  { name: "Єгиптяни", color: "#3fc4c4", cityNames: ["Фіви", "Мемфіс", "Геліополь", "Александрія", "Гіза", "Асуан", "Луксор", "Таніс"] },
  { name: "Греки",    color: "#bf63e8", cityNames: ["Афіни", "Спарта", "Коринф", "Дельфи", "Аргос", "Мікени", "Родос", "Олімпія"] },
  { name: "Варвари",  color: "#8a8f98", cityNames: [] },
  { name: "Вестготи", color: "#d98a3d", cityNames: ["Толедо", "Толоза", "Бурдигала", "Барцино", "Емерита", "Тарракон", "Гіспаліс", "Сетубал"] },
  { name: "Гуни",     color: "#7da05a", cityNames: ["Аттілаград", "Паннонія", "Сегед", "Маргус", "Найсус", "Сірмій", "Аквінк", "Тиса"] },
  { name: "Вандали",  color: "#5a7da0", cityNames: ["Карфаген", "Гіппон", "Утіка", "Лептіс", "Кірта", "Тапс", "Гадрумет", "Сабрата"] },
];
const BARB = 4;
const SUCCESSORS = [5, 6, 7];
const ENEMY_CIVS = [1, 2, 3, 5, 6, 7];

const AI_TIERS = [
  { turn: 0,  units: ["warrior"] },
  { turn: 15, units: ["warrior", "phalanx"] },
  { turn: 30, units: ["phalanx", "archer"] },
  { turn: 50, units: ["phalanx", "archer", "legion"] },
  { turn: 70, units: ["archer", "legion", "chariot"] },
  { turn: 95, units: ["legion", "catapult", "knight"] },
];

const idx = (x, y) => y * MAP_W + x;
const yearOf = (t, end = END_TURN) => { const y = -4000 + Math.round((t * 6000) / end); return y < 0 ? `${-y} до н.е.` : `${y} н.е.`; };

// ============ WORLD GEN ============
function genWorld(seed) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const mkGrid = (gw, gh) => Array.from({ length: gh }, () => Array.from({ length: gw }, () => rand()));
  const sample = (g, gw, gh, x, y) => {
    const fx = (x / MAP_W) * (gw - 1), fy = (y / MAP_H) * (gh - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, gw - 1), y1 = Math.min(y0 + 1, gh - 1);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (g[y0][x0] * (1 - sx) + g[y0][x1] * sx) * (1 - sy) + (g[y1][x0] * (1 - sx) + g[y1][x1] * sx) * sy;
  };
  const e1 = mkGrid(7, 5), e2 = mkGrid(14, 9), e3 = mkGrid(24, 16);
  const m1 = mkGrid(8, 6), m2 = mkGrid(16, 11);

  const elev = [], moistA = [];
  for (let y = 0; y < MAP_H; y++) {
    const er = [], mr = [];
    for (let x = 0; x < MAP_W; x++) {
      let e = sample(e1, 7, 5, x, y) * 0.55 + sample(e2, 14, 9, x, y) * 0.3 + sample(e3, 24, 16, x, y) * 0.15;
      const ex = Math.min(x, MAP_W - 1 - x) / (MAP_W / 2);
      const ey = Math.min(y, MAP_H - 1 - y) / (MAP_H / 2);
      e *= Math.min(1, (ex + ey) * 1.5);
      er.push(e);
      mr.push(sample(m1, 8, 6, x, y) * 0.65 + sample(m2, 16, 11, x, y) * 0.35);
    }
    elev.push(er); moistA.push(mr);
  }

  const tiles = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) {
      const e = elev[y][x], m = moistA[y][x];
      let t;
      if (e < 0.3) t = "ocean";
      else if (e > 0.76) t = "mountain";
      else if (e > 0.63) t = "hills";
      else if (m < 0.26) t = "desert";
      else if (m > 0.66) t = "forest";
      else if (m > 0.44) t = "grass";
      else t = "plains";
      row.push(t);
    }
    tiles.push(row);
  }
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (tiles[y][x] !== "ocean") continue;
    let land = false;
    for (let dy = -1; dy <= 1 && !land; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && !WATER(tiles[ny][nx])) { land = true; break; }
    }
    if (land) tiles[y][x] = "coast";
  }

  const rivers = new Set();
  let riverCount = 0;
  for (let attempt = 0; attempt < 200 && riverCount < 6; attempt++) {
    const x0 = Math.floor(rand() * MAP_W), y0 = Math.floor(rand() * MAP_H);
    if (elev[y0][x0] < 0.6 || WATER(tiles[y0][x0])) continue;
    let x = x0, y = y0;
    const path = [];
    for (let step = 0; step < 30; step++) {
      path.push(idx(x, y));
      if (WATER(tiles[y][x])) break;
      let bx = x, by = y, be = elev[y][x] + 0.001;
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
        if (path.includes(idx(nx, ny))) return;
        const ne = elev[ny][nx] + rand() * 0.04;
        if (ne < be) { be = ne; bx = nx; by = ny; }
      });
      if (bx === x && by === y) break;
      x = bx; y = by;
    }
    if (path.length >= 5) {
      path.forEach((i) => { if (!WATER(tiles[Math.floor(i / MAP_W)][i % MAP_W])) rivers.add(i); });
      riverCount++;
    }
  }

  const specials = {};
  const byTerr = {};
  Object.entries(SPECIALS).forEach(([k, sp]) => { byTerr[sp.terr] = k; });
  for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
    if (byTerr[tiles[y][x]] && rand() < 0.07) specials[idx(x, y)] = byTerr[tiles[y][x]];
  }

  // tribal huts on random land tiles
  const huts = new Set();
  let hutTries = 0;
  while (huts.size < 14 && hutTries++ < 600) {
    const x = 1 + Math.floor(rand() * (MAP_W - 2));
    const y = 1 + Math.floor(rand() * (MAP_H - 2));
    const t = tiles[y][x];
    if (!WATER(t) && t !== "mountain" && !specials[idx(x, y)]) huts.add(idx(x, y));
  }

  return { tiles, rivers, specials, elev, huts };
}

function findStarts(tiles, n, rand) {
  const starts = [];
  for (let i = 0; i < n; i++) {
    let best = null, bestScore = -1;
    for (let tries = 0; tries < 700; tries++) {
      const x = 2 + Math.floor(rand() * (MAP_W - 4));
      const y = 2 + Math.floor(rand() * (MAP_H - 4));
      const t = tiles[y][x];
      if (t !== "grass" && t !== "plains") continue;
      const minDist = starts.length ? Math.min(...starts.map((q) => Math.abs(q.x - x) + Math.abs(q.y - y))) : 99;
      if (minDist > bestScore) { bestScore = minDist; best = { x, y }; }
      if (minDist > 17) break;
    }
    starts.push(best || { x: 4 + i * 9, y: 5 + (i % 2) * 10 });
  }
  return starts;
}

function initGame(world, seed) {
  let s = seed * 7 + 13;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const starts = findStarts(world.tiles, 4, rand);
  const units = [];
  let id = 1;
  starts.forEach((p, civ) => {
    units.push({ id: id++, civ, type: "settler", x: p.x, y: p.y, moves: 1, fortified: false, vet: false, aboard: null });
    units.push({ id: id++, civ, type: "warrior", x: p.x, y: p.y, moves: 1, fortified: false, vet: false, aboard: null });
    if (civ !== 0) units.push({ id: id++, civ, type: "settler", x: p.x, y: p.y, moves: 1, fortified: false, vet: false, aboard: null });
  });
  const huts = new Set([...world.huts].filter((i) => {
    const hx = i % MAP_W, hy = Math.floor(i / MAP_W);
    return starts.every((p) => Math.abs(p.x - hx) + Math.abs(p.y - hy) > 3);
  }));
  return {
    turn: 1, units, cities: [], nextId: id,
    huts,
    cityCounters: [0, 0, 0, 0, 0, 0, 0, 0],
    explored: new Set(),
    research: { current: null, points: 0, done: [] },
    gold: 20,
    taxRate: 50,
    government: "despotism",
    anarchy: null, // {turns, target}
    relations: { 1: "peace", 2: "peace", 3: "peace", 5: "war", 6: "war", 7: "war" },
    improvements: {},
    wondersBuilt: {},
    civAlive: [true, true, true, true, true, false, false, false],
  };
}

// ============ YIELDS / HAPPINESS / COMBAT ============
function cityYields(c, world, improvements, wondersBuilt, government) {
  const t = TERRAIN[world.tiles[c.y][c.x]];
  let irr = 0, mine = 0, road = 0, spF = 0, spP = 0, spT = 0, hasRiver = false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const nx = c.x + dx, ny = c.y + dy;
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
    const i = idx(nx, ny);
    const im = improvements[i];
    if (im) { if (im.irr) irr++; if (im.mine) mine++; if (im.road) road++; }
    if (world.rivers.has(i)) hasRiver = true;
    const sp = world.specials[i];
    if (sp) { spF += SPECIALS[sp].food; spP += SPECIALS[sp].prod; spT += SPECIALS[sp].trade; }
  }
  const gov = c.civ === 0 ? government : "despotism";
  let food = t.food + 1 + Math.min(irr, c.pop + 1) + Math.min(spF, 4);
  if (wondersBuilt.pyramids === 0 && c.civ === 0) food += 1;
  let shields = t.prod + 1 + Math.floor(c.pop / 2) + Math.min(mine, c.pop + 1) + Math.min(spP, 4) + (gov === "monarchy" ? 1 : 0);
  let trade = 1 + Math.floor(c.pop / 2) + Math.min(road, c.pop + 1) + Math.min(spT, 4) + (hasRiver ? 2 : 0) + (gov === "republic" ? 1 : 0);
  return { food, shields, trade };
}

function cityUnhappy(c, wondersBuilt) {
  let content = 4;
  if (c.buildings.includes("temple")) content += wondersBuilt.oracle === c.civ ? 6 : 3;
  if (wondersBuilt.hanging_gardens === c.civ) content += 1;
  if (c.civ !== 0) content += 2; // AI отримує бонус замість менеджменту щастя
  return Math.max(0, c.pop - content);
}

function bestDefender(unitsOnTile, world, x, y, inCityWalls) {
  const terr = world.tiles[y][x];
  const onRiver = world.rivers.has(idx(x, y));
  let best = null, bestD = -1;
  unitsOnTile.forEach((u) => {
    let d = UNIT_TYPES[u.type].def * TERRAIN[terr].def;
    if (u.fortified) d *= 1.5;
    if (u.vet) d *= 1.5;
    if (onRiver) d *= 1.5;
    if (inCityWalls) d *= 2;
    if (d > bestD) { bestD = d; best = u; }
  });
  return { unit: best, defVal: bestD };
}

function doCombat(att, defInfo) {
  let a = UNIT_TYPES[att.type].att;
  if (att.vet) a *= 1.5;
  return Math.random() * (a + defInfo.defVal) < a;
}

function findPath(world, units, cities, huts, u, tx, ty) {
  if (tx === u.x && ty === u.y) return [];
  const ship = isShip(u.type);
  const pass = (x, y) => {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
    const w = WATER(world.tiles[y][x]);
    if (ship ? !w : w) return false;
    if (units.some((q) => q && q.civ !== 0 && !q.aboard && q.x === x && q.y === y)) return false;
    if (cities.some((c) => c.civ !== 0 && c.x === x && c.y === y)) return false;
    if (huts.has(idx(x, y))) return false;
    return true;
  };
  if (!pass(tx, ty)) return null;
  const start = idx(u.x, u.y);
  const target = idx(tx, ty);
  const prev = new Map();
  const seen = new Set([start]);
  const queue = [[u.x, u.y]];
  while (queue.length) {
    const [cx, cy] = queue.shift();
    if (cx === tx && cy === ty) break;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      const i = idx(nx, ny);
      if (seen.has(i) || !pass(nx, ny)) continue;
      seen.add(i);
      prev.set(i, idx(cx, cy));
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(target)) return null;
  const path = [];
  let cur = target;
  while (cur !== start) {
    path.unshift({ x: cur % MAP_W, y: Math.floor(cur / MAP_W) });
    cur = prev.get(cur);
  }
  return path;
}

// mounted units cross mountains cheaply; everyone else pays double there
const MOUNTED = new Set(["horseman", "knight", "chariot"]);
const stepCost = (type, terrain) => (terrain === "mountain" && !MOUNTED.has(type) ? 2 : 1);

// an enemy unit or enemy city on an adjacent tile projects a "zone of control"
function enemyZOC(x, y, units, cities) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
    if (units.some((q) => q && q.civ !== 0 && !q.aboard && q.x === nx && q.y === ny)) return true;
    if (cities.some((c) => c.civ !== 0 && c.x === nx && c.y === ny)) return true;
  }
  return false;
}

// ============ CANVAS ART ============
// Richer per-tile terrain: subtle depth shading plus hand-drawn detail.
function paintTerrain(ctx, tk, px, py) {
  const T = TILE;
  const t = TERRAIN[tk];
  ctx.fillStyle = t.color;
  ctx.fillRect(px, py, T, T);

  if (tk === "ocean" || tk === "coast") {
    // depth: darker toward the bottom, sun-glint near the top
    ctx.fillStyle = "rgba(0,10,50,0.18)";
    ctx.fillRect(px, py + T * 0.55, T, T * 0.45);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(px, py, T, T * 0.4);
    ctx.strokeStyle = tk === "coast" ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.11)";
    ctx.lineWidth = 1;
    const rows = tk === "coast" ? [12, 22] : [8, 17, 25];
    rows.forEach((ry, ri) => {
      const off = (ri % 2) * 7;
      ctx.beginPath();
      ctx.moveTo(px + 2 + off, py + ry);
      ctx.quadraticCurveTo(px + 7 + off, py + ry - 3, px + 12 + off, py + ry);
      ctx.quadraticCurveTo(px + 17 + off, py + ry + 3, px + 22 + off, py + ry);
      ctx.stroke();
    });
    ctx.lineWidth = 1;
    return;
  }

  // land tiles: faint top highlight + bottom shadow give a gentle 3D feel
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(px, py, T, 3);
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(px, py + T - 4, T, 4);

  if (tk === "grass") {
    [[6, 9], [13, 21], [20, 12], [25, 23], [10, 27]].forEach(([ox, oy], i) => {
      ctx.strokeStyle = i % 2 ? "rgba(20,90,20,0.55)" : "rgba(255,255,255,0.20)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox - 2, py + oy - 4);
      ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox + 2, py + oy - 4);
      ctx.stroke();
    });
    ctx.lineWidth = 1;
  } else if (tk === "plains") {
    ctx.strokeStyle = "rgba(120,90,20,0.38)"; ctx.lineWidth = 1;
    [[5, 10], [14, 16], [8, 22], [20, 12], [23, 24]].forEach(([ox, oy]) => {
      ctx.beginPath(); ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox + 5, py + oy); ctx.stroke();
    });
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.fillRect(px + 6, py + 8, 1.5, 1.5); ctx.fillRect(px + 18, py + 19, 1.5, 1.5);
    ctx.lineWidth = 1;
  } else if (tk === "forest") {
    [[8, 21], [18, 16], [12, 27], [23, 25]].forEach(([bx, by]) => {
      ctx.fillStyle = "#5b3a1a";
      ctx.fillRect(px + bx - 1, py + by - 2, 2, 4);
      for (let layer = 0; layer < 3; layer++) {
        const w = 7 - layer * 1.6, ty = by - 5 - layer * 4;
        ctx.fillStyle = layer === 2 ? "#46c554" : layer === 1 ? "#239a36" : "#0f6b22";
        ctx.beginPath();
        ctx.moveTo(px + bx, py + ty - 2);
        ctx.lineTo(px + bx + w, py + ty + 5);
        ctx.lineTo(px + bx - w, py + ty + 5);
        ctx.closePath(); ctx.fill();
      }
    });
  } else if (tk === "hills") {
    [[10, 21, 7], [21, 23, 6]].forEach(([cx, cy, r]) => {
      ctx.fillStyle = "#bd9340";
      ctx.beginPath(); ctx.arc(px + cx, py + cy, r, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(255,240,200,0.40)";
      ctx.beginPath(); ctx.arc(px + cx - 1.5, py + cy, r - 3, Math.PI, Math.PI * 1.6); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(px + cx - r, py + cy - 1, r * 2, 2);
    });
  } else if (tk === "mountain") {
    ctx.fillStyle = "#7d7d86";
    ctx.beginPath(); ctx.moveTo(px + 20, py + 7); ctx.lineTo(px + 29, py + 25); ctx.lineTo(px + 12, py + 25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#9a9aa3";
    ctx.beginPath(); ctx.moveTo(px + 12, py + 5); ctx.lineTo(px + 23, py + 26); ctx.lineTo(px + 3, py + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.moveTo(px + 12, py + 5); ctx.lineTo(px + 23, py + 26); ctx.lineTo(px + 12, py + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4f4fa";
    ctx.beginPath(); ctx.moveTo(px + 12, py + 5); ctx.lineTo(px + 16, py + 12); ctx.lineTo(px + 8, py + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px + 20, py + 7); ctx.lineTo(px + 23, py + 12); ctx.lineTo(px + 17, py + 12); ctx.closePath(); ctx.fill();
  } else if (tk === "desert") {
    ctx.strokeStyle = "rgba(180,140,40,0.5)"; ctx.lineWidth = 1.5;
    [[5, 13, 16], [4, 23, 21]].forEach(([sx, sy, w]) => {
      ctx.beginPath();
      ctx.moveTo(px + sx, py + sy);
      ctx.quadraticCurveTo(px + sx + w / 2, py + sy - 4, px + sx + w, py + sy);
      ctx.stroke();
    });
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath(); ctx.arc(px + 23, py + 9, 2, 0, 7); ctx.fill();
  }
}

// A small settlement that grows with population, drawn in the civ colour.
function paintCity(ctx, c, px, py, color, hasWalls) {
  const T = TILE;
  const big = c.pop >= 6, mid = c.pop >= 3;
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath(); ctx.ellipse(px + T / 2, py + T - 5, 12, 4, 0, 0, 7); ctx.fill();

  if (hasWalls) {
    // stone rampart hugging the tile
    ctx.fillStyle = "#8d8a82";
    ctx.fillRect(px + 2, py + T - 9, T - 4, 5);
    ctx.fillStyle = "#b8b4aa";
    for (let bx = 3; bx < T - 4; bx += 5) ctx.fillRect(px + bx, py + T - 11, 3, 3);
    ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.strokeRect(px + 2.5, py + T - 9.5, T - 5, 5);
  }

  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  const baseY = py + T - (hasWalls ? 10 : 7);
  const blk = (bx, bw, bh, roof) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + bx, baseY - bh, bw, bh);
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(px + bx + bw - 2, baseY - bh, 2, bh);
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillRect(px + bx, baseY - bh, 2, bh);
    if (roof) {
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.beginPath();
      ctx.moveTo(px + bx - 1, baseY - bh);
      ctx.lineTo(px + bx + bw / 2, baseY - bh - 4);
      ctx.lineTo(px + bx + bw + 1, baseY - bh);
      ctx.closePath(); ctx.fill();
    }
  };
  blk(6, 7, 9, true);
  blk(14, 6, 12, true);
  blk(21, 6, 8, true);
  if (mid) blk(10, 5, 6, false);
  if (big) {
    ctx.fillStyle = color;
    ctx.fillRect(px + 14, py + 6, 6, 9);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath(); ctx.moveTo(px + 13, py + 6); ctx.lineTo(px + 17, py + 2); ctx.lineTo(px + 21, py + 6); ctx.closePath(); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}

// Rounded-rect path helper (older canvases lack ctx.roundRect).
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- hand-drawn unit sprites, all centred at (cx, cy) on a dark token panel ---
const ART = {
  steel: "#dfe3ea", steelD: "#9aa1b0",
  wood: "#b5824a", woodD: "#7d5026",
  cream: "#f3ead2", gold: "#ffd24a",
  horse: "#c08a4e", horseD: "#7d5026",
  bronze: "#d79a36", bronzeD: "#9a6c1e",
  stone: "#bcc0c8", red: "#e0564f", iron: "#3a3a46",
};

function drawHorse(cx, cy, ctx) {
  const { horse, horseD } = ART;
  ctx.fillStyle = horse;
  ctx.beginPath(); ctx.ellipse(cx - 1, cy + 1, 6, 3.4, 0, 0, 7); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 6, cy - 5); ctx.lineTo(cx + 8, cy - 4.5);
  ctx.lineTo(cx + 7, cy - 2); ctx.lineTo(cx + 5, cy + 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = horseD; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 3.5); ctx.lineTo(cx - 5, cy + 7);
  ctx.moveTo(cx + 2, cy + 3.5); ctx.lineTo(cx + 3, cy + 7);
  ctx.moveTo(cx - 1, cy + 3.8); ctx.lineTo(cx - 1, cy + 7);
  ctx.moveTo(cx - 6.5, cy - 1); ctx.lineTo(cx - 8, cy + 3);
  ctx.stroke(); ctx.lineWidth = 1;
}

const UNIT_SPRITES = {
  settler(cx, cy, ctx) {
    ctx.fillStyle = ART.iron;
    ctx.beginPath(); ctx.arc(cx - 4, cy + 6, 2.6, 0, 7); ctx.arc(cx + 4, cy + 6, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = ART.wood;
    ctx.beginPath(); ctx.arc(cx - 4, cy + 6, 1, 0, 7); ctx.arc(cx + 4, cy + 6, 1, 0, 7); ctx.fill();
    ctx.fillStyle = ART.woodD; ctx.fillRect(cx - 6, cy + 2, 12, 3);
    ctx.fillStyle = ART.cream;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 2); ctx.quadraticCurveTo(cx, cy - 8, cx + 6, cy + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ART.steelD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 2, cy - 3.4); ctx.lineTo(cx - 2, cy + 2); ctx.moveTo(cx + 2, cy - 3.4); ctx.lineTo(cx + 2, cy + 2); ctx.stroke();
  },
  diplomat(cx, cy, ctx) {
    ctx.fillStyle = ART.cream; ctx.fillRect(cx - 5, cy - 6, 10, 12);
    ctx.fillStyle = ART.woodD;
    ctx.beginPath(); ctx.ellipse(cx - 5, cy, 1.8, 6, 0, 0, 7); ctx.ellipse(cx + 5, cy, 1.8, 6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(40,30,10,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx + 3, cy - 3);
    ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
    ctx.moveTo(cx - 3, cy + 3); ctx.lineTo(cx + 1, cy + 3); ctx.stroke();
    ctx.fillStyle = ART.red; ctx.beginPath(); ctx.arc(cx + 3, cy + 4, 1.8, 0, 7); ctx.fill();
  },
  warrior(cx, cy, ctx) {
    ctx.fillStyle = ART.wood;
    ctx.beginPath(); ctx.arc(cx - 2, cy + 1, 6.2, 0, 7); ctx.fill();
    ctx.strokeStyle = ART.woodD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx - 2, cy + 1, 6.2, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 2, cy + 1, 3.2, 0, 7); ctx.stroke();
    ctx.fillStyle = ART.bronze; ctx.beginPath(); ctx.arc(cx - 2, cy + 1, 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = ART.woodD; ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 4, cy + 7); ctx.lineTo(cx + 5, cy - 4); ctx.stroke();
    ctx.fillStyle = ART.wood; ctx.beginPath(); ctx.arc(cx + 5.5, cy - 5, 3, 0, 7); ctx.fill();
    ctx.fillStyle = ART.woodD; ctx.beginPath(); ctx.arc(cx + 4.5, cy - 4, 0.9, 0, 7); ctx.arc(cx + 6.5, cy - 6, 0.9, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
  },
  phalanx(cx, cy, ctx) {
    ctx.strokeStyle = ART.woodD; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx + 5, cy - 8); ctx.lineTo(cx - 2, cy + 8); ctx.stroke();
    ctx.fillStyle = ART.steel; ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 9); ctx.lineTo(cx + 7, cy - 5); ctx.lineTo(cx + 3.5, cy - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ART.bronze; ctx.beginPath(); ctx.arc(cx - 1, cy, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = ART.bronzeD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx - 1, cy, 7, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 1, cy, 4, 0, 7); ctx.stroke();
    ctx.fillStyle = ART.bronzeD; ctx.beginPath(); ctx.arc(cx - 1, cy, 1.6, 0, 7); ctx.fill();
  },
  horseman(cx, cy, ctx) {
    drawHorse(cx - 1, cy + 1, ctx);
    ctx.fillStyle = ART.iron; ctx.fillRect(cx - 3, cy - 6, 3.4, 5);
    ctx.fillStyle = "#e8b48a"; ctx.beginPath(); ctx.arc(cx - 1.3, cy - 7, 2, 0, 7); ctx.fill();
  },
  archer(cx, cy, ctx) {
    const bx = cx - 1;
    ctx.strokeStyle = ART.wood; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(bx, cy, 7, -1.9, 1.9); ctx.stroke();
    const ex = bx + 7 * Math.cos(1.9), ey1 = cy - 7 * Math.sin(1.9), ey2 = cy + 7 * Math.sin(1.9);
    ctx.strokeStyle = ART.steel; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex, ey1); ctx.lineTo(ex, ey2); ctx.stroke();
    ctx.strokeStyle = ART.cream; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(ex, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
    ctx.fillStyle = ART.steel; ctx.beginPath();
    ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 5, cy - 2); ctx.lineTo(cx + 5, cy + 2); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;
  },
  legion(cx, cy, ctx) {
    ctx.strokeStyle = ART.steel; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx + 1, cy + 3); ctx.lineTo(cx + 7, cy - 6); ctx.stroke();
    ctx.strokeStyle = ART.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 1, cy + 6); ctx.lineTo(cx + 2, cy + 1); ctx.stroke();
    ctx.fillStyle = ART.red; roundRectPath(ctx, cx - 7, cy - 7, 9, 15, 3); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; roundRectPath(ctx, cx - 7, cy - 7, 9, 15, 3); ctx.stroke();
    ctx.fillStyle = ART.gold; ctx.beginPath(); ctx.arc(cx - 2.5, cy, 1.7, 0, 7); ctx.fill();
    ctx.strokeStyle = ART.gold; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 1, cy); ctx.moveTo(cx - 2.5, cy - 5); ctx.lineTo(cx - 2.5, cy + 6); ctx.stroke();
  },
  chariot(cx, cy, ctx) {
    drawHorse(cx + 1, cy - 1, ctx);
    ctx.strokeStyle = ART.iron; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(cx - 6, cy + 5, 4, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(cx - 6, cy + 5); ctx.lineTo(cx - 6 + Math.cos(a) * 4, cy + 5 + Math.sin(a) * 4); ctx.stroke();
    }
    ctx.strokeStyle = ART.woodD; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 3); ctx.lineTo(cx - 1, cy); ctx.stroke();
    ctx.lineWidth = 1;
  },
  catapult(cx, cy, ctx) {
    ctx.fillStyle = ART.woodD; ctx.fillRect(cx - 7, cy + 3, 14, 2);
    ctx.fillStyle = ART.iron;
    ctx.beginPath(); ctx.arc(cx - 5, cy + 6, 1.7, 0, 7); ctx.arc(cx + 5, cy + 6, 1.7, 0, 7); ctx.fill();
    ctx.strokeStyle = ART.wood; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 5, cy + 3); ctx.lineTo(cx, cy - 5); ctx.lineTo(cx + 5, cy + 3); ctx.stroke();
    ctx.strokeStyle = ART.woodD;
    ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 6, cy - 1); ctx.stroke();
    ctx.fillStyle = ART.stone; ctx.beginPath(); ctx.arc(cx - 6, cy - 2, 2.2, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
  },
  knight(cx, cy, ctx) {
    drawHorse(cx - 1, cy + 1, ctx);
    ctx.fillStyle = ART.steel; ctx.fillRect(cx - 3, cy - 6, 3.6, 5);
    ctx.fillStyle = ART.steelD; ctx.beginPath(); ctx.arc(cx - 1.2, cy - 7, 2.1, 0, 7); ctx.fill();
    ctx.strokeStyle = ART.steelD; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - 5, cy + 4); ctx.lineTo(cx + 6, cy - 7); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = ART.red;
    ctx.beginPath(); ctx.moveTo(cx + 6, cy - 7); ctx.lineTo(cx + 3.5, cy - 6); ctx.lineTo(cx + 4.5, cy - 4); ctx.closePath(); ctx.fill();
  },
};

function drawGalley(cx, cy, ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy + 1); ctx.lineTo(cx + 12, cy + 1);
  ctx.lineTo(cx + 8, cy + 6); ctx.lineTo(cx - 9, cy + 6); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(cx - 9, cy + 1, 21, 1.6);
  ctx.strokeStyle = ART.woodD; ctx.lineWidth = 1;
  for (let x = -7; x <= 8; x += 3) { ctx.beginPath(); ctx.moveTo(cx + x, cy + 5); ctx.lineTo(cx + x - 2, cy + 8); ctx.stroke(); }
  ctx.strokeStyle = "#3a2a17"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 1, cy - 9); ctx.lineTo(cx - 1, cy + 1); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = ART.cream;
  ctx.beginPath(); ctx.moveTo(cx - 1, cy - 8); ctx.lineTo(cx + 7, cy - 2); ctx.lineTo(cx - 1, cy - 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
}

// Unit token: a civ-coloured chit with a hand-drawn vector sprite on a dark panel.
function paintUnit(ctx, u, px, py, color) {
  const T = TILE, cx = px + T / 2, cy = py + T / 2;
  ctx.lineJoin = "round"; ctx.lineCap = "round";

  if (isShip(u.type)) {
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    drawGalley(cx, cy, ctx, color);
    ctx.lineJoin = "miter"; ctx.lineCap = "butt"; ctx.lineWidth = 1;
    return;
  }

  // civ-coloured frame
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color; roundRectPath(ctx, cx - 10, cy - 10, 20, 20, 6); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // dark inner panel so the sprite reads on any civ colour
  ctx.fillStyle = "#21212b"; roundRectPath(ctx, cx - 8, cy - 8, 16, 16, 4); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.06)"; roundRectPath(ctx, cx - 8, cy - 8, 16, 6, 3); ctx.fill();

  const draw = UNIT_SPRITES[u.type];
  if (draw) draw(cx, cy, ctx);

  ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 1.5;
  roundRectPath(ctx, cx - 10, cy - 10, 20, 20, 6); ctx.stroke();
  ctx.lineJoin = "miter"; ctx.lineCap = "butt"; ctx.lineWidth = 1;
}

// Reuse the same canvas sprite inside HTML panels (unit & garrison lists).
function UnitIcon({ type, color, size = 30 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    paintUnit(ctx, { type }, 0, 0, color);
  }, [type, color]);
  return <canvas ref={ref} width={TILE} height={TILE}
    style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle" }} />;
}

// ============ COMPONENT ============
export default function Civilization() {
  const canvasRef = useRef(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147480000) + 1);
  const [world, setWorld] = useState(() => genWorld(seed));
  const [state, setState] = useState(() => initGame(world, seed));
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const [log, setLog] = useState(["4000 до н.е. — Оберіть місце для першого міста. Клік на юніт → сусідня клітинка = рух."]);
  const [cityView, setCityView] = useState(null);
  const [empireView, setEmpireView] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [notices, setNotices] = useState([]);
  const [toast, setToast] = useState(null);
  const [slotsView, setSlotsView] = useState(null); // null | "save" | "load"
  const [gameLen, setGameLen] = useState(END_TURN); // total turns for the chosen length
  const [setupMode, setSetupMode] = useState(true); // show the length picker before play
  const [zoom, setZoom] = useState(1.5);
  const [muted, setMuted] = useState(false);
  const [mousePos, setMousePos] = useState(null);   // {cx, cy} for cursor tooltip
  const [viewRect, setViewRect] = useState(null);   // visible area as fractions for minimap
  const minimapRef = useRef(null);
  const mapWrapRef = useRef(null);
  const audioRef = useRef(null);
  const pinchRef = useRef(null);
  const keyRef = useRef(null);
  const panRef = useRef(null);          // drag-to-pan state
  const justDraggedRef = useRef(false); // suppress click right after a drag
  const zoomFocusRef = useRef(null);    // keep point under cursor stable when zooming
  const viewRectRaf = useRef(0);
  const endTurnArmedRef = useRef(false);

  // auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // load muted preference (client only)
  useEffect(() => {
    try { if (localStorage.getItem("civ-muted") === "1") setMuted(true); } catch (e) {}
  }, []);

  // global keyboard shortcuts — handler kept in a ref so it always sees fresh state
  useEffect(() => {
    const h = (e) => keyRef.current && keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ---- SOUND (synthesized via Web Audio, no asset files) ----
  const playSound = (type) => {
    if (muted) return;
    try {
      let ac = audioRef.current;
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC(); audioRef.current = ac;
      }
      if (ac.state === "suspended") ac.resume();
      const now = ac.currentTime;
      const beep = (freq, start, dur, wave = "sine", gain = 0.06) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = wave; o.frequency.value = freq;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, now + start);
        g.gain.exponentialRampToValueAtTime(gain, now + start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        o.start(now + start); o.stop(now + start + dur + 0.02);
      };
      const noise = (start, dur, gain = 0.08) => {
        const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ac.createBufferSource(); src.buffer = buf;
        const g = ac.createGain(); g.gain.value = gain;
        src.connect(g); g.connect(ac.destination); src.start(now + start);
      };
      switch (type) {
        case "move":  beep(330, 0, 0.07, "square", 0.025); break;
        case "city":  beep(523, 0, 0.12); beep(659, 0.1, 0.12); beep(784, 0.2, 0.2); break;
        case "win":   noise(0, 0.16, 0.09); beep(740, 0.05, 0.12, "sawtooth", 0.05); break;
        case "lose":  beep(196, 0, 0.32, "sawtooth", 0.06); break;
        case "tech":  beep(523, 0, 0.1); beep(659, 0.09, 0.1); beep(880, 0.18, 0.22); break;
        case "turn":  beep(294, 0, 0.09, "sine", 0.035); break;
        default: break;
      }
    } catch (e) {}
  };
  const toggleMute = () => {
    setMuted((m) => { const nv = !m; try { localStorage.setItem("civ-muted", nv ? "1" : "0"); } catch (e) {} return nv; });
  };

  // ---- TOUCH: pinch-to-zoom on the map ----
  const onMapTouchStart = (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { d, z: zoom };
    }
  };
  const onMapTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const nz = Math.min(3, Math.max(1, +(pinchRef.current.z * (d / pinchRef.current.d)).toFixed(2)));
      setZoom(nz);
    }
  };
  const onMapTouchEnd = () => { pinchRef.current = null; };

  // ---- MINIMAP click → center the map viewport on that tile ----
  const handleMinimapClick = (e) => {
    const cv = minimapRef.current, wrap = mapWrapRef.current, canvas = canvasRef.current;
    if (!cv || !wrap || !canvas) return;
    const r = cv.getBoundingClientRect();
    const tx = ((e.clientX - r.left) / r.width) * MAP_W;
    const ty = ((e.clientY - r.top) / r.height) * MAP_H;
    const pxPerTileX = canvas.clientWidth / MAP_W;
    const pxPerTileY = canvas.clientHeight / MAP_H;
    wrap.scrollTo({ left: tx * pxPerTileX - wrap.clientWidth / 2, top: ty * pxPerTileY - wrap.clientHeight / 2, behavior: "smooth" });
  };

  // recompute the visible-area rectangle drawn over the minimap (throttled to a frame)
  const updateViewRect = () => {
    if (viewRectRaf.current) return;
    viewRectRaf.current = requestAnimationFrame(() => {
      viewRectRaf.current = 0;
      const wrap = mapWrapRef.current, canvas = canvasRef.current;
      if (!wrap || !canvas || !canvas.clientWidth) return;
      setViewRect({
        l: wrap.scrollLeft / canvas.clientWidth,
        t: wrap.scrollTop / canvas.clientHeight,
        w: Math.min(1, wrap.clientWidth / canvas.clientWidth),
        h: Math.min(1, wrap.clientHeight / canvas.clientHeight),
      });
    });
  };

  // wheel/trackpad scrolls the map normally; only block the pinch gesture (ctrl+wheel)
  // so it neither zooms the map nor the whole browser page. Zoom is via the ± buttons.
  const onMapWheel = (e) => { if (e.ctrlKey) e.preventDefault(); };

  // after zoom changes, restore the focal point and refresh the minimap rectangle
  useLayoutEffect(() => {
    const wrap = mapWrapRef.current, canvas = canvasRef.current;
    if (wrap && canvas && zoomFocusRef.current) {
      const f = zoomFocusRef.current; zoomFocusRef.current = null;
      wrap.scrollLeft = f.fracX * canvas.clientWidth - f.offX;
      wrap.scrollTop = f.fracY * canvas.clientHeight - f.offY;
    }
    updateViewRect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // center the map viewport on a tile (only when it's off-screen, unless forced)
  const ensureTileVisible = (x, y, force) => {
    const wrap = mapWrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas || x == null) return;
    const pxX = (x + 0.5) * (canvas.clientWidth / MAP_W);
    const pxY = (y + 0.5) * (canvas.clientHeight / MAP_H);
    const margin = 70;
    const offL = pxX < wrap.scrollLeft + margin, offR = pxX > wrap.scrollLeft + wrap.clientWidth - margin;
    const offT = pxY < wrap.scrollTop + margin, offB = pxY > wrap.scrollTop + wrap.clientHeight - margin;
    if (force || offL || offR || offT || offB) {
      wrap.scrollTo({ left: pxX - wrap.clientWidth / 2, top: pxY - wrap.clientHeight / 2, behavior: force ? "auto" : "smooth" });
    }
    updateViewRect();
  };

  // on a fresh game (no cities yet), center the view on the player's first unit
  useEffect(() => {
    if (state.cities.length > 0) return;
    const u = state.units.find((q) => q.civ === 0);
    if (!u) return;
    const r = requestAnimationFrame(() => ensureTileVisible(u.x, u.y, true));
    return () => cancelAnimationFrame(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  // keep the selected unit in view (also as it walks via keyboard)
  const selPos = (() => {
    const u = selected ? state.units.find((q) => q.id === selected) : null;
    return u && u.civ === 0 ? { x: u.x, y: u.y } : null;
  })();
  useEffect(() => {
    if (selPos) ensureTileVisible(selPos.x, selPos.y, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selPos && selPos.x, selPos && selPos.y]);

  const tiles = world.tiles;
  const addLogs = (m) => { if (m.length) setLog((l) => [...m.slice().reverse(), ...l].slice(0, 8)); };

  // "Нова гра" just reopens the length picker; startGame actually builds the world
  const restart = () => setSetupMode(true);

  const startGame = (turns) => {
    const ns = Math.floor(Math.random() * 2147480000) + 1;
    const nw = genWorld(ns);
    setSeed(ns); setWorld(nw); setState(initGame(nw, ns));
    setSelected(null); setCityView(null); setGameOver(null); setEmpireView(false); setHover(null); setNotices([]); setToast(null);
    setGameLen(turns); setSetupMode(false);
    const mode = GAME_MODES.find((m) => m.turns === turns);
    setLog([`4000 до н.е. — Нова гра · ${mode ? mode.name : turns + " ходів"}. Хай щастить!`]);
  };

  const SAVE_SLOTS = ["auto", "1", "2", "3"];
  const slotKey = (s) => `civ-save-${s}`;

  const writeSave = (slot) => {
    try {
      const data = {
        v: 2, seed, turn: state.turn, savedAt: Date.now(), gameLen,
        world: { ...world, rivers: [...world.rivers], huts: [...world.huts] },
        state: { ...state, explored: [...state.explored], huts: [...state.huts] },
        log,
      };
      localStorage.setItem(slotKey(slot), JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  };

  const saveGame = (slot) => {
    const ok = writeSave(slot);
    if (ok) setToast({ id: Date.now(), text: `💾 Збережено у «${slot === "auto" ? "Авто" : "Слот " + slot}»` });
    else addLogs(["Не вдалося зберегти гру (сховище переповнене?)."]);
    setSlotsView(null);
  };

  const loadGame = (slot) => {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) { addLogs(["Цей слот порожній."]); setSlotsView(null); return; }
      const d = JSON.parse(raw);
      setSeed(d.seed);
      setWorld({ ...d.world, rivers: new Set(d.world.rivers), huts: new Set(d.world.huts) });
      setState({ ...d.state, explored: new Set(d.state.explored), huts: new Set(d.state.huts) });
      setLog(d.log || ["Гру завантажено."]);
      setGameLen(d.gameLen || END_TURN); setSetupMode(false);
      setSelected(null); setCityView(null); setGameOver(null); setEmpireView(false); setNotices([]);
      setToast({ id: Date.now(), text: `📂 Завантажено «${slot === "auto" ? "Авто" : "Слот " + slot}»` });
    } catch (e) {
      addLogs(["Пошкоджене збереження — не вдалося завантажити."]);
    }
    setSlotsView(null);
  };

  const getSlotMeta = (slot) => {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) return null;
      const d = JSON.parse(raw);
      return { turn: d.turn || (d.state && d.state.turn) || 1, savedAt: d.savedAt || null, gameLen: d.gameLen || END_TURN };
    } catch (e) { return null; }
  };

  // fog
  useEffect(() => {
    setState((st) => {
      const ex = new Set(st.explored);
      const before = ex.size;
      const reveal = (x, y, r) => {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) ex.add(idx(nx, ny));
        }
      };
      st.units.filter((u) => u.civ === 0).forEach((u) => reveal(u.x, u.y, 2));
      st.cities.filter((c) => c.civ === 0).forEach((c) => reveal(c.x, c.y, 3));
      return ex.size === before ? st : { ...st, explored: ex };
    });
  }, [state.units, state.cities]);

  // autosave whenever a new turn begins (client only)
  useEffect(() => {
    if (state.cities.length === 0 && state.turn === 1) return;
    writeSave("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turn]);

  // ============ RENDER ============
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#07070f";
    ctx.fillRect(0, 0, cv.width, cv.height);

    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const i = idx(x, y);
      if (!state.explored.has(i)) { ctx.fillStyle = "#0b0b16"; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); continue; }
      const tk = tiles[y][x];
      const px = x * TILE, py = y * TILE;
      paintTerrain(ctx, tk, px, py);

      if (world.rivers.has(i)) {
        ctx.strokeStyle = "#3d8fd4"; ctx.lineWidth = 3; ctx.lineCap = "round";
        const cxp = px + TILE / 2, cyp = py + TILE / 2;
        let drawn = false;
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
          if (world.rivers.has(idx(nx, ny)) || WATER(tiles[ny][nx])) {
            ctx.beginPath(); ctx.moveTo(cxp, cyp);
            ctx.lineTo(px + TILE / 2 + (dx * TILE) / 2, py + TILE / 2 + (dy * TILE) / 2);
            ctx.stroke(); drawn = true;
          }
        });
        if (!drawn) { ctx.beginPath(); ctx.arc(cxp, cyp, 2.5, 0, 7); ctx.stroke(); }
        ctx.lineWidth = 1;
      }

      const im = state.improvements[i];
      if (im) {
        if (im.road) {
          ctx.strokeStyle = "#8a5a2a"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(px + 2, py + TILE - 4); ctx.lineTo(px + TILE - 2, py + 4); ctx.stroke();
          ctx.lineWidth = 1;
        }
        if (im.irr) {
          ctx.strokeStyle = "#7dd4f0"; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 20); ctx.lineTo(px + 10, py + 20);
          ctx.moveTo(px + 14, py + 20); ctx.lineTo(px + 21, py + 20);
          ctx.moveTo(px + 4, py + 23); ctx.lineTo(px + 21, py + 23);
          ctx.stroke(); ctx.lineWidth = 1;
        }
        if (im.mine) {
          ctx.fillStyle = "#1a1a1a";
          ctx.beginPath(); ctx.moveTo(px + 13, py + 6); ctx.lineTo(px + 19, py + 15); ctx.lineTo(px + 7, py + 15); ctx.fill();
        }
      }

      const sp = world.specials[i];
      if (sp) {
        ctx.font = "11px serif"; ctx.textAlign = "center";
        ctx.fillText(SPECIALS[sp].icon, px + TILE - 7, py + 11);
      }

      if (state.huts.has(i)) {
        ctx.fillStyle = "#7a5230";
        ctx.fillRect(px + 8, py + 12, 10, 8);
        ctx.fillStyle = "#54381e";
        ctx.beginPath(); ctx.moveTo(px + 6, py + 12); ctx.lineTo(px + 13, py + 5); ctx.lineTo(px + 20, py + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#3a2814";
        ctx.fillRect(px + 11, py + 15, 4, 5);
      }

      ctx.strokeStyle = "rgba(0,0,0,0.13)";
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
    }

    // move highlights
    const selU = selected ? state.units.find((q) => q.id === selected) : null;
    if (selU && selU.civ === 0 && selU.moves > 0 && !gameOver) {
      const ship = isShip(selU.type);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = selU.x + dx, ny = selU.y + dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
        const water = WATER(tiles[ny][nx]);
        let ok = false, hostile = false;
        if (ship) {
          ok = water;
          hostile = water && state.units.some((q) => q.civ !== 0 && q.x === nx && q.y === ny);
        } else {
          if (!water) {
            hostile = state.units.some((q) => q.civ !== 0 && q.x === nx && q.y === ny) ||
              state.cities.some((c) => c.civ !== 0 && c.x === nx && c.y === ny);
            const destFriendly = state.units.some((q) => q.civ === 0 && !q.aboard && q.x === nx && q.y === ny) ||
              state.cities.some((c) => c.civ === 0 && c.x === nx && c.y === ny);
            // zone of control: can't slip between two enemy-controlled tiles
            const zocBlock = !hostile && !destFriendly &&
              enemyZOC(selU.x, selU.y, state.units, state.cities) && enemyZOC(nx, ny, state.units, state.cities);
            ok = !zocBlock;
          } else {
            // boarding
            ok = state.units.some((q) => q.civ === 0 && isShip(q.type) && q.x === nx && q.y === ny &&
              state.units.filter((z) => z.aboard === q.id).length < UNIT_TYPES[q.type].cap);
          }
        }
        if (!ok) continue;
        ctx.fillStyle = hostile ? "rgba(230,60,60,0.30)" : "rgba(255,255,255,0.16)";
        ctx.fillRect(nx * TILE + 1, ny * TILE + 1, TILE - 2, TILE - 2);
        if (hostile) {
          ctx.strokeStyle = "rgba(230,60,60,0.8)";
          ctx.strokeRect(nx * TILE + 1.5, ny * TILE + 1.5, TILE - 3, TILE - 3);
        }
      }
    }

    // cities
    state.cities.forEach((c) => {
      if (!state.explored.has(idx(c.x, c.y))) return;
      const px = c.x * TILE, py = c.y * TILE;
      paintCity(ctx, c, px, py, CIVS_DEF[c.civ].color, c.buildings.includes("walls"));
      if (notices.some((n) => n.cityId === c.id)) {
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(px + 6, py + 8, 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffd84d"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillText("!", px + 6, py + 11.5);
      }
      if (c.civ === 0 && cityUnhappy(c, state.wondersBuilt) > 0) {
        ctx.fillStyle = "#e84040";
        ctx.beginPath(); ctx.arc(px + TILE - 5, py + 7, 3, 0, 7); ctx.fill();
      }
      ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      const w = ctx.measureText(c.name).width + 6;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(px + TILE / 2 - w / 2, py - 12, w, 11);
      ctx.fillStyle = CIVS_DEF[c.civ].color;
      ctx.fillText(c.name, px + TILE / 2, py - 3);
    });

    // units (cargo hidden — рисуємо тільки тих, хто не на борту)
    state.units.forEach((u) => {
      if (u.aboard) return;
      if (!state.explored.has(idx(u.x, u.y))) return;
      const px = u.x * TILE, py = u.y * TILE;
      paintUnit(ctx, u, px, py, CIVS_DEF[u.civ].color);
      if (u.fortified) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
      }
      if (u.vet) {
        // gold veteran star, top-left
        ctx.fillStyle = "#ffd84d"; ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
          const a2 = a + Math.PI / 5;
          ctx.lineTo(px + 6 + Math.cos(a) * 3.6, py + 6 + Math.sin(a) * 3.6);
          ctx.lineTo(px + 6 + Math.cos(a2) * 1.6, py + 6 + Math.sin(a2) * 1.6);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (u.merc) {
        ctx.fillStyle = "#f5cf3d";
        ctx.beginPath(); ctx.arc(px + TILE - 6, py + 6, 3.5, 0, 7); ctx.fill();
        ctx.strokeStyle = "#000"; ctx.stroke();
      }
    });

    // pop-badges малюємо поверх юнітів, щоб гарнізон ніколи не перекривав рівень міста
    state.cities.forEach((c) => {
      if (!state.explored.has(idx(c.x, c.y))) return;
      const px = c.x * TILE, py = c.y * TILE;
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.beginPath(); ctx.arc(px + 7, py + TILE - 7, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = CIVS_DEF[c.civ].color; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
      ctx.fillText(String(c.pop), px + 7, py + TILE - 3.5);
    });

    // маршрути: прапорці цілей та пунктир для обраного юніта
    state.units.forEach((u) => {
      if (u.civ !== 0 || !u.dest) return;
      const fx = u.dest.x * TILE, fy = u.dest.y * TILE;
      ctx.strokeStyle = "#f5cf3d"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx + 8, fy + 5); ctx.lineTo(fx + 8, fy + 21); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "#f5cf3d";
      ctx.beginPath(); ctx.moveTo(fx + 8, fy + 5); ctx.lineTo(fx + 19, fy + 9); ctx.lineTo(fx + 8, fy + 13); ctx.closePath(); ctx.fill();
    });
    const selURoute = selected ? state.units.find((q) => q.id === selected) : null;
    if (selURoute && selURoute.dest) {
      ctx.strokeStyle = "rgba(245,207,61,0.65)"; ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(selURoute.x * TILE + TILE / 2, selURoute.y * TILE + TILE / 2);
      ctx.lineTo(selURoute.dest.x * TILE + TILE / 2, selURoute.dest.y * TILE + TILE / 2);
      ctx.stroke(); ctx.setLineDash([]);
    }

    if (selU && !selU.aboard) {
      ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(255,210,90,0.85)"; ctx.shadowBlur = 9;
      ctx.strokeRect(selU.x * TILE + 1.5, selU.y * TILE + 1.5, TILE - 3, TILE - 3);
      ctx.shadowBlur = 0; ctx.lineWidth = 1;
    }
    if (hover && state.explored.has(idx(hover.x, hover.y))) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.strokeRect(hover.x * TILE + 0.5, hover.y * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }, [state, selected, world, hover, gameOver, notices]);

  // ============ MINIMAP RENDER ============
  useEffect(() => {
    const cv = minimapRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const S = 3;
    ctx.fillStyle = "#0b0b16";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (!state.explored.has(idx(x, y))) continue;
      ctx.fillStyle = TERRAIN[tiles[y][x]].color;
      ctx.fillRect(x * S, y * S, S, S);
    }
    state.cities.forEach((c) => {
      if (!state.explored.has(idx(c.x, c.y))) return;
      ctx.fillStyle = "#000"; ctx.fillRect(c.x * S - 1, c.y * S - 1, S + 2, S + 2);
      ctx.fillStyle = CIVS_DEF[c.civ].color; ctx.fillRect(c.x * S, c.y * S, S, S);
    });
    state.units.forEach((u) => {
      if (u.aboard || !state.explored.has(idx(u.x, u.y))) return;
      ctx.fillStyle = CIVS_DEF[u.civ].color;
      ctx.fillRect(u.x * S, u.y * S, S, S);
    });
  }, [state, world, tiles]);

  // ============ ACTIONS ============
  const toTileCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) * (canvasRef.current.width / rect.width)) / TILE);
    const y = Math.floor(((e.clientY - rect.top) * (canvasRef.current.height / rect.height)) / TILE);
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop, moved: false };
  };

  const endPan = () => {
    if (panRef.current && panRef.current.moved) justDraggedRef.current = true;
    panRef.current = null;
  };

  const handleMove = (e) => {
    // drag-to-pan: move the viewport with the mouse
    if (panRef.current) {
      const dx = e.clientX - panRef.current.sx, dy = e.clientY - panRef.current.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panRef.current.moved = true;
      const wrap = mapWrapRef.current;
      if (wrap) { wrap.scrollLeft = panRef.current.sl - dx; wrap.scrollTop = panRef.current.st - dy; updateViewRect(); }
      setHover(null); setMousePos(null);
      return;
    }
    setMousePos({ cx: e.clientX, cy: e.clientY });
    const { x, y } = toTileCoords(e);
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) { setHover(null); return; }
    if (!hover || hover.x !== x || hover.y !== y) setHover({ x, y });
  };

  const moveShipWithCargo = (units, ship, x, y) =>
    units.map((q) => {
      if (q.id === ship.id) return { ...q, x, y, moves: q.moves - 1 };
      if (q.aboard === ship.id) return { ...q, x, y };
      return q;
    });

  const handleTileAction = (x, y) => {
    if (gameOver) return;
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return;
    const msgs = [];

    if (selected) {
      const u = state.units.find((q) => q.id === selected);
      if (u && u.civ === 0) {
        const dx = Math.abs(x - u.x), dy = Math.abs(y - u.y);
        if (dx <= 1 && dy <= 1 && dx + dy > 0 && u.moves > 0) {
          const water = WATER(tiles[y][x]);

          // ---- SHIP MOVEMENT ----
          if (isShip(u.type)) {
            if (!water) { addLogs(["Кораблі не виходять на сушу."]); return; }
            const enemiesHere = state.units.filter((q) => q.x === x && q.y === y && q.civ !== 0 && !q.aboard);
            if (enemiesHere.length > 0) {
              const enemyCiv = enemiesHere[0].civ;
              let newState = { ...state };
              if (state.relations[enemyCiv] === "peace") {
                newState = { ...newState, relations: { ...newState.relations, [enemyCiv]: "war" } };
                msgs.push(`⚔ Ви оголосили війну: ${CIVS_DEF[enemyCiv].name}!`);
              }
              const defInfo = bestDefender(enemiesHere, world, x, y, false);
              const win = doCombat(u, defInfo);
              let units;
              if (win) {
                units = newState.units.filter((q) => q.id !== defInfo.unit.id && q.aboard !== defInfo.unit.id)
                  .map((q) => q.id === u.id ? { ...q, moves: 0, vet: q.vet || Math.random() < 0.3 } : q);
                msgs.push(`Перемога на морі! Знищено ${UNIT_TYPES[defInfo.unit.type].name}.`);
              } else {
                units = newState.units.filter((q) => q.id !== u.id && q.aboard !== u.id);
                msgs.push(`Ваша ${UNIT_TYPES[u.type].name} затонула.`);
              }
              setState({ ...newState, units });
              setSelected(null); addLogs(msgs); return;
            }
            setState((st) => ({ ...st, units: moveShipWithCargo(st.units, u, x, y) }));
            return;
          }

          // ---- LAND UNIT onto WATER: boarding ----
          if (water) {
            const ship = state.units.find((q) => q.civ === 0 && isShip(q.type) && q.x === x && q.y === y &&
              state.units.filter((z) => z.aboard === q.id).length < UNIT_TYPES[q.type].cap);
            if (ship) {
              setState((st) => ({
                ...st,
                units: st.units.map((q) => q.id === u.id ? { ...q, x, y, moves: 0, aboard: ship.id, fortified: false } : q),
              }));
              addLogs([`${UNIT_TYPES[u.type].name} піднявся на борт.`]);
              setSelected(null);
              return;
            }
            addLogs(["Сухопутні юніти не плавають. Потрібна трирема."]); return;
          }

          // ---- LAND MOVEMENT (incl. disembark) ----
          const enemiesHere = state.units.filter((q) => q.x === x && q.y === y && q.civ !== 0);
          const enemyCity = state.cities.find((c) => c.x === x && c.y === y && c.civ !== 0);

          if (enemiesHere.length > 0) {
            const enemyCiv = enemiesHere[0].civ;
            if (UNIT_TYPES[u.type].att === 0) { addLogs(["Поселенець не атакує."]); return; }
            let newState = { ...state };
            if (state.relations[enemyCiv] === "peace") {
              newState = { ...newState, relations: { ...newState.relations, [enemyCiv]: "war" } };
              msgs.push(`⚔ Ви оголосили війну: ${CIVS_DEF[enemyCiv].name}!`);
            }
            const cityHere = state.cities.find((c) => c.x === x && c.y === y);
            const hasWalls = cityHere && cityHere.buildings.includes("walls");
            const defInfo = bestDefender(enemiesHere, world, x, y, hasWalls);
            const win = doCombat(u, defInfo);
            let units;
            if (win) {
              units = newState.units.filter((q) => q.id !== defInfo.unit.id)
                .map((q) => q.id === u.id ? { ...q, moves: 0, vet: q.vet || Math.random() < 0.3, aboard: null } : q);
              msgs.push(`Перемога! ${UNIT_TYPES[u.type].name} знищив ${UNIT_TYPES[defInfo.unit.type].name}.`);
            } else {
              units = newState.units.filter((q) => q.id !== u.id);
              msgs.push(`Ваш ${UNIT_TYPES[u.type].name} загинув в атаці.`);
            }
            playSound(win ? "win" : "lose");
            setState({ ...newState, units });
            setSelected(null); addLogs(msgs); return;
          }

          if (enemyCity) {
            let newState = { ...state };
            if (state.relations[enemyCity.civ] === "peace") {
              newState = { ...newState, relations: { ...newState.relations, [enemyCity.civ]: "war" } };
              msgs.push(`⚔ Ви оголосили війну: ${CIVS_DEF[enemyCity.civ].name}!`);
            }
            newState = {
              ...newState,
              cities: newState.cities.map((c) => c.id === enemyCity.id ? { ...c, civ: 0, pop: Math.max(1, c.pop - 1) } : c),
              units: newState.units.map((q) => q.id === u.id ? { ...q, x, y, moves: 0, aboard: null } : q),
            };
            msgs.push(`🏛 Захоплено місто ${enemyCity.name}!`);
            setState(newState); setSelected(null); addLogs(msgs); return;
          }

          // зона контролю: не можна прослизнути повз ворога на сусідню вільну клітину
          {
            const destFriendly = state.units.some((q) => q.civ === 0 && !q.aboard && q.x === x && q.y === y) ||
              state.cities.some((c) => c.civ === 0 && c.x === x && c.y === y);
            if (!destFriendly && enemyZOC(u.x, u.y, state.units, state.cities) && enemyZOC(x, y, state.units, state.cities)) {
              addLogs(["⛔ Зона контролю: поряд ворог. Можна лише атакувати або відійти на вільну клітину далі від нього."]);
              return;
            }
          }

          // звичайний рух (+ хатина племені)
          if (state.huts.has(idx(x, y))) {
            const roll = Math.random();
            setState((st) => {
              let units2 = st.units.map((q) => q.id === u.id ? { ...q, x, y, moves: Math.max(0, q.moves - stepCost(u.type, tiles[y][x])), fortified: false, aboard: null } : q);
              let gold = st.gold;
              let research = st.research;
              let nextId = st.nextId;
              const huts = new Set(st.huts); huts.delete(idx(x, y));
              const hm = [];
              if (roll < 0.3) {
                const g = 25 + Math.floor(Math.random() * 51);
                gold += g;
                hm.push(`🛖 Плем'я дарує ${g} золота!`);
              } else if (roll < 0.5) {
                units2 = [...units2, { id: nextId++, civ: 0, type: "horseman", x, y, moves: 0, fortified: false, vet: false, aboard: null }];
                hm.push("🛖 Плем'я приєднується: Вершник!");
              } else if (roll < 0.65) {
                units2 = [...units2, { id: nextId++, civ: 0, type: "settler", x, y, moves: 0, fortified: false, vet: false, aboard: null }];
                hm.push("🛖 Плем'я приєднується: Поселенець!");
              } else if (roll < 0.8) {
                const open = Object.entries(TECHS).filter(([tk2, tv2]) => !research.done.includes(tk2) && tk2 !== research.current && tv2.req.every((r) => research.done.includes(r)));
                if (open.length) {
                  const [tk, tv] = open[Math.floor(Math.random() * open.length)];
                  research = { ...research, done: [...research.done, tk] };
                  hm.push(`🛖 Мудреці племені відкривають: ${tv.name}!`);
                } else {
                  gold += 50; hm.push("🛖 Плем'я дарує 50 золота!");
                }
              } else {
                let spawned = 0;
                for (let dy2 = -1; dy2 <= 1 && spawned < 2; dy2++) for (let dx2 = -1; dx2 <= 1 && spawned < 2; dx2++) {
                  if (!dx2 && !dy2) continue;
                  const bx = x + dx2, by = y + dy2;
                  if (bx < 0 || bx >= MAP_W || by < 0 || by >= MAP_H) continue;
                  if (WATER(tiles[by][bx])) continue;
                  units2 = [...units2, { id: nextId++, civ: BARB, type: st.turn < 30 * (gameLen / END_TURN) ? "warrior" : "legion", x: bx, y: by, moves: 0, fortified: false, vet: false, aboard: null }];
                  spawned++;
                }
                hm.push("🛖 Засідка! З хатини вискакують варвари!");
              }
              addLogs(hm);
              return { ...st, units: units2, gold, research, nextId, huts };
            });
            return;
          }
          playSound("move");
          setState((st) => ({
            ...st,
            units: st.units.map((q) => q.id === u.id ? { ...q, x, y, moves: Math.max(0, q.moves - stepCost(u.type, tiles[y][x])), fortified: false, aboard: null, dest: null } : q),
          }));
          return;
        } else if (dx + dy > 1) {
          // далека клітинка → прокласти маршрут
          const ownHere = state.cities.some((c) => c.civ === 0 && c.x === x && c.y === y) ||
            state.units.some((q) => q.civ === 0 && !q.aboard && q.x === x && q.y === y);
          if (!ownHere) {
            if (!state.explored.has(idx(x, y))) { addLogs(["🧭 Не можна прокласти маршрут у недосліджені землі."]); return; }
            const path = findPath(world, state.units, state.cities, state.huts, u, x, y);
            if (!path) { addLogs(["🧭 Шлях не знайдено — ціль недосяжна або заблокована."]); return; }
            setState((st) => {
              let units2 = st.units.map((q) => ({ ...q }));
              const me = units2.find((q) => q.id === u.id);
              me.dest = { x, y };
              let stepI = 0;
              while (me.moves > 0 && stepI < path.length) {
                const stp = path[stepI];
                const enemyNear = units2.some((q) => q.civ !== 0 && !q.aboard && Math.abs(q.x - stp.x) <= 1 && Math.abs(q.y - stp.y) <= 1);
                if (enemyNear) break;
                me.x = stp.x; me.y = stp.y; me.moves = Math.max(0, me.moves - stepCost(me.type, tiles[stp.y][stp.x])); me.fortified = false; stepI++;
              }
              if (me.x === x && me.y === y) me.dest = null;
              if (isShip(me.type)) units2 = units2.map((q) => q.aboard === me.id ? { ...q, x: me.x, y: me.y } : q);
              return { ...st, units: units2 };
            });
            addLogs([`🧭 ${UNIT_TYPES[u.type].name}: маршрут прокладено — ${path.length} кл. Юніт рухатиметься сам щоходу.`]);
            return;
          }
        } else if (dx <= 1 && dy <= 1 && dx + dy > 0 && u.moves <= 0) {
          const enemyThere = state.units.some((q) => q.x === x && q.y === y && q.civ !== 0 && !q.aboard) ||
            state.cities.some((c) => c.x === x && c.y === y && c.civ !== 0);
          if (enemyThere && UNIT_TYPES[u.type].att > 0) { addLogs(["⌛ Юніт вичерпав ходи — атака можлива наступного ходу."]); return; }
        }
      }
    }

    const city = state.cities.find((c) => c.x === x && c.y === y && c.civ === 0);
    const mine = state.units.filter((q) => q.x === x && q.y === y && q.civ === 0 && !q.aboard);
    const cargo = state.units.filter((q) => q.x === x && q.y === y && q.civ === 0 && q.aboard);
    const all = [...mine, ...cargo];
    if (all.length > 0) {
      const cur = all.findIndex((q) => q.id === selected);
      setSelected(all[(cur + 1) % all.length].id);
      setCityView(city ? city.id : null);
      return;
    }
    if (city) { setCityView(city.id); setSelected(null); return; }
    setSelected(null); setCityView(null);
  };

  const handleCanvasClick = (e) => {
    if (justDraggedRef.current) { justDraggedRef.current = false; return; } // it was a pan, not a click
    const { x, y } = toTileCoords(e);
    handleTileAction(x, y);
  };

  const selUnit = selected ? state.units.find((u) => u.id === selected) : null;

  const foundCity = () => {
    const u = selUnit;
    if (!u || u.type !== "settler" || u.moves <= 0 || u.aboard) return;
    if (state.cities.some((c) => Math.abs(c.x - u.x) <= 1 && Math.abs(c.y - u.y) <= 1)) {
      addLogs(["Занадто близько до іншого міста."]); return;
    }
    const name = CIVS_DEF[0].cityNames[state.cityCounters[0] % 8];
    const cc = [...state.cityCounters]; cc[0]++;
    setState((st) => ({
      ...st, cityCounters: cc,
      cities: [...st.cities, { id: st.nextId, civ: 0, x: u.x, y: u.y, name, pop: 1, food: 0, shields: 0, building: "warrior", buildings: [] }],
      nextId: st.nextId + 1,
      units: st.units.filter((q) => q.id !== u.id),
    }));
    addLogs([`🏛 Засновано ${name}!`]);
    playSound("city");
    setSelected(null);
  };

  const buildImprovement = (kind) => {
    const u = selUnit;
    if (!u || u.type !== "settler" || u.moves <= 0 || u.aboard) return;
    const i = idx(u.x, u.y);
    setState((st) => ({
      ...st,
      improvements: { ...st.improvements, [i]: { ...(st.improvements[i] || {}), [kind]: true } },
      units: st.units.map((q) => q.id === u.id ? { ...q, moves: 0 } : q),
    }));
    addLogs([`Поселенець збудував ${{ road: "дорогу", irr: "зрошення", mine: "шахту" }[kind]}.`]);
  };

  const hireBarb = (barbId) => {
    const b = state.units.find((q) => q.id === barbId);
    const d = selUnit;
    if (!b || !d || d.type !== "diplomat" || d.moves <= 0) return;
    const cost = UNIT_TYPES[b.type].cost;
    if (state.gold < cost) { addLogs([`Не вистачає золота для найму (потрібно ${cost}).`]); return; }
    setState((st) => ({
      ...st, gold: st.gold - cost,
      units: st.units.map((q) =>
        q.id === barbId ? { ...q, civ: 0, merc: true, fortified: false, moves: 0 } :
        q.id === d.id ? { ...q, moves: 0 } : q),
    }));
    addLogs([`💰 Найнято варварського ${UNIT_TYPES[b.type].name} за ${cost} золота. Утримання: ${Math.ceil(cost / 10)} золота/хід.`]);
  };

  const dismissMerc = () => {
    const u = selUnit;
    if (!u || !u.merc) return;
    setState((st) => ({ ...st, units: st.units.map((q) => q.id === u.id ? { ...q, civ: BARB, merc: false, fortified: false } : q) }));
    addLogs([`🏴 Найманця розпущено — ${UNIT_TYPES[u.type].name} повернувся до варварів і може напасти!`]);
    setSelected(null);
  };

  const fortify = () => { setState((st) => ({ ...st, units: st.units.map((q) => q.id === selected ? { ...q, fortified: true, moves: 0 } : q) })); setSelected(null); };
  const skipUnit = () => { setState((st) => ({ ...st, units: st.units.map((q) => q.id === selected ? { ...q, moves: 0 } : q) })); setSelected(null); };
  const disband = () => {
    setState((st) => ({ ...st, units: st.units.filter((q) => q.id !== selected && q.aboard !== selected) }));
    setSelected(null);
  };
  const nextUnit = () => {
    const movable = state.units.filter((u) => u.civ === 0 && u.moves > 0 && !u.fortified && !u.aboard && !u.dest);
    if (!movable.length) { addLogs(["Усі юніти вже походили."]); return; }
    const cur = movable.findIndex((u) => u.id === selected);
    setSelected(movable[(cur + 1) % movable.length].id);
    setCityView(null);
  };

  const offerPeace = (civ) => {
    const myMil = state.units.filter((u) => u.civ === 0 && UNIT_TYPES[u.type].att > 0).length;
    const theirMil = state.units.filter((u) => u.civ === civ && UNIT_TYPES[u.type].att > 0).length;
    if (Math.random() < 0.4 + (myMil > theirMil ? 0.35 : 0)) {
      setState((st) => ({ ...st, relations: { ...st.relations, [civ]: "peace" } }));
      addLogs([`🕊 ${CIVS_DEF[civ].name} погодились на мир!`]);
    } else addLogs([`${CIVS_DEF[civ].name} відхилили пропозицію миру.`]);
  };
  const declareWar = (civ) => {
    setState((st) => ({ ...st, relations: { ...st.relations, [civ]: "war" } }));
    addLogs([`⚔ Ви оголосили війну: ${CIVS_DEF[civ].name}!`]);
  };

  const startRevolution = (target) => {
    if (state.government === target || state.anarchy) return;
    setState((st) => ({ ...st, anarchy: { turns: 2, target }, government: "despotism" }));
    addLogs([`🔥 Революція! 2 ходи анархії, потім — ${GOVERNMENTS[target].name}.`]);
  };

  const rushBuy = () => {
    const c = state.cities.find((q) => q.id === cityView);
    if (!c) return;
    const target = UNIT_TYPES[c.building] || BUILDINGS[c.building] || WONDERS[c.building];
    const cost = (target.cost - c.shields) * 2;
    if (cost <= 0) return;
    if (state.gold < cost) { addLogs([`Не вистачає золота (потрібно ${cost}).`]); return; }
    setState((st) => ({
      ...st, gold: st.gold - cost,
      cities: st.cities.map((q) => q.id === c.id ? { ...q, shields: target.cost } : q),
    }));
    addLogs([`💰 Прискорено будівництво за ${cost} золота.`]);
  };

  // ============ END TURN ============
  const endTurn = () => {
    if (gameOver) return;
    const msgs = [];
    const notes = [];
    let noteId = Date.now();
    const st = state;
    let units = st.units.map((u) => ({ ...u, moves: UNIT_TYPES[u.type].move }));
    let cities = st.cities.map((c) => ({ ...c }));
    let { nextId, gold, taxRate } = st;
    let government = st.government;
    let anarchy = st.anarchy ? { ...st.anarchy } : null;
    let cityCounters = [...st.cityCounters];
    let relations = { ...st.relations };
    let research = { ...st.research, done: [...st.research.done] };
    let wondersBuilt = { ...st.wondersBuilt };
    const improvements = st.improvements;
    const turn = st.turn;
    // stretch AI/barbarian progression proportionally to the chosen game length (140 = baseline)
    const techScale = gameLen / END_TURN;
    let huts = new Set(st.huts);

    // марш юнітів за прокладеними маршрутами
    units = units.map((u) => {
      if (u.civ !== 0 || !u.dest || u.aboard) return u;
      let cur = { ...u };
      let guard = 0;
      while (cur.moves > 0 && cur.dest && guard++ < 12) {
        if (cur.x === cur.dest.x && cur.y === cur.dest.y) { cur.dest = null; break; }
        const path = findPath(world, units, cities, huts, cur, cur.dest.x, cur.dest.y);
        if (!path || !path.length) {
          msgs.push(`🧭 ${UNIT_TYPES[cur.type].name}: шлях заблоковано — маршрут скасовано.`);
          cur = { ...cur, dest: null };
          break;
        }
        const stp = path[0];
        const enemyNear = units.some((q) => q && q.civ !== 0 && !q.aboard && Math.abs(q.x - stp.x) <= 1 && Math.abs(q.y - stp.y) <= 1);
        if (enemyNear) {
          msgs.push(`⚠ ${UNIT_TYPES[cur.type].name} зупинив марш — ворог поруч!`);
          notes.push({ id: noteId++, icon: "⚠", text: `${UNIT_TYPES[cur.type].name} перервав марш: помічено ворога поруч (${stp.x},${stp.y}). Дайте новий наказ.`, cityId: null, kind: "alert" });
          cur = { ...cur, dest: null };
          break;
        }
        cur = { ...cur, x: stp.x, y: stp.y, moves: Math.max(0, cur.moves - stepCost(cur.type, tiles[stp.y][stp.x])), fortified: false };
        if (cur.dest && cur.x === cur.dest.x && cur.y === cur.dest.y) {
          msgs.push(`🧭 ${UNIT_TYPES[cur.type].name} прибув у пункт призначення.`);
          cur = { ...cur, dest: null };
        }
      }
      return cur;
    });
    // пасажири слідують за своїми кораблями
    units = units.map((q) => {
      if (!q.aboard) return q;
      const sh = units.find((s) => s.id === q.aboard);
      return sh ? { ...q, x: sh.x, y: sh.y } : q;
    });

    // періодичні набіги варварів
    if (turn >= 10 && turn % 7 === 0) {
      const barbType = turn < 30 * techScale ? "warrior" : turn < 70 * techScale ? "legion" : "knight";
      for (let tries = 0; tries < 200; tries++) {
        const bx = 1 + Math.floor(Math.random() * (MAP_W - 2));
        const by = 1 + Math.floor(Math.random() * (MAP_H - 2));
        if (WATER(tiles[by][bx])) continue;
        const farFromCities = cities.every((c) => Math.abs(c.x - bx) + Math.abs(c.y - by) > 5);
        if (!farFromCities) continue;
        units.push({ id: nextId++, civ: BARB, type: barbType, x: bx, y: by, moves: 0, fortified: false, vet: false, aboard: null });
        units.push({ id: nextId++, civ: BARB, type: barbType, x: bx, y: by, moves: 0, fortified: false, vet: false, aboard: null });
        if (st.explored.has(idx(bx, by))) {
          msgs.push("⚠ Помічено орду варварів!");
          notes.push({ id: noteId++, icon: "⚠", text: "На ваших землях помічено орду варварів!", cityId: null, kind: "alert" });
        } else {
          msgs.push("Чутки про варварів на далеких землях...");
        }
        break;
      }
    }

    // anarchy countdown
    if (anarchy) {
      anarchy.turns--;
      if (anarchy.turns <= 0) {
        government = anarchy.target;
        msgs.push(`👑 Встановлено уряд: ${GOVERNMENTS[government].name}!`);
        anarchy = null;
      }
    }

    // cities
    cities = cities.map((c) => {
      const unh = cityUnhappy(c, wondersBuilt);
      const disorder = unh > 0;
      const y = cityYields(c, world, improvements, wondersBuilt, government);
      let food = c.food + y.food;
      let pop = c.pop;
      const box = pop * 10 + 10;
      if (food >= box) {
        pop++;
        food = c.buildings.includes("granary") ? Math.floor(box / 2) : 0;
        if (c.civ === 0) msgs.push(`${c.name} виросло до ${pop}.`);
      }
      let shields = c.shields + (disorder ? 0 : y.shields);
      if (disorder && c.civ === 0) {
        msgs.push(`😡 Заворушення в ${c.name} — виробництво зупинено!`);
        const hasTemple = c.buildings.includes("temple");
        notes.push({ id: noteId++, icon: "😡", text: hasTemple
          ? `Заворушення в ${c.name}! Виробництво і торгівля зупинені. Храм уже збудовано — потрібне чудо щастя (Висячі сади / Оракул) або стримайте ріст міста.`
          : `Заворушення в ${c.name}! Виробництво і торгівля зупинені. Збудуйте Храм.`, cityId: c.id, kind: "alert" });
      }
      let building = c.building;
      const tU = UNIT_TYPES[building], tB = BUILDINGS[building], tW = WONDERS[building];
      const cost = (tU || tB || tW || { cost: 9999 }).cost;
      if (shields >= cost) {
        shields = 0;
        if (tU) {
          const vet = c.buildings.includes("barracks");
          let ux = c.x, uy = c.y;
          if (tU.sea) {
            // знайти сусідню воду
            let spot = null;
            for (let dy = -1; dy <= 1 && !spot; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = c.x + dx, ny = c.y + dy;
              if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && WATER(tiles[ny][nx])) { spot = { x: nx, y: ny }; break; }
            }
            if (spot) { ux = spot.x; uy = spot.y; } else { return { ...c, food, pop, shields: cost, building }; }
          }
          units.push({ id: nextId++, civ: c.civ, type: building, x: ux, y: uy, moves: 0, fortified: false, vet, aboard: null });
          if (c.civ === 0) {
            msgs.push(`${c.name}: збудовано ${tU.name}${vet ? " ★" : ""}.`);
            notes.push({ id: noteId++, icon: "🛠", text: `${c.name}: готовий ${tU.name}${vet ? " ★" : ""}. Місто продовжує будувати: ${tU.name}.`, cityId: c.id, kind: "prod" });
          }
          if (building === "settler" && pop > 1) pop--;
          if (c.civ === 0 && building === "settler" && pop === 1) building = "warrior";
        } else if (tB) {
          c.buildings = [...c.buildings, building];
          if (c.civ === 0) {
            msgs.push(`${c.name}: збудовано ${tB.name}.`);
            notes.push({ id: noteId++, icon: "🏗", text: `${c.name}: завершено ${tB.name}! Виробництво переключено на Воїна — оберіть нове.`, cityId: c.id, kind: "prod" });
          }
          building = "warrior";
        } else if (tW) {
          if (!wondersBuilt[building]) {
            wondersBuilt[building] = c.civ;
            msgs.push(`🌟 ${c.name} звело чудо світу: ${tW.name}!`);
            if (c.civ === 0) notes.push({ id: noteId++, icon: "🌟", text: `${c.name} звело чудо світу: ${tW.name}! Виробництво переключено на Воїна.`, cityId: c.id, kind: "prod" });
          }
          building = "warrior";
        }
      }
      return { ...c, food, pop, shields, building };
    });

    // player economy: торгівля → податки/наука
    let sci = 0, income = 0;
    if (!anarchy) {
      cities.filter((c) => c.civ === 0).forEach((c) => {
        if (cityUnhappy(c, wondersBuilt) > 0) return; // заворушення: немає торгівлі
        const y = cityYields(c, world, improvements, wondersBuilt, government);
        let goldPart = (y.trade * taxRate) / 100;
        let sciPart = y.trade - goldPart;
        if (c.buildings.includes("marketplace")) goldPart *= 1.5;
        if (c.buildings.includes("library")) sciPart *= 1.5;
        income += Math.round(goldPart);
        sci += Math.round(sciPart);
      });
      if (wondersBuilt.great_library === 0) sci += 4;
      if (wondersBuilt.colossus === 0) income += 4;
    } else {
      msgs.push("🔥 Анархія: казна та наука не працюють.");
    }
    gold += income;

    // утримання найманців
    const mercUnits = units.filter((u) => u && u.civ === 0 && u.merc);
    if (mercUnits.length > 0) {
      const upkeep = mercUnits.reduce((s, u) => s + Math.ceil(UNIT_TYPES[u.type].cost / 10), 0);
      if (gold >= upkeep) {
        gold -= upkeep;
      } else {
        units = units.map((u) => u && u.civ === 0 && u.merc ? { ...u, civ: BARB, merc: false, fortified: false } : u);
        msgs.push(`⚠ Казна порожня — ${mercUnits.length} найманців дезертирували!`);
        notes.push({ id: noteId++, icon: "⚠", text: `Не було чим платити утримання (${upkeep} зол.) — ${mercUnits.length} найманців дезертирували й знову стали варварами поруч із вашими землями!`, cityId: null, kind: "alert" });
      }
    }

    if (research.current && !anarchy) {
      research.points += sci;
      if (research.points >= TECHS[research.current].cost) {
        msgs.push(`🔬 Відкрито: ${TECHS[research.current].name}!`);
        notes.push({ id: noteId++, icon: "🔬", text: `Відкрито технологію: ${TECHS[research.current].name}! Оберіть новий напрям досліджень.`, cityId: null, kind: "tech" });
        research = { current: null, points: 0, done: [...research.done, research.current] };
        playSound("tech");
      }
    }

    // AI
    const tier = [...AI_TIERS].reverse().find((t) => turn >= t.turn * techScale).units;
    const playerThings = [
      ...units.filter((u) => u.civ === 0 && !isShip(u.type)).map((u) => ({ x: u.x, y: u.y })),
      ...cities.filter((c) => c.civ === 0).map((c) => ({ x: c.x, y: c.y })),
    ];

    cities = cities.map((c) => {
      if (c.civ === 0) return c;
      if (c.building === "warrior" || !UNIT_TYPES[c.building]) {
        const wantSettler = c.pop >= 3 && Math.random() < 0.3;
        return { ...c, building: wantSettler ? "settler" : tier[Math.floor(Math.random() * tier.length)] };
      }
      return c;
    });

    ENEMY_CIVS.forEach((civ) => {
      if (!st.civAlive[civ]) return;
      const theirMil = units.filter((u) => u.civ === civ && UNIT_TYPES[u.type].att > 0).length;
      const myMil = units.filter((u) => u.civ === 0 && UNIT_TYPES[u.type].att > 0).length;
      if (relations[civ] === "peace" && turn > 18 && theirMil > myMil * 1.6 && Math.random() < 0.06) {
        relations[civ] = "war";
        msgs.push(`⚔ ${CIVS_DEF[civ].name} оголосили вам війну!`);
        notes.push({ id: noteId++, icon: "⚔", text: `${CIVS_DEF[civ].name} оголосили вам війну!`, cityId: null, kind: "alert" });
      } else if (relations[civ] === "war" && theirMil < myMil * 0.5 && Math.random() < 0.15) {
        relations[civ] = "peace";
        msgs.push(`🕊 ${CIVS_DEF[civ].name} просять миру — мир укладено.`);
      }
    });

    const aiMove = (u) => {
      const steps = UNIT_TYPES[u.type].move;
      let cur = { ...u };
      for (let s = 0; s < steps; s++) {
        if (cur.type === "settler") {
          const t = tiles[cur.y][cur.x];
          const near = cities.some((c) => Math.abs(c.x - cur.x) <= 2 && Math.abs(c.y - cur.y) <= 2);
          if ((t === "grass" || t === "plains") && !near) {
            const name = CIVS_DEF[cur.civ].cityNames[cityCounters[cur.civ] % 8];
            cityCounters[cur.civ]++;
            cities.push({ id: nextId++, civ: cur.civ, x: cur.x, y: cur.y, name, pop: 1, food: 0, shields: 0, building: "warrior", buildings: [] });
            return null;
          }
        }
        const atWar = cur.civ === BARB || relations[cur.civ] === "war";
        let dx, dy;
        if (atWar && UNIT_TYPES[cur.type].att > 0 && playerThings.length) {
          let target = null, best = 1e9;
          playerThings.forEach((m) => {
            const d = Math.abs(m.x - cur.x) + Math.abs(m.y - cur.y);
            if (d < best) { best = d; target = m; }
          });
          if (best < 14) { dx = Math.sign(target.x - cur.x); dy = Math.sign(target.y - cur.y); }
          else { dx = Math.floor(Math.random() * 3) - 1; dy = Math.floor(Math.random() * 3) - 1; }
        } else {
          dx = Math.floor(Math.random() * 3) - 1; dy = Math.floor(Math.random() * 3) - 1;
        }
        const nx = Math.max(0, Math.min(MAP_W - 1, cur.x + dx));
        const ny = Math.max(0, Math.min(MAP_H - 1, cur.y + dy));
        if (WATER(tiles[ny][nx])) continue;
        const playerUnitsHere = units.filter((q) => q && q.civ === 0 && q.x === nx && q.y === ny && !q.aboard && !isShip(q.type));
        const playerCityHere = cities.find((c) => c.civ === 0 && c.x === nx && c.y === ny);
        if (playerUnitsHere.length > 0) {
          if (!atWar || UNIT_TYPES[cur.type].att === 0) continue;
          const hasWalls = playerCityHere && playerCityHere.buildings.includes("walls");
          const defInfo = bestDefender(playerUnitsHere, world, nx, ny, hasWalls);
          const win = doCombat(cur, defInfo);
          if (win) {
            msgs.push(`Ворожий ${UNIT_TYPES[cur.type].name} (${CIVS_DEF[cur.civ].name}) знищив ваш ${UNIT_TYPES[defInfo.unit.type].name}!`);
            units = units.map((q) => q && q.id === defInfo.unit.id ? null : q);
            const stillDefended = units.some((q) => q && q.civ === 0 && q.x === nx && q.y === ny && !q.aboard && !isShip(q.type));
            // ворог не заходить на клітину/в місто, доки там лишається бодай один захисник
            if (playerCityHere || stillDefended) return cur;
            return { ...cur, x: nx, y: ny };
          } else {
            msgs.push(`Ваш ${UNIT_TYPES[defInfo.unit.type].name} відбив атаку ${CIVS_DEF[cur.civ].name}!`);
            return null;
          }
        }
        if (playerCityHere) {
          if (!atWar || UNIT_TYPES[cur.type].att === 0) continue;
          if (cur.civ === BARB) {
            const roll = Math.random();
            const succ = SUCCESSORS.find((sc) => !cities.some((c) => c.civ === sc) && !units.some((q) => q && q.civ === sc));
            if (roll < 0.3 && succ) {
              // народження нової цивілізації
              cities = cities.map((c) => c.id === playerCityHere.id
                ? { ...c, civ: succ, name: CIVS_DEF[succ].cityNames[0], pop: Math.max(1, c.pop - 1), buildings: [], building: "warrior" } : c);
              relations[succ] = "war";
              const bt = tier[Math.floor(Math.random() * tier.length)];
              units.push({ id: nextId++, civ: succ, type: bt, x: nx, y: ny, moves: 0, fortified: true, vet: false, aboard: null });
              units.push({ id: nextId++, civ: succ, type: bt, x: nx, y: ny, moves: 0, fortified: true, vet: false, aboard: null });
              msgs.push(`🏴 На руїнах ${playerCityHere.name} народжується нова цивілізація: ${CIVS_DEF[succ].name}!`);
              notes.push({ id: noteId++, icon: "🏴", text: `Орда захопила ${playerCityHere.name} — на його руїнах постає нова цивілізація: ${CIVS_DEF[succ].name}! Столиця перейменована на ${CIVS_DEF[succ].cityNames[0]}. Вони у стані війни з вами.`, cityId: null, kind: "alert" });
              return null; // ватажок орди стає правителем
            } else if (roll < 0.6) {
              // місто в анархії під варварами
              cities = cities.map((c) => c.id === playerCityHere.id
                ? { ...c, civ: BARB, pop: Math.max(1, c.pop - 1), buildings: [], building: "warrior" } : c);
              msgs.push(`😡 ${playerCityHere.name} занурюється в анархію під владою варварів!`);
              notes.push({ id: noteId++, icon: "😡", text: `Варвари захопили ${playerCityHere.name} — місто в анархії та плодить нові орди. Відбийте його, поки не пізно!`, cityId: null, kind: "alert" });
            } else {
              // повне розграбування
              cities = cities.filter((c) => c.id !== playerCityHere.id);
              msgs.push(`🔥 Варвари сплюндрували ${playerCityHere.name}!`);
              notes.push({ id: noteId++, icon: "🔥", text: `Варвари дощенту сплюндрували ваше місто ${playerCityHere.name} — його стерто з мапи!`, cityId: null, kind: "alert" });
            }
          } else {
            cities = cities.map((c) => c.id === playerCityHere.id ? { ...c, civ: cur.civ, pop: Math.max(1, c.pop - 1) } : c);
            msgs.push(`💔 ${CIVS_DEF[cur.civ].name} захопили ${playerCityHere.name}!`);
            notes.push({ id: noteId++, icon: "💔", text: `${CIVS_DEF[cur.civ].name} захопили ваше місто ${playerCityHere.name}!`, cityId: null, kind: "alert" });
          }
          return { ...cur, x: nx, y: ny };
        }
        if (cities.find((c) => c.civ !== cur.civ && c.civ !== 0 && c.x === nx && c.y === ny)) continue;
        cur = { ...cur, x: nx, y: ny };
        huts.delete(idx(nx, ny));
      }
      return cur;
    };
    units = units.map((u) => (u && u.civ !== 0 ? aiMove(u) : u)).filter(Boolean);

    const civAlive = CIVS_DEF.map((_, civ) => civ === BARB ? true :
      cities.some((c) => c.civ === civ) || units.some((u) => u && u.civ === civ && u.type === "settler"));
    ENEMY_CIVS.forEach((civ) => {
      if (st.civAlive[civ] && !civAlive[civ]) {
        msgs.push(`☠ Цивілізацію ${CIVS_DEF[civ].name} знищено!`);
        // залишки армії стають варварами
        let converted = 0;
        units = units.map((u) => {
          if (u.civ !== civ) return u;
          converted++;
          return { ...u, civ: BARB, fortified: false, aboard: null };
        });
        if (converted > 0) {
          msgs.push(`🏴 ${converted} вцілілих підрозділів ${CIVS_DEF[civ].name.toLowerCase()} стали варварською ордою!`);
          notes.push({ id: noteId++, icon: "🏴", text: `Цивілізацію ${CIVS_DEF[civ].name} знищено! ${converted} вцілілих підрозділів перетворились на варварську орду — вони помстяться будь-кому.`, cityId: null, kind: "alert" });
        } else {
          notes.push({ id: noteId++, icon: "☠", text: `Цивілізацію ${CIVS_DEF[civ].name} знищено!`, cityId: null, kind: "alert" });
        }
      }
    });

    setState({ ...st, turn: turn + 1, units, cities, nextId, gold, government, anarchy, cityCounters, relations, research, wondersBuilt, civAlive, huts });
    addLogs(msgs);
    setNotices(notes);
    setToast({ id: Date.now(), text: `✅ Хід ${turn} завершено · ${yearOf(turn + 1, gameLen)} · 💰 +${income} · 🔬 +${sci}${notes.length ? ` · 🔔 ${notes.length}` : ""}` });
    playSound("turn");
    setSelected(null);

    if (turn + 1 >= 4) {
      if (!civAlive[0]) { setGameOver({ result: "lose", text: "Вашу цивілізацію стерто з лиця землі." }); return; }
      if (ENEMY_CIVS.every((c) => !civAlive[c])) { setGameOver({ result: "win", text: "Усі суперники знищені. Світ ваш!" }); return; }
    }
    if (turn + 1 >= gameLen) {
      const score = (civ) =>
        cities.filter((c) => c.civ === civ).reduce((q, c) => q + c.pop, 0) +
        cities.filter((c) => c.civ === civ).length * 3 +
        (civ === 0 ? research.done.length * 2 : Math.floor(turn / 12) * 2) +
        Object.values(wondersBuilt).filter((w) => w === civ).length * 10;
      const contenders = [0, ...ENEMY_CIVS];
      const scores = contenders.map(score);
      const best = Math.max(...scores);
      const winnerCiv = contenders[scores.indexOf(best)];
      setGameOver(scores[0] >= best
        ? { result: "win", text: `2000 рік: ваш рахунок ${scores[0]} — найвищий в історії!` }
        : { result: "lose", text: `2000 рік: рахунок ${scores[0]}, переможець — ${CIVS_DEF[winnerCiv].name} (${best}).` });
    }
  };

  // ============ DERIVED ============
  const viewCity = cityView ? state.cities.find((c) => c.id === cityView && c.civ === 0) : null;
  const availTechs = Object.entries(TECHS).filter(([k, t]) => !state.research.done.includes(k) && t.req.every((r) => state.research.done.includes(r)));
  const isCoastal = (c) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = c.x + dx, ny = c.y + dy;
      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && WATER(tiles[ny][nx])) return true;
    }
    return false;
  };
  const availUnits = Object.entries(UNIT_TYPES).filter(([k, u]) =>
    (!u.tech || state.research.done.includes(u.tech)) && (!u.sea || (viewCity && isCoastal(viewCity))));
  const availBldgs = viewCity ? Object.entries(BUILDINGS).filter(([k, b]) => (!b.tech || state.research.done.includes(b.tech)) && !viewCity.buildings.includes(k)) : [];
  const availWonders = Object.entries(WONDERS).filter(([k, w]) => (!w.tech || state.research.done.includes(w.tech)) && !state.wondersBuilt[k]);
  const availGovs = Object.entries(GOVERNMENTS).filter(([k, g]) => !g.tech || state.research.done.includes(g.tech));

  const myCities = state.cities.filter((c) => c.civ === 0);
  const idleUnits = state.units.filter((u) => u.civ === 0 && u.moves > 0 && !u.fortified && !u.aboard && !u.dest);
  let income = 0, sciRate = 0;
  if (!state.anarchy) {
    myCities.forEach((c) => {
      if (cityUnhappy(c, state.wondersBuilt) > 0) return;
      const y = cityYields(c, world, state.improvements, state.wondersBuilt, state.government);
      let goldPart = (y.trade * state.taxRate) / 100;
      let sciPart = y.trade - goldPart;
      if (c.buildings.includes("marketplace")) goldPart *= 1.5;
      if (c.buildings.includes("library")) sciPart *= 1.5;
      income += Math.round(goldPart);
      sciRate += Math.round(sciPart);
    });
    if (state.wondersBuilt.great_library === 0) sciRate += 4;
    if (state.wondersBuilt.colossus === 0) income += 4;
  }

  const viewYields = viewCity ? cityYields(viewCity, world, state.improvements, state.wondersBuilt, state.government) : null;
  const viewUnhappy = viewCity ? cityUnhappy(viewCity, state.wondersBuilt) : 0;
  const cityGarrison = viewCity
    ? state.units.filter((u) => u.civ === 0 && !u.aboard && u.x === viewCity.x && u.y === viewCity.y)
    : [];
  const curTile = selUnit && !selUnit.aboard ? state.improvements[idx(selUnit.x, selUnit.y)] || {} : {};
  const curTerr = selUnit ? tiles[selUnit.y][selUnit.x] : null;
  const shipCargo = selUnit && isShip(selUnit.type) ? state.units.filter((q) => q.aboard === selUnit.id) : [];
  const adjBarbs = selUnit && selUnit.type === "diplomat" && selUnit.moves > 0 && !selUnit.aboard
    ? state.units.filter((q) => q.civ === BARB && Math.abs(q.x - selUnit.x) <= 1 && Math.abs(q.y - selUnit.y) <= 1)
    : [];
  const mercUpkeep = state.units.filter((u) => u.civ === 0 && u.merc).reduce((s, u) => s + Math.ceil(UNIT_TYPES[u.type].cost / 10), 0);

  // ending the turn with idle units: first jump to one and warn, end on the next press
  const requestEndTurn = () => {
    if (gameOver) return;
    if (idleUnits.length > 0 && !endTurnArmedRef.current) {
      endTurnArmedRef.current = true;
      const u = idleUnits[0];
      setSelected(u.id);
      ensureTileVisible(u.x, u.y, false);
      setToast({ id: Date.now(), text: `⏳ Ще ${idleUnits.length} юніт(ів) мають ходи. Натисни «Завершити хід» ще раз, щоб завершити.` });
      return;
    }
    endTurnArmedRef.current = false;
    endTurn();
  };

  // keep the live keyboard handler in sync with current state/selection
  keyRef.current = (e) => {
    const tag = (e.target && e.target.tagName ? e.target.tagName : "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (tag === "button" && (k === "Enter" || k === " ")) return; // let the focused button activate itself
    if (k === "Escape") {
      if (slotsView) { setSlotsView(null); return; }
      setSelected(null); setCityView(null); setEmpireView(false); return;
    }
    if (slotsView) return;
    // Рух: стрілки + Home/End/PgUp/PgDn (за e.key) та цифрова клавіатура (за e.code).
    // e.code не залежить від розкладки — працює і з кирилицею.
    const dirsKey = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1] };
    const dirsCode = { Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0], Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1] };
    const dir = dirsKey[k] || dirsCode[e.code];
    if (dir) {
      if (selUnit && selUnit.civ === 0 && !gameOver) { e.preventDefault(); handleTileAction(selUnit.x + dir[0], selUnit.y + dir[1]); }
      return;
    }
    // Дії — за фізичною клавішею (e.code), щоб працювало за будь-якої розкладки.
    switch (e.code) {
      case "Enter": case "NumpadEnter": requestEndTurn(); break;
      case "Space": case "Numpad5": e.preventDefault(); nextUnit(); break;
      case "KeyN": nextUnit(); break;
      case "KeyB": if (selUnit && selUnit.type === "settler" && !selUnit.aboard) foundCity(); break;
      case "KeyF": if (selUnit && selUnit.type !== "settler" && !selUnit.aboard) fortify(); break;
      case "KeyR": if (selUnit && selUnit.type === "settler" && !selUnit.aboard && !curTile.road) buildImprovement("road"); break;
      case "KeyI": if (selUnit && selUnit.type === "settler" && !selUnit.aboard && ["grass", "plains", "desert"].includes(curTerr) && !curTile.irr) buildImprovement("irr"); break;
      case "KeyM": if (selUnit && selUnit.type === "settler" && !selUnit.aboard && ["hills", "mountain", "desert"].includes(curTerr) && !curTile.mine) buildImprovement("mine"); break;
      case "KeyS": if (selUnit) skipUnit(); break;
      case "KeyE": setEmpireView((v) => !v); break;
      default: break;
    }
  };

  const hoverInfo = (() => {
    if (!hover || !state.explored.has(idx(hover.x, hover.y))) return null;
    const i = idx(hover.x, hover.y);
    const t = tiles[hover.y][hover.x];
    const parts = [TERRAIN[t].name];
    if (world.rivers.has(i)) parts.push("річка");
    if (world.specials[i]) parts.push(SPECIALS[world.specials[i]].name);
    if (state.huts.has(i)) parts.push("🛖 хатина племені");
    const im = state.improvements[i];
    if (im) { if (im.irr) parts.push("зрошення"); if (im.mine) parts.push("шахта"); if (im.road) parts.push("дорога"); }
    const c = state.cities.find((q) => q.x === hover.x && q.y === hover.y);
    if (c) parts.push(`${c.name} (${CIVS_DEF[c.civ].name})`);
    const us = state.units.filter((q) => q.x === hover.x && q.y === hover.y && !q.aboard);
    if (us.length) parts.push(us.map((q) => `${UNIT_TYPES[q.type].name}${q.civ !== 0 ? ` [${CIVS_DEF[q.civ].name}]` : ""}`).join(", "));
    return parts.join(" · ");
  })();

  // ============ STYLES ============ (glassmorphism design system)
  const panel = {
    background: "linear-gradient(158deg, rgba(48,54,102,0.62), rgba(17,19,40,0.6))",
    border: "1px solid rgba(150,170,235,0.16)", borderRadius: 14, padding: "14px 16px", color: "#dde0f5",
    backdropFilter: "blur(16px) saturate(1.25)", WebkitBackdropFilter: "blur(16px) saturate(1.25)",
    boxShadow: "0 16px 44px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.09)",
  };
  const panelTitle = { fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", color: "#aab0ea", marginBottom: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 };
  const btn = {
    background: "linear-gradient(180deg, #5a82c8, #34568f)",
    color: "#fff", border: "1px solid rgba(155,190,248,0.5)", borderRadius: 10, padding: "8px 14px",
    cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 650, letterSpacing: 0.2,
    boxShadow: "0 4px 13px rgba(18,28,58,0.42), inset 0 1px 0 rgba(255,255,255,0.18)",
  };
  const sbtn = { ...btn, padding: "5px 11px", fontSize: 11, borderRadius: 9, fontWeight: 600 };
  const chip = {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.028))",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 11, padding: "6px 13px", fontSize: 12.5, fontWeight: 600, color: "#e8e9fa",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  };

  const Bar = ({ value, max, color }) => (
    <div style={{ background: "#0d0d1c", borderRadius: 4, height: 8, overflow: "hidden", border: "1px solid #2a2a4e" }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color, transition: "width .3s" }} />
    </div>
  );

  const buildTarget = viewCity ? (UNIT_TYPES[viewCity.building] || BUILDINGS[viewCity.building] || WONDERS[viewCity.building]) : null;

  return (
    <div className="civ-root" style={{ background: "radial-gradient(1100px 560px at 12% -14%, #232c66 0%, transparent 56%), radial-gradient(950px 520px at 104% -8%, #3a1d56 0%, transparent 52%), radial-gradient(900px 760px at 50% 124%, #102047 0%, transparent 58%), linear-gradient(180deg,#070710 0%,#0b0b18 100%)", minHeight: "100vh", fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif", color: "#e6e6f6" }}>
      <style>{`@keyframes civPulse{0%{box-shadow:0 0 0 0 rgba(232,184,77,.45)}70%{box-shadow:0 0 0 9px rgba(232,184,77,0)}100%{box-shadow:0 0 0 0 rgba(232,184,77,0)}}
@keyframes civToast{0%{opacity:0;transform:translateY(14px)}10%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateY(8px)}}
@keyframes civPop{0%{opacity:0;transform:translateY(10px) scale(.985)}100%{opacity:1;transform:none}}
@keyframes civFade{0%{opacity:0}100%{opacity:1}}
.civ-root{padding:14px; -webkit-tap-highlight-color:transparent; -webkit-text-size-adjust:100%; text-rendering:optimizeLegibility; -webkit-font-smoothing:antialiased}
.civ-root *{box-sizing:border-box}
.civ-card{animation:civPop .26s cubic-bezier(.2,.8,.25,1) both}
.civ-overlay{animation:civFade .18s ease both}
.civ-root button{transition:filter .14s ease, transform .08s ease, box-shadow .14s ease; -webkit-tap-highlight-color:transparent}
.civ-root button:not(:disabled):hover{filter:brightness(1.12) saturate(1.06); box-shadow:0 7px 20px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.22)}
.civ-root button:not(:disabled):active{transform:translateY(1px); filter:brightness(0.96)}
.civ-root button:focus-visible{outline:2px solid #f5cf3d; outline-offset:2px}
.civ-root input[type=range]{accent-color:#7aa6ec; cursor:pointer; height:5px}
.civ-root canvas{transition:filter .15s ease}
.civ-root ::-webkit-scrollbar{width:10px;height:10px}
.civ-root ::-webkit-scrollbar-thumb{background:rgba(124,148,212,0.34); border-radius:8px; border:2px solid transparent; background-clip:padding-box}
.civ-root ::-webkit-scrollbar-thumb:hover{background:rgba(124,148,212,0.55); background-clip:padding-box}
.civ-root ::-webkit-scrollbar-track{background:transparent}
@media (max-width:680px){.civ-root{padding:8px}}`}</style>
      {toast && (
        <div key={toast.id} style={{
          position: "fixed", right: 18, bottom: 18, zIndex: 50, pointerEvents: "none",
          background: "rgba(24,26,52,0.78)", border: "1px solid rgba(130,168,236,0.4)", borderRadius: 12,
          padding: "11px 17px", fontSize: 13, color: "#eaeaf8",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 10px 34px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
          animation: "civToast 3s ease forwards",
        }}>
          {toast.text}
        </div>
      )}

      {setupMode && (
        <div className="civ-overlay" style={{ position: "fixed", inset: 0, background: "rgba(5,5,14,0.74)", backdropFilter: "blur(9px)", WebkitBackdropFilter: "blur(9px)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="civ-card" style={{ ...panel, width: 400, maxWidth: "92vw", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
              <span style={{ fontSize: 26, filter: "drop-shadow(0 0 10px rgba(245,207,61,0.45))" }}>🏛</span>
              <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: 2.5, background: "linear-gradient(90deg,#ffe680,#f5cf3d,#e8a93d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>CIVILIZATION</span>
            </div>
            <div style={{ ...panelTitle, marginBottom: 4 }}>Нова гра — оберіть тривалість</div>
            <div style={{ fontSize: 11.5, color: "#9a9ac4", marginBottom: 14 }}>Чим довша гра, тим повільніше спливає час і більше ходів до фіналу (2000 рік).</div>
            {GAME_MODES.map((m, i) => (
              <button key={m.turns} className="civ-card" style={{ ...btn, animationDelay: `${0.04 * i}s`, width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center", marginBottom: 8, padding: "12px 15px", fontSize: 13 }}
                onClick={() => startGame(m.turns)}>
                <span style={{ fontWeight: 750, letterSpacing: 0.3 }}>{m.name}</span>
                <span style={{ fontSize: 11, opacity: 0.86, fontWeight: 600 }}>{m.turns} ходів · {m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {slotsView && (
        <div className="civ-overlay" onClick={() => setSlotsView(null)} style={{ position: "fixed", inset: 0, background: "rgba(5,5,14,0.64)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="civ-card" onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 360, maxWidth: "92vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ ...panelTitle, marginBottom: 0 }}>{slotsView === "save" ? "💾 Зберегти у слот" : "📂 Завантажити слот"}</span>
              <button style={{ ...sbtn, background: "#2a2a48", borderColor: "#46466e" }} onClick={() => setSlotsView(null)}>✕</button>
            </div>
            {SAVE_SLOTS.map((s) => {
              const meta = getSlotMeta(s);
              const title = s === "auto" ? "🕓 Автозбереження" : `Слот ${s}`;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 5, background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{title}</div>
                    <div style={{ fontSize: 10.5, color: "#8a8ab8" }}>{meta ? `Хід ${meta.turn} · ${yearOf(meta.turn, meta.gameLen)}` : "порожньо"}</div>
                  </div>
                  {slotsView === "save"
                    ? (s === "auto"
                        ? <span style={{ fontSize: 10.5, color: "#7a7aa6" }}>авто</span>
                        : <button style={sbtn} onClick={() => saveGame(s)}>Зберегти</button>)
                    : <button style={{ ...sbtn, opacity: meta ? 1 : 0.4, cursor: meta ? "pointer" : "default" }} disabled={!meta} onClick={() => meta && loadGame(s)}>{meta ? "Завантажити" : "—"}</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ ...panel, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8, padding: "11px 18px", borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ fontSize: 22, filter: "drop-shadow(0 0 8px rgba(245,207,61,0.4))" }}>🏛</span>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, background: "linear-gradient(90deg,#ffe680,#f5cf3d,#e8a93d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 0 18px rgba(245,207,61,0.25)" }}>CIVILIZATION</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={chip}>🗓 {state.turn}/{gameLen} · {yearOf(state.turn, gameLen)}</span>
          <span style={chip}>{state.anarchy ? "🔥 Анархія" : `👑 ${GOVERNMENTS[state.government].name}`}</span>
          <span style={chip}>🏛 {myCities.length}</span>
          <span style={chip}>💰 {state.gold} <span style={{ color: "#7fc97f" }}>+{income}</span>{mercUpkeep > 0 && <span style={{ color: "#e87070" }}> −{mercUpkeep}</span>}</span>
          <span style={chip}>🔬 +{sciRate}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn} title="Зберегти (слоти)" onClick={() => setSlotsView("save")}>💾</button>
          <button style={btn} title="Завантажити (слоти)" onClick={() => setSlotsView("load")}>📂</button>
          <button style={btn} title={muted ? "Звук вимкнено — увімкнути" : "Звук увімкнено — вимкнути"} onClick={toggleMute}>{muted ? "🔇" : "🔊"}</button>
          <button style={btn} onClick={nextUnit}>⏭ Юніт</button>
          <button style={btn} onClick={() => setEmpireView(!empireView)}>🏛 Імперія</button>
          <button style={{ ...btn, background: "linear-gradient(180deg,#d88a3a,#a55c1c)", borderColor: "rgba(232,170,90,0.6)", fontWeight: 800, boxShadow: "0 3px 14px rgba(180,100,30,0.45), inset 0 1px 0 rgba(255,255,255,0.2)" }} onClick={endTurn}>
            Завершити хід ▶{!state.research.current && myCities.length > 0 ? " ⚠" : ""}
          </button>
        </div>
      </div>

      {gameOver && (
        <div style={{ ...panel, background: gameOver.result === "win" ? "#143a18" : "#3a1414", textAlign: "center", fontSize: 15, marginBottom: 10 }}>
          {gameOver.result === "win" ? "🏆 ПЕРЕМОГА! " : "💀 ПОРАЗКА. "}{gameOver.text}
          <button style={{ ...btn, marginLeft: 12 }} onClick={restart}>🔄 Нова гра</button>
        </div>
      )}

      {notices.length > 0 && !gameOver && (
        <div style={{ ...panel, marginBottom: 10, borderColor: "#8a6e2a", background: "#1a1626" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ ...panelTitle, marginBottom: 0 }}>🔔 Події ходу ({notices.length})</span>
            <button style={{ ...sbtn, background: "#3a3a5e", borderColor: "#54547e" }} onClick={() => setNotices([])}>Очистити все</button>
          </div>
          {notices.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", marginBottom: 3, background: n.kind === "alert" ? "rgba(160,50,50,0.18)" : "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: 12.5 }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.text}</span>
              {n.cityId && state.cities.some((c) => c.id === n.cityId && c.civ === 0) && (
                <button style={sbtn} onClick={() => { setCityView(n.cityId); setSelected(null); setNotices((ns) => ns.filter((q) => q.id !== n.id)); }}>
                  Відкрити місто
                </button>
              )}
              <button style={{ ...sbtn, padding: "2px 7px", background: "#2a2a48", borderColor: "#46466e" }} onClick={() => setNotices((ns) => ns.filter((q) => q.id !== n.id))}>✕</button>
            </div>
          ))}
        </div>
      )}

      {empireView && (
        <div style={{ ...panel, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={panelTitle}>Дипломатія</div>
              {ENEMY_CIVS.filter((civ) => civ < BARB || state.civAlive[civ]).map((civ) => (
                <div key={civ} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: CIVS_DEF[civ].color, display: "inline-block" }} />
                  <span style={{ fontWeight: 600, minWidth: 76 }}>{CIVS_DEF[civ].name}</span>
                  {!state.civAlive[civ] ? <span style={{ color: "#666" }}>☠</span> : (
                    <>
                      <span style={{ color: state.relations[civ] === "war" ? "#e87070" : "#7fc97f", minWidth: 60 }}>
                        {state.relations[civ] === "war" ? "⚔ війна" : "🕊 мир"}
                      </span>
                      {state.relations[civ] === "war"
                        ? <button style={sbtn} onClick={() => offerPeace(civ)}>Мир?</button>
                        : <button style={{ ...sbtn, background: "#6e2828", borderColor: "#9a4040" }} onClick={() => declareWar(civ)}>Війна</button>}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div style={panelTitle}>Уряд: {state.anarchy ? `🔥 Анархія (${state.anarchy.turns} х.)` : GOVERNMENTS[state.government].name}</div>
              {availGovs.map(([k, g]) => (
                <div key={k} style={{ marginBottom: 5 }}>
                  <button
                    style={{ ...sbtn, background: state.government === k ? "#3a7a30" : "#2c4d80", opacity: state.anarchy ? 0.5 : 1 }}
                    disabled={!!state.anarchy || state.government === k}
                    onClick={() => startRevolution(k)}>
                    {g.name}
                  </button>
                  <span style={{ fontSize: 10.5, color: "#8a8ab8", marginLeft: 8 }}>{g.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ minWidth: 200 }}>
              <div style={panelTitle}>Податки: {state.taxRate}% золото / {100 - state.taxRate}% наука</div>
              <input type="range" min={0} max={100} step={10} value={state.taxRate}
                onChange={(e) => setState((st) => ({ ...st, taxRate: Number(e.target.value) }))}
                style={{ width: "100%" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#8a8ab8" }}>
                <span>🔬 Наука</span><span>💰 Золото</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* MAP */}
        <div style={{ flex: "1 1 880px", minWidth: 320 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button style={sbtn} title="Зменшити" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>➖</button>
            <span style={{ fontSize: 11, color: "#9a9ac4", minWidth: 44, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button style={sbtn} title="Збільшити" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>➕</button>
            <button style={sbtn} title="Скинути масштаб" onClick={() => { setZoom(1); if (mapWrapRef.current) mapWrapRef.current.scrollTo({ left: 0, top: 0 }); }}>⤢</button>
            <span style={{ fontSize: 10.5, color: "#7a7aa6", marginLeft: 4 }}>двома пальцями — масштаб, мінімапа — навігація</span>
          </div>
          <div ref={mapWrapRef} onTouchStart={onMapTouchStart} onTouchMove={onMapTouchMove} onTouchEnd={onMapTouchEnd}
            onScroll={updateViewRect} onWheel={onMapWheel}
            style={{ overflow: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", height: "min(94vh, calc(100vh - 120px))", minHeight: 460, touchAction: "pan-x pan-y", WebkitOverflowScrolling: "touch", background: "#05060d", boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.4)" }}>
            <canvas ref={canvasRef} width={MAP_W * TILE} height={MAP_H * TILE}
              onClick={handleCanvasClick} onMouseMove={handleMove}
              onMouseDown={handleMouseDown} onMouseUp={endPan}
              onMouseLeave={() => { endPan(); setHover(null); setMousePos(null); }}
              style={{ cursor: panRef.current ? "grabbing" : "grab", height: `${zoom * 100}%`, width: "auto", maxWidth: zoom <= 1 ? "100%" : "none", margin: "0 auto", display: "block" }} />
          </div>
          <div style={{ marginTop: 8, minHeight: 24, fontSize: 12, color: hoverInfo ? "#cfcfe8" : "#7a7aa6", padding: "6px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, backdropFilter: "blur(8px)" }}>
            {hoverInfo || "Наведи на клітинку, щоб побачити інформацію"}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "0 1 272px", minWidth: 256 }}>
          <div style={panel}>
            <div style={panelTitle}>🗺 Мінімапа</div>
            <div style={{ position: "relative", lineHeight: 0 }}>
              <canvas ref={minimapRef} width={MAP_W * 3} height={MAP_H * 3} onClick={handleMinimapClick}
                style={{ width: "100%", height: "auto", imageRendering: "pixelated", borderRadius: 6, border: "1px solid #2a2a4e", display: "block", cursor: "crosshair" }} />
              {viewRect && (viewRect.w < 0.999 || viewRect.h < 0.999) && (
                <div style={{
                  position: "absolute", pointerEvents: "none", border: "1.5px solid #f5cf3d", borderRadius: 2,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                  left: `${viewRect.l * 100}%`, top: `${viewRect.t * 100}%`,
                  width: `${viewRect.w * 100}%`, height: `${viewRect.h * 100}%`,
                }} />
              )}
            </div>
          </div>
          {selUnit && (
            <div style={panel}>
              <div style={panelTitle}>Юніт{selUnit.aboard ? " · на борту" : ""}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <UnitIcon type={selUnit.type} color={CIVS_DEF[selUnit.civ].color} size={36} />
                <div>
                  <div style={{ fontWeight: 700 }}>{UNIT_TYPES[selUnit.type].name}{selUnit.vet ? " ★" : ""}{selUnit.merc ? " 💰 найманець" : ""}</div>
                  <div style={{ fontSize: 11.5, color: "#9a9ac4" }}>
                    ⚔ {UNIT_TYPES[selUnit.type].att} · 🛡 {UNIT_TYPES[selUnit.type].def} · 👣 {selUnit.moves} · {TERRAIN[curTerr].name}
                    {isShip(selUnit.type) && ` · 🧳 ${shipCargo.length}/${UNIT_TYPES[selUnit.type].cap}`}
                    {selUnit.merc && ` · утримання ${Math.ceil(UNIT_TYPES[selUnit.type].cost / 10)}/хід`}
                  </div>
                </div>
              </div>
              {isShip(selUnit.type) && shipCargo.length > 0 && (
                <div style={{ fontSize: 11, color: "#9a9ac4", marginBottom: 6 }}>
                  На борту: {shipCargo.map((q) => UNIT_TYPES[q.type].name).join(", ")} — клікни по клітинці корабля, щоб обрати пасажира; пасажир сходить на сусідню сушу.
                </div>
              )}
              {selUnit.aboard && (
                <div style={{ fontSize: 11, color: "#e8b84d", marginBottom: 6 }}>
                  Юніт на кораблі. Клікни на сусідню сушу, щоб висадитись.
                </div>
              )}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {selUnit.type === "settler" && selUnit.moves > 0 && !selUnit.aboard && (
                  <>
                    <button style={sbtn} onClick={foundCity}>🏛 Місто</button>
                    {["grass", "plains", "desert"].includes(curTerr) && !curTile.irr && <button style={sbtn} onClick={() => buildImprovement("irr")}>💧 Зрошення</button>}
                    {["hills", "mountain", "desert"].includes(curTerr) && !curTile.mine && <button style={sbtn} onClick={() => buildImprovement("mine")}>⛏ Шахта</button>}
                    {!curTile.road && <button style={sbtn} onClick={() => buildImprovement("road")}>🛤 Дорога</button>}
                  </>
                )}
                {selUnit.type !== "settler" && !selUnit.aboard && <button style={sbtn} onClick={fortify}>🛡 Укріпитись</button>}
                {adjBarbs.map((b) => (
                  <button key={b.id} style={{ ...sbtn, background: "#6e5a20", borderColor: "#9a8040" }} onClick={() => hireBarb(b.id)}>
                    💰 Найняти: {UNIT_TYPES[b.type].name} ({UNIT_TYPES[b.type].cost}з)
                  </button>
                ))}
                {selUnit.merc && (
                  <button style={{ ...sbtn, background: "#6e2828", borderColor: "#9a4040" }} onClick={dismissMerc}>🏴 Розпустити найм</button>
                )}
                {selUnit.dest && (
                  <button style={{ ...sbtn, background: "#6e5a20", borderColor: "#9a8040" }}
                    onClick={() => setState((st) => ({ ...st, units: st.units.map((q) => q.id === selected ? { ...q, dest: null } : q) }))}>
                    🧭✕ Скасувати маршрут ({selUnit.dest.x},{selUnit.dest.y})
                  </button>
                )}
                <button style={sbtn} onClick={skipUnit}>⏸ Пропустити</button>
                <button style={{ ...sbtn, background: "#5a2626", borderColor: "#7e3a3a" }} onClick={disband}>✕</button>
              </div>
            </div>
          )}

          {viewCity && viewYields && buildTarget && (
            <div style={panel}>
              <div style={panelTitle}>Місто · {viewCity.name} {viewUnhappy > 0 ? "· 😡 ЗАВОРУШЕННЯ" : ""}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 12.5, marginBottom: 8 }}>
                <span>👥 {viewCity.pop}</span>
                <span style={{ color: "#7fc97f" }}>🌾 +{viewYields.food}</span>
                <span style={{ color: viewUnhappy > 0 ? "#e87070" : "#e8a64d" }}>🛠 {viewUnhappy > 0 ? 0 : `+${viewYields.shields}`}</span>
                <span style={{ color: viewUnhappy > 0 ? "#e87070" : "#6db8e8" }}>💰 {viewUnhappy > 0 ? 0 : `+${viewYields.trade}`}</span>
              </div>
              {viewUnhappy > 0 && (
                <div style={{ fontSize: 11, color: "#e87070", marginBottom: 6 }}>
                  {viewUnhappy} незадоволених. {viewCity.buildings.includes("temple")
                    ? "Храм збудовано — потрібне чудо щастя (Висячі сади / Оракул) або стримай ріст."
                    : "Збудуй Храм або чудо щастя."}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: "#9a9ac4", marginBottom: 2 }}>Ріст: {viewCity.food}/{viewCity.pop * 10 + 10}</div>
              <Bar value={viewCity.food} max={viewCity.pop * 10 + 10} color="#5aab5a" />
              <div style={{ fontSize: 11.5, color: "#9a9ac4", margin: "8px 0 2px" }}>
                {buildTarget.name}: {viewCity.shields}/{buildTarget.cost}
                <button style={{ ...sbtn, marginLeft: 8, padding: "2px 7px" }} onClick={rushBuy}>💰 Купити</button>
              </div>
              <Bar value={viewCity.shields} max={buildTarget.cost} color="#d8923c" />
              {viewCity.buildings.length > 0 && (
                <div style={{ fontSize: 11, color: "#8a8ab8", marginTop: 8 }}>🏗 {viewCity.buildings.map((b) => BUILDINGS[b].name).join(" · ")}</div>
              )}
              {cityGarrison.length > 0 && (
                <div style={{ marginTop: 9 }}>
                  <div style={{ fontSize: 11, color: "#9a9ac4", marginBottom: 4 }}>🛡 Гарнізон ({cityGarrison.length}) — клік, щоб обрати й рухати:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {cityGarrison.map((u) => (
                      <button key={u.id}
                        title={`${UNIT_TYPES[u.type].name}${u.vet ? " ★" : ""} · ⚔${UNIT_TYPES[u.type].att} 🛡${UNIT_TYPES[u.type].def} 👣${u.moves}${u.fortified ? " · укріплений" : ""}`}
                        style={{ ...sbtn, background: selected === u.id ? "#3a7a30" : "#2c4d80", borderColor: selected === u.id ? "#5aa050" : "#4a6aa0" }}
                        onClick={() => { setSelected(u.id); ensureTileVisible(u.x, u.y, false); }}>
                        <UnitIcon type={u.type} color={CIVS_DEF[u.civ].color} size={18} /> {UNIT_TYPES[u.type].name}{u.vet ? "★" : ""}{u.fortified ? " 🛡" : u.moves > 0 ? "" : " ⏸"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#9a9ac4", margin: "10px 0 4px" }}>Замовити юніти:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {availUnits.map(([k, u]) => (
                  <button key={k} style={{ ...sbtn, background: viewCity.building === k ? "#3a7a30" : "#2c4d80", borderColor: viewCity.building === k ? "#5aa050" : "#4a6aa0" }}
                    onClick={() => setState((st) => ({ ...st, cities: st.cities.map((c) => c.id === viewCity.id ? { ...c, building: k } : c) }))}>
                    {u.name} <span style={{ opacity: 0.7 }}>{u.cost}</span>
                  </button>
                ))}
              </div>
              {(availBldgs.length > 0 || availWonders.length > 0) && (
                <>
                  <div style={{ fontSize: 11, color: "#9a9ac4", margin: "8px 0 4px" }}>Будівлі та чудеса:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {availBldgs.map(([k, b]) => (
                      <button key={k} title={b.desc} style={{ ...sbtn, background: viewCity.building === k ? "#3a7a30" : "#3a3a6e", borderColor: viewCity.building === k ? "#5aa050" : "#5454a0" }}
                        onClick={() => setState((st) => ({ ...st, cities: st.cities.map((c) => c.id === viewCity.id ? { ...c, building: k } : c) }))}>
                        {b.name} <span style={{ opacity: 0.7 }}>{b.cost}</span>
                      </button>
                    ))}
                    {availWonders.map(([k, w]) => (
                      <button key={k} title={w.desc} style={{ ...sbtn, background: viewCity.building === k ? "#3a7a30" : "#6e5a20", borderColor: viewCity.building === k ? "#5aa050" : "#9a8040" }}
                        onClick={() => setState((st) => ({ ...st, cities: st.cities.map((c) => c.id === viewCity.id ? { ...c, building: k } : c) }))}>
                        🌟 {w.name} <span style={{ opacity: 0.7 }}>{w.cost}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ ...panel, ...(state.research.current || myCities.length === 0 ? {} : { borderColor: "#e8b84d", animation: "civPulse 1.4s infinite" }) }}>
            <div style={panelTitle}>🔬 Наука · +{sciRate}/хід</div>
            {state.research.current ? (
              <>
                <div style={{ fontSize: 12.5, marginBottom: 4 }}>{TECHS[state.research.current].name}: {state.research.points}/{TECHS[state.research.current].cost}</div>
                <Bar value={state.research.points} max={TECHS[state.research.current].cost} color="#4d9ad8" />
              </>
            ) : (
              <>
                <div style={{ color: "#e8b84d", fontSize: 12.5, marginBottom: 6 }}>Оберіть напрям досліджень:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {availTechs.map(([k, t]) => (
                    <button key={k} style={sbtn} onClick={() => { setState((st) => ({ ...st, research: { ...st.research, current: k, points: 0 } })); setNotices((ns) => ns.filter((q) => q.kind !== "tech")); }}>
                      {t.name} <span style={{ opacity: 0.7 }}>{t.cost}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {state.research.done.length > 0 && (
              <div style={{ fontSize: 10.5, color: "#7a7aa6", marginTop: 8 }}>
                Відкрито ({state.research.done.length}): {state.research.done.map((k) => TECHS[k].name).join(", ")}
              </div>
            )}
          </div>

          <div style={{ ...panel, flex: 1, minHeight: 120 }}>
            <div style={panelTitle}>📜 Хроніки</div>
            {log.map((m, i) => (
              <div key={i} style={{ fontSize: 11.5, opacity: Math.max(0.3, 1 - i * 0.1), marginBottom: 3, lineHeight: 1.35 }}>{m}</div>
            ))}
          </div>

          <div style={{ ...panel, fontSize: 10.5, color: "#7a7aa6", lineHeight: 1.5 }}>
            {CIVS_DEF.map((c, i) => (i <= BARB || state.civAlive[i]) && (
              <span key={i} style={{ marginRight: 10 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c.color, marginRight: 4 }} />{c.name}
              </span>
            ))}
            <br />S поселенець · D дипломат · W воїн · P фаланга · H вершник · A лучник · L легіон · C колісниця · K катапульта · R лицар · T трирема · ★ ветеран · 🟡 крапка = найманець
            <br /><span style={{ color: "#9a9ac4" }}>⌨ Клавіші:</span> стрілки / цифрова клав. (8·2·4·6 + діагоналі) / Home·End·PgUp·PgDn — рух · Space — наст. юніт · B — місто · F — укріпитись · R/I/M — дорога/зрошення/шахта · S — пропустити · E — імперія · Enter — хід · Esc — зняти виділення <span style={{ color: "#7a7aa6" }}>(працюють за будь-якої розкладки)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
