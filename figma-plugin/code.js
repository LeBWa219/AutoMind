// ============================================================================
// AutoMind Mockup Generator — Figma plugin
// Генерирует макет интерфейса AutoMind (ТЗ раздел 2) на страницу
// «AutoMind · Макет»: дизайн-система + 9 экранов приложения.
// Запуск: Figma → Plugins → Development → AutoMind Mockup Generator
//
// Версия 2: современный sizing-API (layoutSizingHorizontal/Vertical),
// ошибки каждого экрана выводятся отдельным красным фреймом на страницу.
// ============================================================================

var PAGE_NAME = "AutoMind · Макет";
var SCREEN_W = 1440;
var SCREEN_H = 1024;
var ERRORS = [];

// --- Палитра (ТЗ 2.2 + состояния 2.3, решения п.7) ---------------------------
var HEX = {
  accent: "A8D5A2", // светло-зелёный — акценты
  dark: "174D35",   // тёмно-зелёный — навигация, кнопки
  ink: "171C19",    // почти чёрный — текст
  warn: "E6A23C",   // оранжевый — предупреждения, экономика
  bg: "F5F7F4",     // светлый фон
  white: "FFFFFF",
  gray: "8A948D",   // второстепенное
  red: "D9534F",    // критично (решение п.7)
  green: "4E9B54",  // статус «штат»
  yellow: "E6C86E", // статус «предупреждение»
  border: "E3E8E2",
  mapBg: "E9EEE8",
  mapBlock: "DCE4DA",
  mapPark: "CFE3C9",
  soft: "F0F3EE",
  softGreen: "EDF3EA"
};

function hx(h) {
  var n = parseInt(h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function solid(hexOrColor, opacity) {
  var c = typeof hexOrColor === "string" ? hx(hexOrColor) : hexOrColor;
  var s = { type: "SOLID", color: c };
  if (opacity !== undefined) s.opacity = opacity;
  return s;
}

var F = {
  reg: { family: "Inter", style: "Regular" },
  med: { family: "Inter", style: "Medium" },
  semi: { family: "Inter", style: "Semi Bold" },
  bold: { family: "Inter", style: "Bold" }
};

var SHADOW = [{
  type: "DROP_SHADOW",
  color: { r: 0.09, g: 0.11, b: 0.1, a: 0.1 },
  offset: { x: 0, y: 2 },
  radius: 6,
  spread: 0,
  visible: true,
  blendMode: "NORMAL"
}];
var SHADOW_SOFT = [{
  type: "DROP_SHADOW",
  color: { r: 0.09, g: 0.11, b: 0.1, a: 0.06 },
  offset: { x: 0, y: 1 },
  radius: 3,
  spread: 0,
  visible: true,
  blendMode: "NORMAL"
}];

var PAGE; // текущая страница для appendChild

// --- Базовые хелперы ---------------------------------------------------------

function frame(name, o) {
  o = o || {};
  var f = figma.createFrame();
  f.name = name;
  if (o.layout) f.layoutMode = o.layout;
  if (o.layout === "HORIZONTAL") {
    f.primaryAxisSizingMode = o.w ? "FIXED" : "AUTO";
    f.counterAxisSizingMode = o.h ? "FIXED" : "AUTO";
  } else if (o.layout === "VERTICAL") {
    f.primaryAxisSizingMode = o.h ? "FIXED" : "AUTO";
    f.counterAxisSizingMode = o.w ? "FIXED" : "AUTO";
  }
  if (o.w || o.h) f.resize(o.w || 100, o.h || 100);
  f.itemSpacing = o.gap !== undefined ? o.gap : 0;
  f.paddingLeft = o.padX !== undefined ? o.padX : 0;
  f.paddingRight = o.padX !== undefined ? o.padX : 0;
  f.paddingTop = o.padY !== undefined ? o.padY : 0;
  f.paddingBottom = o.padY !== undefined ? o.padY : 0;
  if (o.primary) f.primaryAxisAlignItems = o.primary;
  if (o.cross) f.counterAxisAlignItems = o.cross;
  f.fills = o.bg ? [solid(o.bg)] : [];
  if (o.stroke) {
    f.strokes = [solid(o.stroke, o.strokeOpacity !== undefined ? o.strokeOpacity : 1)];
    f.strokeWeight = o.strokeWeight || 1;
    f.strokeAlign = "INSIDE";
  }
  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.shadow) f.effects = o.shadowSoft ? SHADOW_SOFT : SHADOW;
  if (o.opacity !== undefined) f.opacity = o.opacity;
  if (o.clip) f.clipsContent = true;
  // флаги заполнения применяются в add() после appendChild
  f.__stretch = !!o.stretch;
  f.__grow = !!o.grow;
  return f;
}

function txt(chars, o) {
  o = o || {};
  var t = figma.createText();
  t.fontName = o.font || F.reg;
  t.characters = chars;
  t.fontSize = o.size || 13;
  t.fills = [solid(o.color || HEX.ink, o.opacity)];
  if (o.ls !== undefined) t.letterSpacing = { value: o.ls, unit: "PERCENT" };
  if (o.lh !== undefined) t.lineHeight = { value: o.lh, unit: "PERCENT" };
  if (o.align) t.textAlignHorizontal = o.align;
  // перенос строк нужен всегда, когда текст должен заполнять ширину
  if (o.wrap || o.stretch) t.textAutoResize = "HEIGHT";
  t.__stretch = !!o.stretch;
  t.__grow = !!o.grow;
  return t;
}

// Добавляет child в auto-layout родитель и применяет растяжение по осям.
// stretch = заполнить поперечную ось родителя, grow — продольную.
function add(parent, child) {
  parent.appendChild(child);
  try {
    if (parent.layoutMode === "VERTICAL") {
      if (child.__stretch) child.layoutSizingHorizontal = "FILL";
      if (child.__grow) child.layoutSizingVertical = "FILL";
    } else if (parent.layoutMode === "HORIZONTAL") {
      if (child.__stretch) child.layoutSizingVertical = "FILL";
      if (child.__grow) child.layoutSizingHorizontal = "FILL";
    }
  } catch (e) { /* родитель hug по этой оси — оставляем натуральный размер */ }
  return child;
}

function rect(w, h, color, radius, opacity) {
  var r = figma.createRectangle();
  r.resize(w, h);
  r.fills = color ? [solid(color, opacity)] : [];
  if (radius) r.cornerRadius = radius;
  return r;
}

function divider(stretch) {
  var r = figma.createRectangle();
  r.resize(100, 1);
  r.fills = [solid(HEX.border)];
  r.__stretch = !!stretch;
  return r;
}

function dot(color, size) {
  var e = figma.createEllipse();
  e.resize(size || 8, size || 8);
  e.fills = [solid(color)];
  return e;
}

function dotLabel(label, color, size) {
  var row = frame("Dot", { layout: "HORIZONTAL", gap: 6, cross: "CENTER" });
  add(row, dot(color, size));
  add(row, txt(label, { size: size ? 10 : 12, color: HEX.ink }));
  return row;
}

function badge(label, color, o) {
  o = o || {};
  var b = frame("Badge", {
    layout: "HORIZONTAL",
    padX: o.padX !== undefined ? o.padX : 9,
    padY: o.padY !== undefined ? o.padY : 3,
    radius: 999,
    cross: "CENTER"
  });
  b.fills = [solid(color, o.bgOpacity !== undefined ? o.bgOpacity : 0.13)];
  add(b, txt(label, { size: o.size || 11, font: o.font || F.med, color: o.textColor || color }));
  return b;
}

function statusRow(label, color) {
  var b = frame("Badge", { layout: "HORIZONTAL", padX: 9, padY: 3, radius: 999, cross: "CENTER", gap: 6 });
  b.fills = [solid(color, 0.12)];
  add(b, dot(color, 7));
  add(b, txt(label, { size: 11, font: F.med, color: color }));
  return b;
}

function btn(label, kind, o) {
  o = o || {};
  var f = frame("Btn / " + label, {
    layout: "HORIZONTAL",
    padX: o.padX !== undefined ? o.padX : 18,
    padY: o.padY !== undefined ? o.padY : 10,
    radius: 8,
    cross: "CENTER",
    primary: "CENTER"
  });
  if (kind === "primary") { f.fills = [solid(HEX.dark)]; add(f, txt(label, { size: o.size || 13, font: F.med, color: HEX.white })); }
  else if (kind === "secondary") { f.fills = [solid(HEX.white)]; f.strokes = [solid(HEX.border)]; f.strokeWeight = 1; add(f, txt(label, { size: o.size || 13, font: F.med, color: HEX.ink })); }
  else if (kind === "danger") { f.fills = [solid(HEX.red)]; add(f, txt(label, { size: o.size || 13, font: F.med, color: HEX.white })); }
  else if (kind === "ghost") { add(f, txt(label, { size: o.size || 13, font: F.med, color: HEX.dark })); }
  else if (kind === "disabled") { f.fills = [solid(HEX.dark, 0.4)]; add(f, txt(label, { size: o.size || 13, font: F.med, color: HEX.white })); }
  f.__stretch = !!o.stretch;
  return f;
}

function iconCircle(emoji, size, bg, emojiSize) {
  var c = frame("Icon", { layout: "HORIZONTAL", w: size, h: size, primary: "CENTER", cross: "CENTER", radius: 999 });
  c.fills = [solid(bg, 0.18)];
  add(c, txt(emoji, { size: emojiSize || 22 }));
  return c;
}

// Поле ввода (мок). o: {value, placeholder, iconRight, h, error, fillBg}
function input(o) {
  o = o || {};
  var f = frame("Input", {
    layout: "HORIZONTAL",
    h: o.h || 40,
    padX: 13,
    radius: 8,
    cross: "CENTER",
    primary: "SPACE_BETWEEN"
  });
  f.fills = [solid(o.fillBg || HEX.white)];
  f.strokes = [solid(o.error ? HEX.red : HEX.border)];
  f.strokeWeight = o.error ? 1.5 : 1;
  add(f, txt(o.value || o.placeholder || "", {
    size: 13,
    color: o.value ? HEX.ink : HEX.gray,
    font: o.value ? F.med : F.reg
  }));
  if (o.iconRight) add(f, txt(o.iconRight, { size: 12, color: HEX.gray }));
  f.__stretch = o.stretch !== false;
  return f;
}

// Текст фиксированной ширины с переносом строк
function tbox(v, w, o) {
  o = o || {};
  var box = frame("TBox", { layout: "HORIZONTAL", w: w, cross: o.cross || "CENTER" });
  add(box, txt(v, Object.assign({}, o, { wrap: true, stretch: true })));
  return box;
}

// Блок «лейбл + поле», опционально с ошибкой под полем
function field(label, o) {
  o = o || {};
  var wrap = frame("Field / " + label, { layout: "VERTICAL", gap: 6, grow: o.grow !== undefined ? o.grow : 1 });
  var labelRow = frame("Label", { layout: "HORIZONTAL", gap: 2, cross: "CENTER" });
  add(labelRow, txt(label, { size: 12, font: F.med, color: HEX.ink }));
  if (o.required) add(labelRow, txt("*", { size: 12, font: F.med, color: HEX.red }));
  add(wrap, labelRow);
  if (o.checkbox) {
    var cb = frame("Checkbox", { layout: "HORIZONTAL", gap: 8, cross: "CENTER", padY: 10 });
    var box = frame("Box", { layout: "HORIZONTAL", w: 18, h: 18, radius: 5, primary: "CENTER", cross: "CENTER" });
    box.fills = [solid(HEX.dark)];
    add(box, txt("✓", { size: 11, font: F.bold, color: HEX.white }));
    add(cb, box);
    add(cb, txt(o.checkbox, { size: 13, color: HEX.ink }));
    add(wrap, cb);
  } else {
    add(wrap, input(o));
  }
  if (o.hint) add(wrap, txt(o.hint, { size: 11, color: HEX.gray, wrap: true, stretch: true }));
  if (o.error) add(wrap, txt(o.error, { size: 11, color: HEX.red }));
  wrap.__stretch = true;
  return wrap;
}

function card(name, o) {
  o = o || {};
  var c = frame(name, {
    layout: o.layout || "VERTICAL",
    gap: o.gap !== undefined ? o.gap : 12,
    padX: o.padX !== undefined ? o.padX : 20,
    padY: o.padY !== undefined ? o.padY : 18,
    radius: o.radius !== undefined ? o.radius : 12,
    shadow: true,
    shadowSoft: true,
    stroke: o.stroke,
    primary: o.primary,
    cross: o.cross,
    w: o.w, h: o.h,
    clip: o.clip
  });
  c.fills = [solid(o.bg || HEX.white)];
  c.__stretch = !!o.stretch;
  c.__grow = !!o.grow;
  return c;
}

function sectionTitle(s, sub) {
  var v = frame("SectionTitle", { layout: "VERTICAL", gap: 2 });
  add(v, txt(s, { size: 15, font: F.semi, color: HEX.ink }));
  if (sub) add(v, txt(sub, { size: 11, color: HEX.gray }));
  return v;
}

// Мини-показатель: подпись сверху, значение снизу
function miniStat(label, value, color) {
  var v = frame("Stat", { layout: "VERTICAL", gap: 2, padX: 8, padY: 7, radius: 6 });
  v.fills = [solid(HEX.soft)];
  add(v, txt(label.toUpperCase(), { size: 9, color: HEX.gray, ls: 4 }));
  add(v, txt(value, { size: 12, font: F.semi, color: color || HEX.ink }));
  v.__grow = true;
  v.__stretch = true;
  return v;
}

// --- Композиты ---------------------------------------------------------------

function logoRow(boxSize, nameSize) {
  var row = frame("Logo", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  var box = frame("LogoBox", { layout: "HORIZONTAL", w: boxSize, h: boxSize, radius: 8, primary: "CENTER", cross: "CENTER" });
  box.fills = [solid(HEX.dark)];
  add(box, txt("A", { size: Math.round(boxSize * 0.55), font: F.bold, color: HEX.accent }));
  add(row, box);
  add(row, txt("AutoMind", { size: nameSize, font: F.semi, color: HEX.ink }));
  return row;
}

function topbar() {
  var tb = frame("Topbar", {
    layout: "HORIZONTAL", w: SCREEN_W, h: 64, padX: 24,
    primary: "SPACE_BETWEEN", cross: "CENTER"
  });
  tb.fills = [solid(HEX.white)];
  tb.strokes = [solid(HEX.border)];
  tb.strokeTopWeight = 0; tb.strokeLeftWeight = 0; tb.strokeRightWeight = 0; tb.strokeBottomWeight = 1;
  add(tb, logoRow(28, 18));
  var right = frame("Right", { layout: "HORIZONTAL", gap: 14, cross: "CENTER" });
  var pill = frame("SysStatus", { layout: "HORIZONTAL", gap: 7, padX: 11, padY: 6, radius: 999, cross: "CENTER" });
  pill.fills = [solid(HEX.soft)];
  add(pill, dot(HEX.green, 7));
  add(pill, txt("Система работает", { size: 12, color: HEX.gray }));
  add(right, pill);
  var user = frame("User", { layout: "HORIZONTAL", gap: 9, cross: "CENTER" });
  var av = frame("Avatar", { layout: "HORIZONTAL", w: 32, h: 32, radius: 999, primary: "CENTER", cross: "CENTER" });
  av.fills = [solid(HEX.accent, 0.35)];
  add(av, txt("ДИ", { size: 11, font: F.semi, color: HEX.dark }));
  add(user, av);
  add(user, txt("Диспетчер · Иванова А.", { size: 13, font: F.med, color: HEX.ink }));
  add(right, user);
  add(right, btn("Выход", "ghost", { padY: 8 }));
  add(tb, right);
  return tb;
}

function screenRoot(name, x, y, h) {
  var s = frame(name, { layout: "VERTICAL", w: SCREEN_W, h: h || SCREEN_H, bg: HEX.bg, clip: true });
  s.x = x; s.y = y;
  PAGE.appendChild(s);
  return s;
}

function kpiCard(title, value, hint, valueColor) {
  var c = card("KPI / " + title, { gap: 5, padX: 18, padY: 16 });
  add(c, txt(title, { size: 11, color: HEX.gray }));
  add(c, txt(value, { size: 22, font: F.bold, color: valueColor || HEX.ink }));
  add(c, txt(hint, { size: 10, color: HEX.gray }));
  c.__grow = true;
  c.__stretch = true;
  return c;
}

// Ячейка таблицы фиксированной ширины (текст с переносом)
function cell(v, w, o) {
  o = o || {};
  return tbox(v, w, {
    size: o.size || 12,
    font: o.font || F.reg,
    color: o.color || HEX.ink,
    align: o.align
  });
}

// Таблица: cols = [{title, w, align}], rows = массивы ячеек
// ячейка: {v, o} | {badge, badgeColor} | {driver:{name,badge,badgeColor}, color} | {stack:[tbox...]}
function table(name, cols, rows, rowH) {
  var wrap = frame(name, { layout: "VERTICAL", gap: 0 });
  wrap.__stretch = true;
  var head = frame("Head", { layout: "HORIZONTAL", h: 38, padX: 16, cross: "CENTER", gap: 0, radius: 8 });
  head.fills = [solid(HEX.soft)];
  cols.forEach(function (c) {
    add(head, cell(c.title.toUpperCase(), c.w, { size: 10, font: F.semi, color: HEX.gray, align: c.align }));
  });
  add(wrap, head);
  rows.forEach(function (row, i) {
    var r = frame("Row " + (i + 1), {
      layout: "HORIZONTAL", h: rowH || 48, padX: 16, cross: "CENTER", gap: 0,
      radius: row.__bg ? 8 : 0
    });
    r.fills = [solid(row.__bg || HEX.white)];
    r.strokes = [solid(HEX.border, 0.6)];
    r.strokeTopWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 1;
    row.forEach(function (cellDef, ci) {
      var colW = cols[ci] ? cols[ci].w : 100;
      if (cellDef && cellDef.driver) {
        var d = frame("DriverCell", { layout: "VERTICAL", gap: 3, w: cellDef.w || colW });
        add(d, txt(cellDef.driver.name, { size: 12, font: F.med, color: cellDef.color || HEX.ink, wrap: true }));
        if (cellDef.driver.badge) add(d, badge(cellDef.driver.badge, cellDef.driver.badgeColor, { size: 10, padX: 7, padY: 2 }));
        add(r, d);
      } else if (cellDef && cellDef.badge) {
        add(r, statusRow(cellDef.badge, cellDef.badgeColor));
      } else if (cellDef && cellDef.stack) {
        var st = frame("Stack", { layout: "VERTICAL", gap: 2, w: cellDef.w || colW });
        cellDef.stack.forEach(function (s) { add(st, s); });
        add(r, st);
      } else if (cellDef) {
        add(r, cell(cellDef.v || cellDef, cellDef.w || colW, cellDef.o));
      }
    });
    add(wrap, r);
  });
  return wrap;
}

// --- Экран 01. Дизайн-система -------------------------------------------------

function buildDesignSystem() {
  var s = frame("01 · Дизайн-система", { layout: "VERTICAL", w: 1160, gap: 30, padX: 44, padY: 40 });
  s.fills = [solid(HEX.white)];
  s.x = 0; s.y = 0;
  PAGE.appendChild(s);

  var head = frame("Head", { layout: "VERTICAL", gap: 6 });
  add(head, logoRow(32, 22));
  add(head, txt("Дизайн-система · ТЗ раздел 2: палитра, состояния объектов, элементы интерфейса", { size: 13, color: HEX.gray }));
  add(s, head);

  // Палитра
  var pal = frame("Palette", { layout: "VERTICAL", gap: 12 });
  add(pal, txt("ПАЛИТРА (ТЗ 2.2)", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var swatches = frame("Swatches", { layout: "HORIZONTAL", gap: 14 });
  [
    ["Светло-зелёный", "A8D5A2", "Основные акценты"],
    ["Тёмно-зелёный", "174D35", "Навигация и кнопки"],
    ["Почти чёрный", "171C19", "Текст, тёмные панели"],
    ["Оранжевый", "E6A23C", "Предупреждения, экономика"],
    ["Светлый фон", "F5F7F4", "Основной фон"],
    ["Белый", "FFFFFF", "Карточки"],
    ["Серый", "8A948D", "Второстепенное"],
    ["Красный", "D9534F", "Критично (решение п.7)"]
  ].forEach(function (p) {
    var sw = frame("Swatch", { layout: "VERTICAL", gap: 6, w: 124 });
    var r = rect(124, 58, p[1], 10);
    if (p[1] === "FFFFFF") { r.strokes = [solid(HEX.border)]; r.strokeWeight = 1; }
    add(sw, r);
    add(sw, txt(p[0], { size: 11, font: F.med, color: HEX.ink }));
    add(sw, txt("#" + p[1], { size: 10, color: HEX.gray }));
    add(sw, tbox(p[2], 120, { size: 9, color: HEX.gray }));
    add(swatches, sw);
  });
  add(pal, swatches);
  add(s, pal);

  // Состояния
  var states = frame("States", { layout: "VERTICAL", gap: 12 });
  add(states, txt("СОСТОЯНИЯ ОБЪЕКТОВ (ТЗ 2.3)", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var row = frame("Row", { layout: "HORIZONTAL", gap: 22, cross: "CENTER" });
  [["Штатная работа", HEX.green], ["Предупреждение", HEX.yellow], ["Требует внимания", HEX.warn], ["Критическая ситуация", HEX.red], ["Неактивен", HEX.gray]].forEach(function (p) {
    add(row, dotLabel(p[0], p[1]));
  });
  add(states, row);
  add(s, states);

  // Типографика
  var typo = frame("Typography", { layout: "VERTICAL", gap: 10 });
  add(typo, txt("ТИПОГРАФИКА · INTER", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  add(typo, txt("Заголовок страницы — 24 Semi Bold", { size: 24, font: F.semi }));
  add(typo, txt("Заголовок карточки — 16 Semi Bold", { size: 16, font: F.semi }));
  add(typo, txt("Основной текст — 13 Regular. Показания телеметрии и таблицы — 12.", { size: 13 }));
  add(typo, txt("Подпись и второстепенное — 11 Gray", { size: 11, color: HEX.gray }));
  add(s, typo);

  // Кнопки
  var btns = frame("Buttons", { layout: "VERTICAL", gap: 12 });
  add(btns, txt("КНОПКИ", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var brow = frame("Row", { layout: "HORIZONTAL", gap: 12, cross: "CENTER" });
  add(brow, btn("Рассчитать", "primary"));
  add(brow, btn("Отмена", "secondary"));
  add(brow, btn("Подробнее →", "ghost"));
  add(brow, btn("Удалить", "danger"));
  add(brow, btn("Недоступна", "disabled"));
  add(btns, brow);
  add(s, btns);

  // Поля
  var fields = frame("Fields", { layout: "VERTICAL", gap: 12 });
  add(fields, txt("ПОЛЯ ВВОДА", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var frow = frame("Row", { layout: "HORIZONTAL", gap: 16 });
  var f1 = frame("F1", { layout: "VERTICAL", gap: 6, w: 250 });
  add(f1, txt("Обычное поле", { size: 12, font: F.med }));
  add(f1, input({ placeholder: "Введите значение" }));
  var f2 = frame("F2", { layout: "VERTICAL", gap: 6, w: 250 });
  add(f2, txt("Активное поле", { size: 12, font: F.med }));
  var inp2 = input({ value: "86 500" });
  inp2.strokes = [solid(HEX.dark)]; inp2.strokeWeight = 1.5;
  add(f2, inp2);
  var f3 = field("Поле с ошибкой", { placeholder: "", error: "Укажите стоимость перевозки", grow: 0 });
  add(frow, f1); add(frow, f2); add(frow, f3);
  add(fields, frow);
  add(s, fields);

  // Бейджи
  var bdgs = frame("Badges", { layout: "VERTICAL", gap: 12 });
  add(bdgs, txt("СТАТУСЫ ЗАКАЗОВ", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var b2 = frame("Row", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  [["Новый", HEX.gray], ["Расчёт выполнен", HEX.dark], ["Водитель назначен", HEX.green], ["В рейсе", HEX.warn], ["Завершён", HEX.gray], ["Не оплачен", HEX.red]].forEach(function (p) {
    add(b2, statusRow(p[0], p[1]));
  });
  add(bdgs, b2);
  add(s, bdgs);
}

// --- Экран 02. Вход -----------------------------------------------------------

function buildLogin() {
  var s = screenRoot("02 · Вход", 1360, 0);
  s.primaryAxisAlignItems = "CENTER";
  s.counterAxisAlignItems = "CENTER";
  var c = card("LoginCard", { w: 420, gap: 16, padX: 36, padY: 34, radius: 16, primary: "CENTER" });
  add(c, logoRow(36, 22));
  var t = frame("T", { layout: "VERTICAL", gap: 6, cross: "CENTER" });
  add(t, txt("Вход в систему", { size: 17, font: F.semi }));
  add(t, txt("Введите код доступа, выданный администратором", { size: 12, color: HEX.gray, align: "CENTER", wrap: true, stretch: true }));
  add(c, t);
  add(c, field("Код доступа", { required: true, placeholder: "••••••••••", grow: 0 }));
  add(c, btn("Войти", "primary", { padY: 12, stretch: true }));
  add(c, divider(true));
  add(c, txt("Код проверяется на сервере и хранится в БД в виде хеша.\nКоличество попыток ограничено.", { size: 11, color: HEX.gray, align: "CENTER", wrap: true, stretch: true, lh: 150 }));
  var demo = frame("Demo", { layout: "HORIZONTAL", padX: 10, padY: 5, radius: 6, cross: "CENTER", gap: 6 });
  demo.fills = [solid(HEX.soft)];
  add(demo, txt("Демо-код: DEMO-2026", { size: 11, font: F.med, color: HEX.gray }));
  add(c, demo);
  add(s, c);
}

// --- Экран 03. Главная --------------------------------------------------------

function buildHome() {
  var s = screenRoot("03 · Главная", 0, 1200);
  add(s, topbar());
  var content = frame("Content", { layout: "VERTICAL", gap: 24, padX: 44, padY: 32 });
  content.__stretch = true; content.__grow = true;
  add(s, content);

  var head = frame("Head", { layout: "VERTICAL", gap: 4 });
  add(head, txt("Главная", { size: 24, font: F.semi }));
  add(head, txt("Добрый день, Анна! Что делаем сегодня?", { size: 13, color: HEX.gray }));
  add(content, head);

  // Три функциональных блока (ТЗ 2.5)
  var row = frame("Blocks", { layout: "HORIZONTAL", gap: 20 });
  row.__stretch = true;
  [
    ["🚚", "Мониторинг транспорта", "Карта автопарка, перемещение автомобилей по маршрутам, телеметрия, водители, история рейсов, ДТП и штрафы."],
    ["📊", "Экономика перевозок", "Создание заказа, расчёт себестоимости, сравнение водителей по экономике и рискам, назначение ответственного."],
    ["🤖", "AI Logistics Copilot", "Объяснение расчётов, анализ истории водителей и рекомендации по выбору — простым языком."]
  ].forEach(function (b) {
    var c = card("Block / " + b[1], { gap: 14, padX: 26, padY: 26 });
    add(c, iconCircle(b[0], 56, HEX.accent, 26));
    add(c, txt(b[1], { size: 19, font: F.semi }));
    add(c, txt(b[2], { size: 13, color: HEX.gray, wrap: true, stretch: true, lh: 155 }));
    var link = frame("Link", { layout: "HORIZONTAL", primary: "MAX", cross: "MAX" });
    add(link, txt("Перейти →", { size: 13, font: F.med, color: HEX.dark }));
    c.__stretch = true;
    add(c, link);
    c.__grow = true;
    add(row, c);
  });
  add(content, row);

  // KPI
  var kpis = frame("KPI", { layout: "HORIZONTAL", gap: 20 });
  kpis.__stretch = true;
  add(kpis, kpiCard("Автомобилей", "6", "2 требуют внимания"));
  add(kpis, kpiCard("Водителей", "6", "4 доступны для назначения"));
  add(kpis, kpiCard("Заказов в работе", "3", "1 новый, не рассчитан", HEX.warn));
  add(kpis, kpiCard("Средняя рентабельность", "27,1 %", "за последние 30 рейсов", HEX.dark));
  add(content, kpis);

  var note = frame("Note", { layout: "HORIZONTAL", gap: 8, cross: "CENTER", padX: 16, padY: 12, radius: 10 });
  note.fills = [solid(HEX.white)];
  note.strokes = [solid(HEX.border)]; note.strokeWeight = 1;
  note.__stretch = true;
  add(note, txt("ℹ", { size: 13, color: HEX.dark }));
  add(note, txt("Телеметрия обновляется автоматически (WebSocket). Окончательное решение по заказу всегда принимает диспетчер.", { size: 12, color: HEX.gray, wrap: true, stretch: true }));
  add(content, note);
}

// --- Экран 04. Мониторинг ------------------------------------------------------

function buildMonitoring() {
  var s = screenRoot("04 · Мониторинг транспорта", 0, 2400);
  add(s, topbar());

  var content = frame("Content", { layout: "HORIZONTAL" });
  content.__stretch = true; content.__grow = true;
  add(s, content);

  // --- Левая боковая панель (ТЗ 4.3) ---
  var side = frame("Sidebar", { layout: "VERTICAL", w: 280, gap: 14, padX: 16, padY: 16 });
  side.fills = [solid(HEX.white)];
  side.strokes = [solid(HEX.border)];
  side.strokeTopWeight = 0; side.strokeBottomWeight = 0; side.strokeRightWeight = 0; side.strokeLeftWeight = 1;
  side.__stretch = true;
  add(content, side);

  var seg = frame("Segments", { layout: "HORIZONTAL", padX: 4, padY: 4, radius: 9 });
  seg.fills = [solid(HEX.soft)];
  seg.__stretch = true;
  add(side, seg);
  [["Автомобили", true], ["Водители", false], ["Экономика", false]].forEach(function (t) {
    var item = frame("Seg / " + t[0], { layout: "HORIZONTAL", padX: 8, padY: 7, radius: 6, primary: "CENTER", cross: "CENTER" });
    if (t[1]) { item.fills = [solid(HEX.white)]; item.effects = SHADOW_SOFT; }
    add(item, txt(t[0], { size: 11, font: t[1] ? F.semi : F.reg, color: t[1] ? HEX.ink : HEX.gray, align: "CENTER" }));
    item.__grow = true;
    add(seg, item);
  });

  add(side, input({ placeholder: "🔍  Поиск по госномеру…", fillBg: HEX.soft, h: 36 }));

  var list = frame("VehicleList", { layout: "VERTICAL", gap: 4 });
  list.__stretch = true;
  add(side, list);
  var vehicles = [
    ["А 321 ВС 77", "ГАЗель NEXT · Смирнов П. В.", "В рейсе", HEX.green, false],
    ["В 456 МН 50", "MAN TGX · Ковалёв Д. С.", "Активен", HEX.green, false],
    ["Е 789 КХ 77", "Iveco Daily · Ерёмин А. П.", "Предупреждение", HEX.yellow, true],
    ["К 112 ОР 77", "КамАЗ 6520 · Гулиев Р. Н.", "Требует внимания", HEX.warn, false],
    ["М 234 УЕ 50", "Hyundai HD78 · Лебедев И. М.", "Критично", HEX.red, false],
    ["Н 567 АК 77", "Largus фургон · без водителя", "Неактивен", HEX.gray, false]
  ];
  vehicles.forEach(function (v) {
    var item = frame("Vehicle / " + v[0], {
      layout: "HORIZONTAL", padX: 10, padY: 9, radius: 8, cross: "CENTER",
      primary: "SPACE_BETWEEN"
    });
    if (v[4]) { item.fills = [solid(HEX.softGreen)]; item.strokes = [solid(HEX.accent)]; item.strokeWeight = 1; }
    var l = frame("L", { layout: "VERTICAL", gap: 2 });
    add(l, txt(v[0], { size: 13, font: F.med }));
    add(l, txt(v[1], { size: 10, color: HEX.gray }));
    add(item, l);
    add(item, dot(v[3], 8));
    item.__stretch = true;
    add(list, item);
  });

  var sideBtns = frame("SideBtns", { layout: "VERTICAL", gap: 8 });
  sideBtns.__stretch = true;
  add(side, sideBtns);
  var addRow = frame("AddRow", { layout: "HORIZONTAL", gap: 8 });
  addRow.__stretch = true;
  add(sideBtns, addRow);
  var bA = btn("+ Автомобиль", "secondary", { padX: 12, padY: 9, size: 12 }); bA.__grow = true;
  var bD = btn("+ Водитель", "secondary", { padX: 12, padY: 9, size: 12 }); bD.__grow = true;
  add(addRow, bA); add(addRow, bD);
  add(sideBtns, btn("⚙  Экономические параметры", "ghost", { padY: 8, stretch: true }));
  add(content, side);

  // --- Центр: карта (ТЗ 4.6) ---
  var center = frame("Center", { layout: "VERTICAL", gap: 10, padX: 16, padY: 16 });
  center.__grow = true; center.__stretch = true;
  add(content, center);
  var head = frame("Head", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
  head.__stretch = true;
  add(center, head);
  add(head, txt("Мониторинг транспорта", { size: 19, font: F.semi }));
  add(head, txt("Обновлено 2 сек назад · канал WebSocket", { size: 11, color: HEX.gray }));

  var map = frame("Map", { w: 800, h: 830, bg: HEX.mapBg, radius: 12, clip: true, shadow: true, shadowSoft: true });
  add(center, map);

  // кварталы, парки, дороги
  [[60, 60, 150, 110], [260, 90, 120, 90], [620, 80, 130, 150], [90, 600, 170, 130], [520, 640, 150, 120], [400, 300, 90, 70], [250, 640, 90, 110]]
    .forEach(function (b) {
      var r = rect(b[2], b[3], HEX.mapBlock, 4);
      r.x = b[0]; r.y = b[1];
      map.appendChild(r);
    });
  [[660, 620, 120, 170], [40, 300, 110, 130]].forEach(function (b) {
    var r = rect(b[2], b[3], HEX.mapPark, 8);
    r.x = b[0]; r.y = b[1];
    map.appendChild(r);
  });
  [[0, 226, 800, 12], [0, 560, 800, 14], [218, 0, 12, 830], [556, 0, 10, 830]].forEach(function (b) {
    var r = rect(b[2], b[3], HEX.white);
    r.x = b[0]; r.y = b[1];
    map.appendChild(r);
  });

  // маршрут (ТЗ 4.6): последовательность координат
  var route = figma.createVector();
  route.vectorPaths = [{ windingRule: "NONE", data: "M 90 700 L 240 430 L 380 470 L 540 320 L 680 260 L 760 130" }];
  route.strokes = [solid(HEX.dark)];
  route.strokeWeight = 3;
  route.dashPattern = [8, 7];
  route.strokeCap = "ROUND";
  route.strokeJoin = "ROUND";
  route.fills = [];
  route.x = 0; route.y = 0;
  map.appendChild(route);

  // маркеры автомобилей
  function marker(x, y, n, color, selected) {
    var m = frame("Marker " + n, { layout: "HORIZONTAL", w: selected ? 32 : 26, h: selected ? 32 : 26, radius: 999, primary: "CENTER", cross: "CENTER" });
    m.x = x; m.y = y;
    m.fills = [solid(color)];
    if (selected) { m.strokes = [solid(HEX.white)]; m.strokeWeight = 3; m.effects = SHADOW; }
    add(m, txt(n, { size: selected ? 13 : 11, font: F.bold, color: HEX.white }));
    map.appendChild(m);
    return m;
  }
  marker(76, 686, "2", HEX.green, false);
  marker(366, 456, "1", HEX.green, false);
  marker(526, 306, "3", HEX.yellow, true);   // выбран: Ерёмин, Iveco
  marker(666, 246, "4", HEX.warn, false);
  marker(746, 116, "5", HEX.red, false);
  marker(226, 416, "6", HEX.gray, false);

  // всплывающая карточка у выбранного маркера
  var pop = card("Popup", { w: 196, gap: 5, padX: 12, padY: 10, radius: 10 });
  pop.x = 420; pop.y = 210;
  map.appendChild(pop);
  var pr = frame("PR", { layout: "HORIZONTAL", gap: 7, cross: "CENTER" });
  add(pr, txt("Е 789 КХ 77", { size: 12, font: F.semi }));
  add(pr, dot(HEX.yellow, 7));
  add(pop, pr);
  add(pop, tbox("Iveco Daily · дизель · Ерёмин А. П.", 172, { size: 10, color: HEX.gray }));
  add(pop, txt("74 км/ч · топливо 21 %", { size: 10, color: HEX.ink }));
  add(pop, tbox("Двигатель 94 °C — выше нормы", 172, { size: 10, font: F.med, color: HEX.warn }));

  // зум
  var zoom = frame("Zoom", { layout: "VERTICAL", w: 30, radius: 8, shadow: true });
  zoom.fills = [solid(HEX.white)];
  zoom.x = 756; zoom.y = 24;
  var zp = frame("Z+", { layout: "HORIZONTAL", w: 30, h: 30, primary: "CENTER", cross: "CENTER" });
  add(zp, txt("+", { size: 15, font: F.med, color: HEX.gray }));
  var zm = frame("Z−", { layout: "HORIZONTAL", w: 30, h: 30, primary: "CENTER", cross: "CENTER" });
  add(zm, txt("−", { size: 15, font: F.med, color: HEX.gray }));
  add(zoom, zp);
  var zdiv = frame("Div", { w: 30, h: 1, bg: HEX.border });
  add(zoom, zdiv);
  add(zoom, zm);
  map.appendChild(zoom);

  // легенда состояний
  var legend = frame("Legend", { layout: "HORIZONTAL", gap: 12, padX: 12, padY: 8, radius: 8, cross: "CENTER", opacity: 0.94 });
  legend.fills = [solid(HEX.white)];
  legend.x = 16; legend.y = 778;
  [["Штат", HEX.green], ["Предупреждение", HEX.yellow], ["Внимание", HEX.warn], ["Критично", HEX.red], ["Неактивен", HEX.gray]].forEach(function (l) {
    add(legend, dotLabel(l[0], l[1], 7));
  });
  map.appendChild(legend);
  var attr = txt("© OpenStreetMap contributors", { size: 9, color: HEX.gray, opacity: 0.8 });
  attr.x = 620; attr.y = 806;
  map.appendChild(attr);

  // --- Правая панель (ТЗ 4.8): выбран Ерёмин А. П. ---
  var right = frame("InfoPanel", { layout: "VERTICAL", w: 320, gap: 10, padX: 14, padY: 14, bg: HEX.bg, clip: true });
  right.strokes = [solid(HEX.border)];
  right.strokeTopWeight = 0; right.strokeBottomWeight = 0; right.strokeLeftWeight = 0; right.strokeRightWeight = 1;
  right.__stretch = true;
  add(content, right);

  // Блок 1: водитель
  var d1 = card("Driver", { gap: 10, padX: 14, padY: 13 });
  var dr1 = frame("Row", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  dr1.__stretch = true;
  var av2 = frame("Avatar", { layout: "HORIZONTAL", w: 42, h: 42, radius: 999, primary: "CENTER", cross: "CENTER" });
  av2.fills = [solid(HEX.accent, 0.35)];
  add(av2, txt("АЕ", { size: 13, font: F.semi, color: HEX.dark }));
  add(dr1, av2);
  var dv = frame("V", { layout: "VERTICAL", gap: 2 });
  dv.__grow = true;
  add(dv, txt("Ерёмин Антон Павлович", { size: 13, font: F.semi, wrap: true }));
  add(dv, txt("Стаж 5 лет · кат. C, CE", { size: 11, color: HEX.gray }));
  add(dr1, dv);
  add(dr1, statusRow("В рейсе", HEX.green));
  add(d1, dr1);
  add(d1, txt("+7 (903) 118-42-76 · принят 12.03.2021", { size: 11, color: HEX.gray }));
  var stats = frame("Stats", { layout: "HORIZONTAL", gap: 6 });
  stats.__stretch = true;
  add(stats, miniStat("Рейсы", "61"));
  add(stats, miniStat("ДТП", "3", HEX.red));
  add(stats, miniStat("Наруш.", "2", HEX.warn));
  add(stats, miniStat("Штрафы", "8 000 ₽", HEX.warn));
  add(d1, stats);
  add(right, d1);

  // Блок 2: автомобиль
  var d2 = card("Vehicle", { gap: 6, padX: 14, padY: 13 });
  add(d2, txt("АВТОМОБИЛЬ", { size: 9, font: F.semi, color: HEX.gray, ls: 4 }));
  var vRow = frame("Row", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
  vRow.__stretch = true;
  var vl = frame("V", { layout: "VERTICAL", gap: 2 });
  add(vl, txt("Iveco Daily", { size: 13, font: F.semi }));
  add(vl, txt("Е 789 КХ 77 · 2018 г. · дизель", { size: 11, color: HEX.gray }));
  add(vRow, vl);
  add(vRow, statusRow("Предупреждение", HEX.yellow));
  add(d2, vRow);
  var stats2 = frame("Stats", { layout: "HORIZONTAL", gap: 6 });
  stats2.__stretch = true;
  add(stats2, miniStat("Пробег", "241 530 км"));
  add(stats2, miniStat("Топливо", "21 %", HEX.warn));
  add(stats2, miniStat("Норма", "15,5 л/100"));
  add(d2, stats2);
  add(right, d2);

  // Блок 3: телеметрия
  var d3 = card("Telemetry", { gap: 8, padX: 14, padY: 13 });
  add(d3, txt("ТЕЛЕМЕТРИЯ · ОБНОВЛЕНО 2 СЕК НАЗАД", { size: 9, font: F.semi, color: HEX.gray, ls: 3 }));
  var g1 = frame("G1", { layout: "HORIZONTAL", gap: 6 });
  g1.__stretch = true;
  add(g1, miniStat("Скорость", "74 км/ч"));
  add(g1, miniStat("Обороты", "2 100"));
  add(g1, miniStat("Т двиг.", "94 °C", HEX.warn));
  add(d3, g1);
  var g2 = frame("G2", { layout: "HORIZONTAL", gap: 6 });
  g2.__stretch = true;
  add(g2, miniStat("Т охл. жидк.", "92 °C", HEX.warn));
  add(g2, miniStat("Расход", "16,8 л/100"));
  add(g2, miniStat("Масло", "3,2 бар"));
  add(d3, g2);
  var g3 = frame("G3", { layout: "HORIZONTAL", gap: 6 });
  g3.__stretch = true;
  add(g3, miniStat("Аккумулятор", "12,4 В"));
  add(g3, miniStat("Зажигание", "Вкл"));
  add(g3, miniStat("Движение", "Да"));
  add(d3, g3);
  var warnChip = frame("Warn", { layout: "HORIZONTAL", gap: 7, padX: 10, padY: 7, radius: 8, cross: "CENTER" });
  warnChip.fills = [solid(HEX.warn, 0.12)];
  warnChip.__stretch = true;
  add(warnChip, txt("⚠", { size: 11, color: HEX.warn }));
  add(warnChip, txt("Перегрев двигателя — требуется внимание диспетчера", { size: 10, font: F.med, color: HEX.warn, wrap: true, stretch: true }));
  add(d3, warnChip);
  add(right, d3);

  // Блок 4: последние поездки
  var d4 = card("Trips", { gap: 8, padX: 14, padY: 13 });
  add(d4, txt("ПОСЛЕДНИЕ ПОЕЗДКИ (ИЗ 5)", { size: 9, font: F.semi, color: HEX.gray, ls: 3 }));
  [
    ["28.10 · Москва → Тула", "185 км · 6 ч 05 м · 34,0 л", "9 210 ₽", "без ДТП"],
    ["22.10 · Тула → Рязань", "162 км · 5 ч 20 м · 29,5 л", "8 480 ₽", "без ДТП"],
    ["15.10 · Москва → Калуга", "178 км · 5 ч 50 м · 31,2 л", "8 970 ₽", "ДТП на рейсе"]
  ].forEach(function (t, i) {
    var r = frame("Trip", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
    r.__stretch = true;
    var l = frame("L", { layout: "VERTICAL", gap: 2 });
    add(l, txt(t[0], { size: 12, font: F.med }));
    add(l, txt(t[1], { size: 10, color: HEX.gray }));
    add(r, l);
    var rr = frame("R", { layout: "VERTICAL", gap: 2, primary: "MAX", cross: "MAX" });
    add(rr, txt(t[2], { size: 12, font: F.semi }));
    add(rr, txt(t[3], { size: 9, color: i === 2 ? HEX.red : HEX.gray }));
    add(r, rr);
    add(d4, r);
  });
  add(d4, txt("Все 5 поездок →", { size: 11, font: F.med, color: HEX.dark }));
  add(right, d4);

  // Блок 5: ДТП и штрафы
  var d5 = card("Incidents", { gap: 8, padX: 14, padY: 13 });
  add(d5, txt("ДТП И ШТРАФЫ", { size: 9, font: F.semi, color: HEX.gray, ls: 4 }));
  [
    ["ДТП · столкновение на перекрёстке", "18.09.2025 · виновен · без штрафа", HEX.red],
    ["Нарушение · превышение +21 км/ч", "03.07.2025 · штраф 1 500 ₽ · оплачен", HEX.warn],
    ["Нарушение · проезд на красный", "14.02.2025 · штраф 1 000 ₽ · оплачен", HEX.warn]
  ].forEach(function (t) {
    var r = frame("Inc", { layout: "HORIZONTAL", gap: 8, cross: "CENTER" });
    r.__stretch = true;
    add(r, dot(t[2], 7));
    var l = frame("L", { layout: "VERTICAL", gap: 1 });
    l.__grow = true;
    add(l, txt(t[0], { size: 11, font: F.med, wrap: true }));
    add(l, txt(t[1], { size: 10, color: HEX.gray }));
    add(r, l);
    add(d5, r);
  });
  add(right, d5);
}

// --- Экран 05. Список заказов ---------------------------------------------------

function buildOrders() {
  var s = screenRoot("05 · Экономика — список заказов", 0, 3600);
  add(s, topbar());
  var content = frame("Content", { layout: "VERTICAL", gap: 18, padX: 32, padY: 28 });
  content.__stretch = true; content.__grow = true;
  add(s, content);

  var head = frame("Head", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
  head.__stretch = true;
  var hl = frame("HL", { layout: "VERTICAL", gap: 4 });
  add(hl, txt("Экономика перевозок", { size: 24, font: F.semi }));
  add(hl, txt("Заказы на перевозку и результаты экономического анализа", { size: 13, color: HEX.gray }));
  add(head, hl);
  add(head, btn("+ Создать заказ", "primary"));
  add(content, head);

  var cols = [
    { title: "№", w: 56 }, { title: "Заказ", w: 236 }, { title: "Груз", w: 140 },
    { title: "Маршрут", w: 210 }, { title: "Км", w: 88, align: "RIGHT" },
    { title: "Выручка", w: 112, align: "RIGHT" }, { title: "Себестоимость", w: 118, align: "RIGHT" },
    { title: "Прибыль", w: 112, align: "RIGHT" }, { title: "Рентаб.", w: 88, align: "RIGHT" },
    { title: "Статус", w: 144 }
  ];
  var rows = [
    [{ v: "15" }, { driver: { name: "Перевозка стеклопакетов" }, badge: "Хрупкий", badgeColor: HEX.dark, w: 236 },
     { v: "2 400 кг" }, { v: "Москва → Тула" }, { v: "225", o: { align: "RIGHT" } },
     { v: "86 500 ₽", o: { align: "RIGHT", font: F.med } }, { v: "30 131 ₽", o: { align: "RIGHT" } },
     { v: "56 369 ₽", o: { align: "RIGHT", font: F.med } }, { v: "65,2 %", o: { align: "RIGHT", color: HEX.green, font: F.med } },
     { badge: "Расчёт выполнен", badgeColor: HEX.dark }],
    [{ v: "14" }, { driver: { name: "Доставка мебели" }, badge: "Обычный", badgeColor: HEX.gray, w: 236 },
     { v: "5 800 кг" }, { v: "Казань → Самара" }, { v: "640", o: { align: "RIGHT" } },
     { v: "148 000 ₽", o: { align: "RIGHT", font: F.med } }, { v: "96 200 ₽", o: { align: "RIGHT" } },
     { v: "51 800 ₽", o: { align: "RIGHT", font: F.med } }, { v: "35,0 %", o: { align: "RIGHT", color: HEX.green, font: F.med } },
     { badge: "Назначен", badgeColor: HEX.green }],
    [{ v: "13" }, { driver: { name: "Продукты (рефрижератор)" }, badge: "Скоропортящийся", badgeColor: HEX.warn, w: 236 },
     { v: "4 100 кг" }, { v: "Тверь → Москва" }, { v: "170", o: { align: "RIGHT" } },
     { v: "54 000 ₽", o: { align: "RIGHT", font: F.med } }, { v: "51 900 ₽", o: { align: "RIGHT" } },
     { v: "2 100 ₽", o: { align: "RIGHT", font: F.med } }, { v: "3,9 %", o: { align: "RIGHT", color: HEX.warn, font: F.med } },
     { badge: "В рейсе", badgeColor: HEX.warn }],
    [{ v: "12" }, { driver: { name: "Строительные материалы" }, badge: "Обычный", badgeColor: HEX.gray, w: 236 },
     { v: "12 000 кг" }, { v: "Рязань → Воронеж" }, { v: "220", o: { align: "RIGHT" } },
     { v: "61 000 ₽", o: { align: "RIGHT", font: F.med } }, { v: "58 400 ₽", o: { align: "RIGHT" } },
     { v: "2 600 ₽", o: { align: "RIGHT", font: F.med } }, { v: "4,3 %", o: { align: "RIGHT", color: HEX.warn, font: F.med } },
     { badge: "Завершён", badgeColor: HEX.gray }],
    [{ v: "11" }, { driver: { name: "Промышленное оборудование" }, badge: "Крупногабаритный", badgeColor: HEX.gray, w: 236 },
     { v: "9 300 кг" }, { v: "Тула → Липецк" }, { v: "205", o: { align: "RIGHT" } },
     { v: "72 500 ₽", o: { align: "RIGHT", font: F.med } }, { v: "—", o: { align: "RIGHT", color: HEX.gray } },
     { v: "—", o: { align: "RIGHT", color: HEX.gray } }, { v: "—", o: { align: "RIGHT", color: HEX.gray } },
     { badge: "Новый", badgeColor: HEX.gray }]
  ];
  var cardTable = card("OrdersTable", { padX: 8, padY: 10, gap: 0 });
  cardTable.__stretch = true;
  add(cardTable, table("Orders", cols, rows, 50));
  add(content, cardTable);

  var foot = frame("Foot", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN" });
  foot.__stretch = true;
  add(foot, txt("Показано 5 из 27 заказов", { size: 12, color: HEX.gray }));
  add(foot, txt("Себестоимость и прибыль — лучшие значения среди кандидатов", { size: 11, color: HEX.gray }));
  add(content, foot);
}

// --- Экран 06. Создание заказа ---------------------------------------------------

function buildOrderForm() {
  var s = screenRoot("06 · Создание заказа", 1560, 3600);
  add(s, topbar());
  var content = frame("Content", { layout: "HORIZONTAL", gap: 22, padX: 32, padY: 28 });
  content.__stretch = true; content.__grow = true;
  add(s, content);

  var left = frame("Left", { layout: "VERTICAL", gap: 16 });
  left.__grow = true; left.__stretch = true;
  add(content, left);

  var c1 = card("Cargo", { gap: 14 });
  c1.__stretch = true;
  add(c1, sectionTitle("Основная информация", "ТЗ 5.3.1 · поля со звёздочкой обязательны"));
  add(c1, field("Название заказа", { required: true, value: "Перевозка стеклопакетов" }));
  var r1 = frame("R1", { layout: "HORIZONTAL", gap: 14 });
  r1.__stretch = true;
  add(r1, field("Тип груза", { required: true, value: "Хрупкий", iconRight: "▾" }));
  add(r1, field("Описание груза", { value: "Стеклопакеты в деревянных рамах" }));
  add(c1, r1);
  var r2 = frame("R2", { layout: "HORIZONTAL", gap: 14 });
  r2.__stretch = true;
  add(r2, field("Масса груза, кг", { required: true, value: "2 400" }));
  add(r2, field("Объём груза, м³", { value: "6,2" }));
  add(c1, r2);
  var r3 = frame("R3", { layout: "HORIZONTAL", gap: 14 });
  r3.__stretch = true;
  add(r3, field("Хрупкий груз", { checkbox: "Требует особой осторожности" }));
  add(r3, field("Особые условия перевозки", { value: "Избегать резких торможений" }));
  add(c1, r3);
  add(left, c1);

  var c2 = card("Route", { gap: 14 });
  c2.__stretch = true;
  add(c2, sectionTitle("Маршрут", "ТЗ 5.3.2 · доп. пробег — порожние перемещения"));
  var r4 = frame("R4", { layout: "HORIZONTAL", gap: 14 });
  r4.__stretch = true;
  add(r4, field("Начальный адрес", { required: true, value: "Москва, ул. Складская, 12" }));
  add(r4, field("Конечный адрес", { required: true, value: "Тула, пр. Мира, 44" }));
  add(c2, r4);
  var r5 = frame("R5", { layout: "HORIZONTAL", gap: 14 });
  r5.__stretch = true;
  add(r5, field("Расстояние, км", { required: true, value: "185" }));
  add(r5, field("Дополнительный пробег, км", { required: true, value: "40" }));
  add(r5, field("Плановое время, ч", { required: true, value: "6" }));
  add(c2, r5);
  add(left, c2);

  var c3 = card("Economics", { gap: 14 });
  c3.__stretch = true;
  add(c3, sectionTitle("Экономические данные", "Загружены из настроек компании · можно скорректировать"));
  var r6 = frame("R6", { layout: "HORIZONTAL", gap: 14 });
  r6.__stretch = true;
  add(r6, field("Выручка за заказ, ₽", { required: true, placeholder: "—", error: "Укажите стоимость перевозки" }));
  add(r6, field("Стоимость топлива, ₽/л", { required: true, value: "62,50" }));
  add(c3, r6);
  var r7 = frame("R7", { layout: "HORIZONTAL", gap: 14 });
  r7.__stretch = true;
  add(r7, field("Оплата труда водителя, ₽/ч", { required: true, value: "320" }));
  add(r7, field("Обслуживание, ₽/км", { required: true, value: "4,20" }));
  add(c3, r7);
  var r8 = frame("R8", { layout: "HORIZONTAL", gap: 14 });
  r8.__stretch = true;
  add(r8, field("Доп. расходы, ₽", { required: true, value: "0" }));
  add(r8, field("Платные дороги, ₽", { required: true, value: "1 250" }));
  add(r8, field("Прочие расходы, ₽", { required: true, value: "0" }));
  add(c3, r8);
  add(c3, txt("Пустое поле не считается нулём: если параметр не применяется — укажите 0 явно (ТЗ 5.3.3).", { size: 11, color: HEX.gray, wrap: true, stretch: true }));
  add(left, c3);

  var actions = frame("Actions", { layout: "HORIZONTAL", gap: 12, cross: "CENTER" });
  actions.__stretch = true;
  add(actions, btn("Рассчитать себестоимость", "disabled"));
  add(actions, btn("Сохранить черновик", "secondary"));
  add(actions, btn("Отмена", "ghost"));
  var spacerN = frame("Sp", { h: 1 });
  spacerN.__grow = true;
  add(actions, spacerN);
  add(actions, txt("Расчёт выполняется на сервере", { size: 11, color: HEX.gray }));
  add(left, actions);

  add(content, left);

  // Правая колонка: проверка данных
  var right = frame("Right", { layout: "VERTICAL", gap: 14, w: 330 });
  right.__stretch = true;
  add(content, right);
  var check = card("Validation", { gap: 10 });
  check.__stretch = true;
  add(check, txt("ПРОВЕРКА ДАННЫХ", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  [
    ["✓", "Название заказа заполнено", HEX.green],
    ["✓", "Маршрут задан полностью", HEX.green],
    ["✓", "Экономические параметры заданы", HEX.green],
    ["✕", "Выручка за заказ не указана", HEX.red]
  ].forEach(function (i) {
    var row = frame("Chk", { layout: "HORIZONTAL", gap: 8, cross: "CENTER" });
    add(row, txt(i[0], { size: 12, font: F.bold, color: i[2] }));
    add(row, txt(i[1], { size: 12, color: i[2] === HEX.red ? HEX.red : HEX.ink, wrap: true, stretch: true }));
    row.__stretch = true;
    add(check, row);
  });
  add(check, divider(true));
  add(check, txt("Расчёт не запускается, пока есть ошибки заполнения (ТЗ 5.4).", { size: 11, color: HEX.gray, wrap: true, stretch: true }));
  add(right, check);

  var summary = card("Summary", { gap: 10 });
  summary.__stretch = true;
  add(summary, txt("СВОДКА РАСЧЁТА", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  add(summary, txt("Появится после успешного запуска: себестоимость по каждому кандидату, прибыль, рентабельность, риск и итоговая оценка.", { size: 12, color: HEX.gray, wrap: true, stretch: true, lh: 150 }));
  add(right, summary);
}

// --- Экран 07. Результаты расчёта ------------------------------------------------

function buildResults() {
  var s = screenRoot("07 · Результаты расчёта", 0, 4900, 1150);
  add(s, topbar());
  var content = frame("Content", { layout: "VERTICAL", gap: 16, padX: 32, padY: 26 });
  content.__stretch = true; content.__grow = true;
  add(s, content);

  add(content, txt("← Назад к списку заказов", { size: 12, color: HEX.gray }));
  var head = frame("Head", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
  head.__stretch = true;
  var hl = frame("HL", { layout: "VERTICAL", gap: 4 });
  add(hl, txt("Заказ №15 · Перевозка стеклопакетов", { size: 21, font: F.semi }));
  add(hl, txt("Хрупкий груз · 2 400 кг · Москва → Тула · 225 км (185 + 40 порожний) · план 6 ч · выручка 86 500 ₽", { size: 12, color: HEX.gray }));
  add(head, hl);
  add(head, statusRow("Расчёт выполнен", HEX.dark));
  add(content, head);

  var kpis = frame("KPI", { layout: "HORIZONTAL", gap: 16 });
  kpis.__stretch = true;
  add(kpis, kpiCard("Выручка", "86 500 ₽", "введена диспетчером"));
  add(kpis, kpiCard("Лучшая себестоимость", "30 131 ₽", "Смирнов П. В. · ГАЗель NEXT"));
  add(kpis, kpiCard("Максимальная прибыль", "56 369 ₽", "рентабельность 65,2 %", HEX.dark));
  add(kpis, kpiCard("Лучший кандидат", "Смирнов П. В.", "оценка 93/100 · риск 8/100", HEX.dark));
  add(content, kpis);

  // Сравнительная таблица (ТЗ 5.7/5.9)
  var cols = [
    { title: "Водитель", w: 240 }, { title: "Автомобиль", w: 168 },
    { title: "Топливо", w: 104, align: "RIGHT" }, { title: "Себестоимость", w: 122, align: "RIGHT" },
    { title: "Прибыль", w: 116, align: "RIGHT" }, { title: "Рентаб.", w: 92, align: "RIGHT" },
    { title: "ДТП", w: 52, align: "RIGHT" }, { title: "Штрафы", w: 96, align: "RIGHT" },
    { title: "Риск", w: 68, align: "RIGHT" }, { title: "Оценка", w: 76, align: "RIGHT" },
    { title: "Комментарий", w: 170 }
  ];
  function money(v, o) { return { v: v, o: Object.assign({ align: "RIGHT" }, o || {}) }; }
  var rows = [
    { __bg: HEX.softGreen, cells: [
      { driver: { name: "Смирнов П. В.", badge: "★ Лучший", badgeColor: HEX.dark }, w: 240 },
      { stack: [cell("ГАЗель NEXT", 168, { font: F.med }), cell("А 321 ВС 77", 168, { size: 10, color: HEX.gray })] },
      money("26 016 ₽"), money("30 131 ₽", { font: F.med }), money("56 369 ₽", { font: F.med, color: HEX.green }),
      money("65,2 %", { color: HEX.green, font: F.med }), money("0", { color: HEX.green }), money("0 ₽", { color: HEX.green }),
      money("8", { color: HEX.green, font: F.med }), money("93", { color: HEX.dark, font: F.bold }),
      { v: "Минимальный риск для хрупкого груза", o: { size: 10, color: HEX.gray } }
    ]},
    { cells: [
      { driver: { name: "Ковалёв Д. С.", badge: "Кандидат", badgeColor: HEX.green }, w: 240 },
      { stack: [cell("MAN TGX", 168, { font: F.med }), cell("В 456 МН 50", 168, { size: 10, color: HEX.gray })] },
      money("37 969 ₽"), money("42 084 ₽"), money("44 416 ₽"),
      money("51,3 %"), money("0"), money("1 500 ₽"), money("12"), money("79", { font: F.semi }),
      { v: "Надёжный, но дороже по топливу", o: { size: 10, color: HEX.gray } }
    ]},
    { cells: [
      { driver: { name: "Гулиев Р. Н.", badge: "Кандидат", badgeColor: HEX.green }, w: 240 },
      { stack: [cell("КамАЗ 6520", 168, { font: F.med }), cell("К 112 ОР 77", 168, { size: 10, color: HEX.gray })] },
      money("45 000 ₽"), money("49 115 ₽"), money("37 385 ₽"),
      money("43,2 %"), money("0"), money("1 500 ₽"), money("14"), money("74", { font: F.semi }),
      { v: "Высокий расход топлива", o: { size: 10, color: HEX.gray } }
    ]},
    { __bg: "FAFBFA", cells: [
      { driver: { name: "Ерёмин А. П.", badge: "Недоступен · в рейсе", badgeColor: HEX.red }, color: HEX.gray, w: 240 },
      { stack: [cell("Iveco Daily", 168, { color: HEX.gray, font: F.med }), cell("Е 789 КХ 77", 168, { size: 10, color: HEX.gray })] },
      money("21 797 ₽", { color: HEX.gray }), money("25 912 ₽", { color: HEX.gray }),
      money("60 588 ₽", { color: HEX.gray }), money("70,0 %", { color: HEX.gray }),
      money("3", { color: HEX.gray }), money("8 000 ₽", { color: HEX.gray }), money("78", { color: HEX.red, font: F.med }),
      money("61", { color: HEX.gray }),
      { v: "Дешевле на 4 219 ₽, но риск выше в 9 раз", o: { size: 10, color: HEX.warn } }
    ]},
    { __bg: "FAFBFA", cells: [
      { driver: { name: "Лебедев И. М.", badge: "Авто на обслуживании", badgeColor: HEX.gray }, color: HEX.gray, w: 240 },
      { stack: [cell("Hyundai HD78", 168, { color: HEX.gray, font: F.med }), cell("М 234 УЕ 50", 168, { size: 10, color: HEX.gray })] },
      money("—", { color: HEX.gray }), money("—", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }), money("1"), money("0 ₽", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }),
      { v: "Не рассматривается (ТЗ 5.7)", o: { size: 10, color: HEX.gray } }
    ]},
    { __bg: "FAFBFA", cells: [
      { driver: { name: "Мамедов Э. Б.", badge: "Нет закреплённого ТС", badgeColor: HEX.gray }, color: HEX.gray, w: 240 },
      { stack: [cell("—", 168, { color: HEX.gray }), cell("решение п.10", 168, { size: 9, color: HEX.gray })] },
      money("—", { color: HEX.gray }), money("—", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }), money("0"), money("0 ₽", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }),
      { v: "История: 7 рейсов, данных мало", o: { size: 10, color: HEX.gray } }
    ]}
  ];
  var tRows = rows.map(function (r) { return r.cells; });
  tRows[0].__bg = HEX.softGreen; tRows[3].__bg = "FAFBFA"; tRows[4].__bg = "FAFBFA"; tRows[5].__bg = "FAFBFA";
  var cardTable = card("Candidates", { padX: 8, padY: 10, gap: 0 });
  cardTable.__stretch = true;
  add(cardTable, txt("СРАВНЕНИЕ КАНДИДАТОВ · ОПЛАТА ТРУДА 1 920 ₽, ОБСЛУЖИВАНИЕ 945 ₽, ПЛАТНЫЕ ДОРОГИ 1 250 ₽ — ОБЩИЕ ДЛЯ ВСЕХ", { size: 9, font: F.semi, color: HEX.gray, ls: 2 }));
  add(cardTable, table("CandidatesTable", cols, tRows, 54));
  add(content, cardTable);

  // Низ: обоснование + назначение
  var bottom = frame("Bottom", { layout: "HORIZONTAL", gap: 16 });
  bottom.__stretch = true; bottom.__grow = true;
  add(content, bottom);
  var why = card("Why", { gap: 12 });
  why.__grow = true; why.__stretch = true;
  add(why, sectionTitle("Обоснование оценки · Смирнов П. В.", "Веса для хрупкого груза: ДТП повышены до 35 % (решение п.5)"));
  var bars = [
    ["Экономическая эффективность · 25 %", 84],
    ["История ДТП · 35 %", 100],
    ["Нарушения и штрафы · 15 %", 100],
    ["Расход топлива · 10 %", 71],
    ["Надёжность выполнения рейсов · 15 %", 100]
  ];
  bars.forEach(function (b) {
    var row = frame("Bar", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
    row.__stretch = true;
    add(row, tbox(b[0], 300, { size: 11, color: HEX.gray }));
    var track = frame("Track", { w: 320, h: 8, radius: 4, bg: "E7EDE6" });
    track.appendChild(rect(320 * b[1] / 100, 8, HEX.dark, 4));
    add(row, track);
    add(row, tbox(String(b[1]), 30, { size: 11, font: F.semi, align: "RIGHT" }));
    add(why, row);
  });
  add(why, divider(true));
  var tot = frame("Total", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
  tot.__stretch = true;
  add(tot, txt("ИТОГОВАЯ ОЦЕНКА", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  add(tot, txt("93 / 100", { size: 22, font: F.bold, color: HEX.dark }));
  add(why, tot);
  add(bottom, why);

  var assign = card("Assign", { gap: 10, w: 330 });
  assign.__stretch = true;
  add(assign, txt("НАЗНАЧЕНИЕ ВОДИТЕЛЯ", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  var ar = frame("Row", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  var av3 = frame("Avatar", { layout: "HORIZONTAL", w: 38, h: 38, radius: 999, primary: "CENTER", cross: "CENTER" });
  av3.fills = [solid(HEX.accent, 0.35)];
  add(av3, txt("ПС", { size: 12, font: F.semi, color: HEX.dark }));
  add(ar, av3);
  var avv = frame("V", { layout: "VERTICAL", gap: 2 });
  add(avv, txt("Смирнов Пётр Васильевич", { size: 12, font: F.semi }));
  add(avv, txt("ГАЗель NEXT · А 321 ВС 77", { size: 10, color: HEX.gray }));
  add(ar, avv);
  add(assign, ar);
  add(assign, divider(true));
  [
    ["Себестоимость", "30 131 ₽"], ["Прибыль", "56 369 ₽"], ["Рентабельность", "65,2 %"], ["Риск", "8 / 100"]
  ].forEach(function (kv) {
    var row = frame("KV", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN" });
    row.__stretch = true;
    add(row, txt(kv[0], { size: 12, color: HEX.gray }));
    add(row, txt(kv[1], { size: 12, font: F.med }));
    add(assign, row);
  });
  add(assign, btn("Назначить водителя", "primary", { stretch: true }));
  add(assign, btn("Открыть карточку водителя", "secondary", { stretch: true }));
  add(assign, txt("После назначения водитель и автомобиль недоступны для других заказов (ТЗ 5.9). Решение принимает диспетчер.", { size: 10, color: HEX.gray, wrap: true, stretch: true, lh: 140 }));
  add(bottom, assign);
}

// --- Экран 08. AI Logistics Copilot ----------------------------------------------

function buildCopilot() {
  var s = screenRoot("08 · AI Logistics Copilot", 1560, 4900);
  add(s, topbar());
  var content = frame("Content", { layout: "HORIZONTAL", gap: 20, padX: 32, padY: 26 });
  content.__stretch = true; content.__grow = true;
  add(s, content);

  // Чат
  var chat = card("Chat", { gap: 0, padX: 0, padY: 0 });
  chat.__grow = true; chat.__stretch = true;
  add(content, chat);
  var ch = frame("ChatHead", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", padX: 20, padY: 14 });
  ch.__stretch = true;
  var chl = frame("HL", { layout: "VERTICAL", gap: 2 });
  add(chl, txt("AI Logistics Copilot", { size: 16, font: F.semi }));
  add(chl, txt("Объясняет расчёты на основе данных заказа №15 · заглушка LLM", { size: 11, color: HEX.gray }));
  add(ch, chl);
  add(ch, btn("Очистить историю", "ghost", { padY: 7, size: 12 }));
  add(chat, ch);
  add(chat, divider(true));

  var msgs = frame("Messages", { layout: "VERTICAL", gap: 14, padX: 20, padY: 18, bg: HEX.bg });
  msgs.__grow = true; msgs.__stretch = true;
  add(chat, msgs);
  function bubble(text, isUser, extra) {
    var rowF = frame("MsgRow", { layout: "HORIZONTAL", primary: isUser ? "MAX" : "MIN" });
    rowF.__stretch = true;
    var b = frame("Bubble", { layout: "VERTICAL", gap: 8, padX: 14, padY: 11, radius: 12 });
    b.fills = [solid(isUser ? HEX.dark : HEX.white)];
    if (!isUser) { b.strokes = [solid(HEX.border)]; b.strokeWeight = 1; }
    add(b, tbox(text, isUser ? 420 : 560, { size: 13, color: isUser ? HEX.white : HEX.ink, lh: 152, cross: "MIN" }));
    if (extra) add(b, extra);
    add(rowF, b);
    return rowF;
  }
  add(msgs, bubble("Здравствуйте! Я — AI Logistics Copilot. Могу объяснить расчёт заказа №15, сравнить водителей и оценить риски перевозки. Данные беру из системы; если данных недостаточно — скажу прямо.", false));
  add(msgs, bubble("Кого лучше отправить на перевозку хрупкого груза по заказу №15?", true));
  var rec = frame("Rec", { layout: "VERTICAL", gap: 6 });
  add(rec, badge("Рекомендация: Смирнов П. В.", HEX.dark, { padX: 10, padY: 5 }));
  add(rec, txt("Причина: минимальный эксплуатационный риск — 8/100", { size: 11, color: HEX.gray }));
  add(msgs, bubble("По заказу №15 «Перевозка стеклопакетов» (хрупкий груз, 2 400 кг) рекомендую Смирнова П. В. Кандидат Ерёмин А. П. дешевле на 4 219 ₽, однако за последние 10 рейсов у него 3 ДТП и штрафы на 8 000 ₽. Для хрупкого груза вес истории ДТП повышен до 35 %, поэтому итоговая оценка: Смирнов — 93, Ерёмин — 61. Окончательное решение за вами.", false, rec));
  add(msgs, bubble("Почему перевозка Ерёминым дешевле?", true));
  var typing = frame("Typing", { layout: "HORIZONTAL", gap: 4, padX: 14, padY: 12, radius: 12, cross: "CENTER" });
  typing.fills = [solid(HEX.white)];
  typing.strokes = [solid(HEX.border)]; typing.strokeWeight = 1;
  add(typing, dot(HEX.gray, 6));
  add(typing, dot(HEX.gray, 6));
  add(typing, dot(HEX.gray, 6));
  var trow = frame("Trow", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  trow.__stretch = true;
  add(trow, typing);
  add(trow, txt("Помощник формирует ответ…", { size: 11, color: HEX.gray }));
  add(msgs, trow);
  add(chat, msgs);

  var chips = frame("Chips", { layout: "HORIZONTAL", gap: 8, padX: 20, padY: 10 });
  chips.fills = [solid(HEX.white)];
  chips.__stretch = true;
  ["Почему эта перевозка дороже?", "Кого на хрупкий груз?", "Почему не самый дешёвый?"].forEach(function (c) {
    var chip = frame("Chip", { layout: "HORIZONTAL", padX: 11, padY: 7, radius: 999, cross: "CENTER" });
    chip.fills = [solid(HEX.white)];
    chip.strokes = [solid(HEX.border)]; chip.strokeWeight = 1;
    add(chip, txt(c, { size: 11, color: HEX.dark }));
    add(chips, chip);
  });
  add(chat, chips);
  add(chat, divider(true));

  var inputRow = frame("InputRow", { layout: "HORIZONTAL", gap: 10, padX: 20, padY: 14, cross: "CENTER" });
  inputRow.fills = [solid(HEX.white)];
  inputRow.__stretch = true;
  var inp = input({ placeholder: "Спросите о расчёте, рисках или водителях…" });
  inp.__stretch = false; inp.__grow = true;
  add(inputRow, inp);
  var send = frame("Send", { layout: "HORIZONTAL", w: 40, h: 40, radius: 10, primary: "CENTER", cross: "CENTER" });
  send.fills = [solid(HEX.dark)];
  add(send, txt("➤", { size: 14, color: HEX.white }));
  add(inputRow, send);
  add(chat, inputRow);
  add(content, chat);

  // Контекст заказа
  var ctx = frame("Context", { layout: "VERTICAL", gap: 12, w: 320 });
  ctx.__stretch = true;
  add(content, ctx);
  var cc = card("ContextCard", { gap: 10 });
  cc.__stretch = true;
  add(cc, txt("КОНТЕКСТ ЗАКАЗА", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  [
    ["Заказ", "№15 · Перевозка стеклопакетов"],
    ["Груз", "Хрупкий · 2 400 кг · 6,2 м³"],
    ["Маршрут", "Москва → Тула · 225 км"],
    ["Выручка", "86 500 ₽"],
    ["Лучший кандидат", "Смирнов П. В. · 93"]
  ].forEach(function (kv) {
    var row = frame("KV", { layout: "VERTICAL", gap: 1 });
    row.__stretch = true;
    add(row, txt(kv[0].toUpperCase(), { size: 9, color: HEX.gray, ls: 3 }));
    add(row, txt(kv[1], { size: 12, font: F.med, wrap: true, stretch: true }));
    add(cc, row);
  });
  add(cc, btn("Показать расчёт", "secondary", { stretch: true }));
  add(ctx, cc);
  var hint = frame("Hint", { layout: "VERTICAL", gap: 8, padX: 20, padY: 18, radius: 12 });
  hint.fills = [solid(HEX.accent, 0.14)];
  hint.__stretch = true;
  add(hint, txt("КАК ЭТО РАБОТАЕТ", { size: 10, font: F.semi, color: HEX.dark, ls: 4 }));
  add(hint, txt("Помощник не считает сам: все цифры готовит backend. LLM-заглушка формирует текст по шаблонам и не выдумывает показатели (ТЗ 6.5, 6.7).", { size: 11, color: HEX.ink, wrap: true, stretch: true, lh: 150 }));
  add(ctx, hint);
}

// --- Экраны 09-10. Модальные формы ------------------------------------------------

function modalScreen(name, x, y, title, rowsBuilder) {
  var s = screenRoot(name, x, y);
  s.primaryAxisAlignItems = "CENTER";
  s.counterAxisAlignItems = "CENTER";
  var dim = rect(SCREEN_W, SCREEN_H, HEX.ink, 0, 0.5);
  s.appendChild(dim);
  dim.layoutPositioning = "ABSOLUTE"; dim.x = 0; dim.y = 0;
  dim.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  var m = card("Modal / " + title, { gap: 16, w: 560, padX: 26, padY: 24, radius: 14 });
  var mh = frame("MHead", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER" });
  mh.__stretch = true;
  add(mh, txt(title, { size: 16, font: F.semi }));
  add(mh, txt("✕", { size: 14, color: HEX.gray }));
  add(m, mh);
  add(m, divider(true));
  rowsBuilder(m);
  var foot = frame("MFoot", { layout: "HORIZONTAL", gap: 10, cross: "CENTER", primary: "MAX" });
  foot.__stretch = true;
  add(foot, txt("Проверка уникальности VIN и госномера — на сервере (ТЗ 4.4)", { size: 10, color: HEX.gray }));
  add(foot, btn("Отмена", "secondary"));
  add(foot, btn("Сохранить", "primary"));
  add(m, foot);
  add(s, m);
  return s;
}

function buildVehicleModal() {
  modalScreen("09 · Добавление автомобиля", 0, 6300, "Добавление автомобиля", function (m) {
    var r1 = frame("R1", { layout: "HORIZONTAL", gap: 14 });
    r1.__stretch = true;
    add(r1, field("Госномер", { required: true, value: "А 111 АА 77" }));
    add(r1, field("Марка", { required: true, value: "ГАЗель", iconRight: "▾" }));
    add(m, r1);
    var r2 = frame("R2", { layout: "HORIZONTAL", gap: 14 });
    r2.__stretch = true;
    add(r2, field("Модель", { required: true, value: "NEXT" }));
    add(r2, field("Год выпуска", { value: "2022" }));
    add(m, r2);
    add(m, field("VIN", { required: true, value: "X9634050", error: "VIN уже существует в системе" }));
    var r4 = frame("R4", { layout: "HORIZONTAL", gap: 14 });
    r4.__stretch = true;
    add(r4, field("Тип топлива", { required: true, value: "Дизель", iconRight: "▾" }));
    add(r4, field("Средний расход, л/100 км", { required: true, value: "18,5" }));
    add(m, r4);
    var r5 = frame("R5", { layout: "HORIZONTAL", gap: 14 });
    r5.__stretch = true;
    add(r5, field("Грузоподъёмность, кг", { required: true, value: "3 500" }));
    add(r5, field("Статус", { value: "Активен", iconRight: "▾" }));
    add(m, r5);
    add(m, field("Закрепить водителя", { value: "— не выбран —", iconRight: "▾" }));
  });
}

function buildDriverModal() {
  modalScreen("10 · Добавление водителя", 1560, 6300, "Добавление водителя", function (m) {
    add(m, field("ФИО", { required: true, value: "Иванов Иван Иванович" }));
    var r2 = frame("R2", { layout: "HORIZONTAL", gap: 14 });
    r2.__stretch = true;
    add(r2, field("Телефон", { required: true, value: "+7 (___) ___-__-__" }));
    add(r2, field("Дата трудоустройства", { value: "01.02.2025", iconRight: "📅" }));
    add(m, r2);
    var r3 = frame("R3", { layout: "HORIZONTAL", gap: 14 });
    r3.__stretch = true;
    add(r3, field("Номер удостоверения", { required: true, value: "7724 118902" }));
    add(r3, field("Категория ВУ", { required: true, value: "C, CE", iconRight: "▾" }));
    add(m, r3);
    var r4 = frame("R4", { layout: "HORIZONTAL", gap: 14 });
    r4.__stretch = true;
    add(r4, field("Стаж работы, лет", { value: "9" }));
    add(r4, field("Статус", { value: "Доступен", iconRight: "▾" }));
    add(m, r4);
    add(m, field("Закрепить автомобиль", { value: "— не выбран —", iconRight: "▾" }));
  });
}

// --- Точка входа -----------------------------------------------------------------

function reportError(name, e) {
  ERRORS.push(name + ": " + (e && e.message ? e.message : String(e)));
  try {
    var f = frame("ОШИБКА · " + name, { layout: "VERTICAL", w: 640, padX: 20, padY: 16, radius: 10, gap: 8, bg: "FDECEA" });
    f.x = 3200; f.y = 200 + ERRORS.length * 160;
    add(f, txt("Ошибка генерации экрана «" + name + "»", { size: 14, font: F.semi, color: "B3261E" }));
    add(f, tbox(e && e.message ? e.message : String(e), 600, { size: 12, color: "B3261E", cross: "MIN" }));
    if (e && e.stack) add(f, tbox(String(e.stack).split("\n").slice(0, 4).join("\n"), 600, { size: 9, color: HEX.gray, cross: "MIN" }));
    PAGE.appendChild(f);
  } catch (e2) { /* ничего */ }
}

function buildStep(name, fn) {
  try { fn(); } catch (e) { reportError(name, e); }
}

async function main() {
  await Promise.all(Object.keys(F).map(function (k) { return figma.loadFontAsync(F[k]); }));

  // Пересоздание страницы макета. Figma запрещает удалять страницу,
  // на которой запущен плагин, поэтому сначала создаём новую страницу
  // и переключаемся на неё, и только затем удаляем старую.
  var oldPage = null;
  figma.root.children.forEach(function (p) {
    if (p.name === PAGE_NAME) oldPage = p;
  });
  var page = figma.createPage();
  figma.currentPage = page;
  if (oldPage) oldPage.remove();
  page.name = PAGE_NAME;
  PAGE = page;

  buildStep("Дизайн-система", buildDesignSystem);
  buildStep("Вход", buildLogin);
  buildStep("Главная", buildHome);
  buildStep("Мониторинг", buildMonitoring);
  buildStep("Список заказов", buildOrders);
  buildStep("Создание заказа", buildOrderForm);
  buildStep("Результаты расчёта", buildResults);
  buildStep("AI Copilot", buildCopilot);
  buildStep("Добавление автомобиля", buildVehicleModal);
  buildStep("Добавление водителя", buildDriverModal);

  figma.viewport.scrollAndZoomIntoView([PAGE]);
  if (ERRORS.length) {
    figma.notify("AutoMind: готово с ошибками (" + ERRORS.length + ") — красные фреймы на странице справа.");
  } else {
    figma.notify("Макет AutoMind сгенерирован: дизайн-система + 9 экранов, без ошибок.");
  }
  figma.closePlugin();
}

main().catch(function (e) {
  figma.notify("Ошибка генерации: " + (e && e.message ? e.message : e));
  figma.closePlugin();
});
