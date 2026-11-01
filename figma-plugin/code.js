// ============================================================================
// AutoMind Mockup Generator — Figma plugin
// Генерирует макет интерфейса AutoMind (ТЗ раздел 2) на страницу
// «AutoMind · Макет»: дизайн-система + 9 экранов приложения.
// Запуск: Figma → Plugins → Development → AutoMind Mockup Generator
// ============================================================================

var PAGE_NAME = "AutoMind · Макет";
var SCREEN_W = 1440;
var SCREEN_H = 1024;

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
  f.resize(o.w || 100, o.h || 100);
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
  if (o.grow) f.layoutGrow = 1;
  if (o.stretch) f.layoutAlign = "STRETCH";
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
  if (o.wrap) t.textAutoResize = "HEIGHT";
  if (o.grow) t.layoutGrow = 1;
  if (o.stretch) t.layoutAlign = "STRETCH";
  if (o.w) { t.textAutoResize = "HEIGHT"; t.resize(o.w, 16); }
  return t;
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
  if (stretch) r.layoutAlign = "STRETCH";
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
  row.appendChild(dot(color, size));
  row.appendChild(txt(label, { size: size ? 10 : 12, color: HEX.ink }));
  return row;
}

function badge(label, color, o) {
  o = o || {};
  var b = frame("Badge", {
    layout: "HORIZONTAL",
    padX: o.padX !== undefined ? o.padX : 9,
    padY: o.padY !== undefined ? o.padY : 3,
    radius: 999,
    bg: color,
    cross: "CENTER"
  });
  b.fills = [solid(color, o.bgOpacity !== undefined ? o.bgOpacity : 0.13)];
  b.appendChild(txt(label, { size: o.size || 11, font: o.font || F.med, color: o.textColor || color }));
  return b;
}

function statusRow(label, color) {
  var b = frame("Badge", { layout: "HORIZONTAL", padX: 9, padY: 3, radius: 999, cross: "CENTER", gap: 6 });
  b.fills = [solid(color, 0.12)];
  b.appendChild(dot(color, 7));
  b.appendChild(txt(label, { size: 11, font: F.med, color: color }));
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
  if (kind === "primary") { f.fills = [solid(HEX.dark)]; f.appendChild(txt(label, { size: o.size || 13, font: F.med, color: HEX.white })); }
  else if (kind === "secondary") { f.fills = [solid(HEX.white)]; f.strokes = [solid(HEX.border)]; f.strokeWeight = 1; f.appendChild(txt(label, { size: o.size || 13, font: F.med, color: HEX.ink })); }
  else if (kind === "danger") { f.fills = [solid(HEX.red)]; f.appendChild(txt(label, { size: o.size || 13, font: F.med, color: HEX.white })); }
  else if (kind === "ghost") { f.appendChild(txt(label, { size: o.size || 13, font: F.med, color: HEX.dark })); }
  else if (kind === "disabled") { f.fills = [solid(HEX.dark, 0.4)]; f.appendChild(txt(label, { size: o.size || 13, font: F.med, color: HEX.white })); }
  if (o.stretch) f.layoutAlign = "STRETCH";
  return f;
}

function iconCircle(emoji, size, bg, emojiSize) {
  var c = frame("Icon", { layout: "HORIZONTAL", w: size, h: size, primary: "CENTER", cross: "CENTER", radius: 999, bg: bg });
  c.fills = [solid(bg, 0.18)];
  c.appendChild(txt(emoji, { size: emojiSize || 22 }));
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
  f.appendChild(txt(o.value || o.placeholder || "", {
    size: 13,
    color: o.value ? HEX.ink : HEX.gray,
    font: o.value ? F.med : F.reg
  }));
  if (o.iconRight) f.appendChild(txt(o.iconRight, { size: 12, color: HEX.gray }));
  if (o.stretch !== false) f.layoutAlign = "STRETCH";
  return f;
}

// Блок «лейбл + поле», опционально с ошибкой под полем
function field(label, o) {
  o = o || {};
  var wrap = frame("Field / " + label, { layout: "VERTICAL", gap: 6, grow: o.grow !== undefined ? o.grow : 1, stretch: true, w: o.w, h: o.h });
  var labelRow = frame("Label", { layout: "HORIZONTAL", gap: 2, cross: "CENTER" });
  labelRow.appendChild(txt(label, { size: 12, font: F.med, color: HEX.ink }));
  if (o.required) labelRow.appendChild(txt("*", { size: 12, font: F.med, color: HEX.red }));
  wrap.appendChild(labelRow);
  if (o.checkbox) {
    var cb = frame("Checkbox", { layout: "HORIZONTAL", gap: 8, cross: "CENTER", padY: 10 });
    var box = frame("Box", { layout: "HORIZONTAL", w: 18, h: 18, radius: 5, bg: HEX.dark, primary: "CENTER", cross: "CENTER" });
    box.appendChild(txt("✓", { size: 11, font: F.bold, color: HEX.white }));
    cb.appendChild(box);
    cb.appendChild(txt(o.checkbox, { size: 13, color: HEX.ink }));
    wrap.appendChild(cb);
  } else {
    wrap.appendChild(input(o));
  }
  if (o.hint) wrap.appendChild(txt(o.hint, { size: 11, color: HEX.gray, wrap: true, stretch: true }));
  if (o.error) wrap.appendChild(txt(o.error, { size: 11, color: HEX.red }));
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
    bg: o.bg || HEX.white,
    shadow: true,
    shadowSoft: true,
    stroke: o.stroke,
    stretch: o.stretch,
    grow: o.grow,
    primary: o.primary,
    cross: o.cross,
    w: o.w, h: o.h
  });
  return c;
}

function sectionTitle(s, sub) {
  var v = frame("SectionTitle", { layout: "VERTICAL", gap: 2 });
  v.appendChild(txt(s, { size: 15, font: F.semi, color: HEX.ink }));
  if (sub) v.appendChild(txt(sub, { size: 11, color: HEX.gray }));
  return v;
}

// Мини-показатель: подпись сверху, значение снизу
function miniStat(label, value, color) {
  var v = frame("Stat", { layout: "VERTICAL", gap: 2, grow: true, bg: HEX.soft, radius: 6, padX: 8, padY: 7, stretch: true });
  v.appendChild(txt(label.toUpperCase(), { size: 9, color: HEX.gray, ls: 4 }));
  v.appendChild(txt(value, { size: 12, font: F.semi, color: color || HEX.ink }));
  return v;
}

// --- Композиты ---------------------------------------------------------------

function logoRow(boxSize, nameSize) {
  var row = frame("Logo", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  var box = frame("LogoBox", { layout: "HORIZONTAL", w: boxSize, h: boxSize, radius: 8, bg: HEX.dark, primary: "CENTER", cross: "CENTER" });
  box.appendChild(txt("A", { size: boxSize * 0.55, font: F.bold, color: HEX.accent }));
  row.appendChild(box);
  row.appendChild(txt("AutoMind", { size: nameSize, font: F.semi, color: HEX.ink }));
  return row;
}

function topbar() {
  var tb = frame("Topbar", {
    layout: "HORIZONTAL", w: SCREEN_W, h: 64, padX: 24,
    primary: "SPACE_BETWEEN", cross: "CENTER", bg: HEX.white, stretch: true
  });
  tb.strokes = [solid(HEX.border)];
  tb.strokeTopWeight = 0; tb.strokeLeftWeight = 0; tb.strokeRightWeight = 0; tb.strokeBottomWeight = 1;
  tb.appendChild(logoRow(28, 18));
  var right = frame("Right", { layout: "HORIZONTAL", gap: 14, cross: "CENTER" });
  var pill = frame("SysStatus", { layout: "HORIZONTAL", gap: 7, padX: 11, padY: 6, radius: 999, bg: HEX.soft, cross: "CENTER" });
  pill.appendChild(dot(HEX.green, 7));
  pill.appendChild(txt("Система работает", { size: 12, color: HEX.gray }));
  right.appendChild(pill);
  var user = frame("User", { layout: "HORIZONTAL", gap: 9, cross: "CENTER" });
  var av = frame("Avatar", { layout: "HORIZONTAL", w: 32, h: 32, radius: 999, primary: "CENTER", cross: "CENTER" });
  av.fills = [solid(HEX.accent, 0.35)];
  av.appendChild(txt("ДИ", { size: 11, font: F.semi, color: HEX.dark }));
  user.appendChild(av);
  user.appendChild(txt("Диспетчер · Иванова А.", { size: 13, font: F.med, color: HEX.ink }));
  right.appendChild(user);
  right.appendChild(btn("Выход", "ghost", { padY: 8 }));
  tb.appendChild(right);
  return tb;
}

function screenRoot(name, x, y, h) {
  var s = frame(name, { layout: "VERTICAL", w: SCREEN_W, h: h || SCREEN_H, bg: HEX.bg, clip: true });
  s.x = x; s.y = y;
  PAGE.appendChild(s);
  return s;
}

function kpiCard(title, value, hint, valueColor) {
  var c = card("KPI / " + title, { gap: 5, padX: 18, padY: 16, grow: true, stretch: true });
  c.appendChild(txt(title, { size: 11, color: HEX.gray }));
  c.appendChild(txt(value, { size: 22, font: F.bold, color: valueColor || HEX.ink }));
  c.appendChild(txt(hint, { size: 10, color: HEX.gray }));
  return c;
}

// Ячейка таблицы фиксированной ширины
function cell(v, w, o) {
  o = o || {};
  var t = txt(v, {
    size: o.size || 12,
    font: o.font || F.reg,
    color: o.color || HEX.ink,
    align: o.align
  });
  t.textAutoResize = "HEIGHT";
  t.resize(w, 16);
  return t;
}

// Таблица: cols = [{title, w, align}], rows = [[cellNode | {badge:{...}} | {driver:{...}}, ...]]
function table(name, cols, rows, rowH) {
  var wrap = frame(name, { layout: "VERTICAL", gap: 0, stretch: true });
  var head = frame("Head", { layout: "HORIZONTAL", h: 38, padX: 16, cross: "CENTER", gap: 0, bg: HEX.soft, radius: 8 });
  cols.forEach(function (c) {
    var t = txt(c.title.toUpperCase(), { size: 10, font: F.semi, color: HEX.gray, ls: 3 });
    t.textAutoResize = "HEIGHT";
    t.resize(c.w, 14);
    if (c.align) t.textAlignHorizontal = c.align;
    head.appendChild(t);
  });
  wrap.appendChild(head);
  rows.forEach(function (row, i) {
    var r = frame("Row " + (i + 1), {
      layout: "HORIZONTAL", h: rowH || 48, padX: 16, cross: "CENTER", gap: 0,
      bg: row.__bg || HEX.white, radius: row.__bg ? 8 : 0
    });
    r.strokes = [solid(HEX.border, 0.6)];
    r.strokeTopWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 1;
    row.forEach(function (cellDef, ci) {
      var colW = cols[ci] ? cols[ci].w : 100;
      if (cellDef && cellDef.driver) {
        var d = frame("DriverCell", { layout: "VERTICAL", gap: 3, w: cellDef.w || colW });
        d.appendChild(txt(cellDef.driver.name, { size: 12, font: F.med, color: cellDef.color || HEX.ink }));
        if (cellDef.driver.badge) d.appendChild(badge(cellDef.driver.badge, cellDef.driver.badgeColor, { size: 10, padX: 7, padY: 2 }));
        r.appendChild(d);
      } else if (cellDef && cellDef.badge) {
        r.appendChild(statusRow(cellDef.badge, cellDef.badgeColor));
      } else if (cellDef && cellDef.stack) {
        var st = frame("Stack", { layout: "VERTICAL", gap: 2, w: cellDef.w || colW });
        cellDef.stack.forEach(function (s) { st.appendChild(s); });
        r.appendChild(st);
      } else if (cellDef) {
        r.appendChild(cell(cellDef.v || cellDef, cellDef.w || colW, cellDef.o));
      }
    });
    wrap.appendChild(r);
  });
  return wrap;
}

// --- Экран 01. Дизайн-система -------------------------------------------------

function buildDesignSystem() {
  var s = frame("01 · Дизайн-система", { layout: "VERTICAL", w: 1160, gap: 30, padX: 44, padY: 40, bg: HEX.white });
  s.x = 0; s.y = 0;
  PAGE.appendChild(s);

  var head = frame("Head", { layout: "VERTICAL", gap: 6 });
  head.appendChild(logoRow(32, 22));
  head.appendChild(txt("Дизайн-система · ТЗ раздел 2: палитра, состояния объектов, элементы интерфейса", { size: 13, color: HEX.gray }));
  s.appendChild(head);

  // Палитра
  var pal = frame("Palette", { layout: "VERTICAL", gap: 12 });
  pal.appendChild(txt("ПАЛИТРА (ТЗ 2.2)", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
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
    sw.appendChild(r);
    sw.appendChild(txt(p[0], { size: 11, font: F.med, color: HEX.ink }));
    sw.appendChild(txt("#" + p[1], { size: 10, color: HEX.gray }));
    sw.appendChild(txt(p[2], { size: 9, color: HEX.gray, wrap: true, w: 120 }));
    swatches.appendChild(sw);
  });
  pal.appendChild(swatches);
  s.appendChild(pal);

  // Состояния
  var states = frame("States", { layout: "VERTICAL", gap: 12 });
  states.appendChild(txt("СОСТОЯНИЯ ОБЪЕКТОВ (ТЗ 2.3)", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var row = frame("Row", { layout: "HORIZONTAL", gap: 22, cross: "CENTER" });
  [["Штатная работа", HEX.green], ["Предупреждение", HEX.yellow], ["Требует внимания", HEX.warn], ["Критическая ситуация", HEX.red], ["Неактивен", HEX.gray]].forEach(function (p) {
    row.appendChild(dotLabel(p[0], p[1]));
  });
  states.appendChild(row);
  s.appendChild(states);

  // Типографика
  var typo = frame("Typography", { layout: "VERTICAL", gap: 10 });
  typo.appendChild(txt("ТИПОГРАФИКА · INTER", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  typo.appendChild(txt("Заголовок страницы — 24 Semi Bold", { size: 24, font: F.semi }));
  typo.appendChild(txt("Заголовок карточки — 16 Semi Bold", { size: 16, font: F.semi }));
  typo.appendChild(txt("Основной текст — 13 Regular. Показания телеметрии и таблицы — 12.", { size: 13 }));
  typo.appendChild(txt("Подпись и второстепенное — 11 Gray", { size: 11, color: HEX.gray }));
  s.appendChild(typo);

  // Кнопки
  var btns = frame("Buttons", { layout: "VERTICAL", gap: 12 });
  btns.appendChild(txt("КНОПКИ", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var brow = frame("Row", { layout: "HORIZONTAL", gap: 12, cross: "CENTER" });
  brow.appendChild(btn("Рассчитать", "primary"));
  brow.appendChild(btn("Отмена", "secondary"));
  brow.appendChild(btn("Подробнее →", "ghost"));
  brow.appendChild(btn("Удалить", "danger"));
  brow.appendChild(btn("Недоступна", "disabled"));
  btns.appendChild(brow);
  s.appendChild(btns);

  // Поля
  var fields = frame("Fields", { layout: "VERTICAL", gap: 12 });
  fields.appendChild(txt("ПОЛЯ ВВОДА", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var frow = frame("Row", { layout: "HORIZONTAL", gap: 16 });
  var f1 = frame("F1", { layout: "VERTICAL", gap: 6, w: 250 });
  f1.appendChild(txt("Обычное поле", { size: 12, font: F.med }));
  f1.appendChild(input({ placeholder: "Введите значение" }));
  var f2 = frame("F2", { layout: "VERTICAL", gap: 6, w: 250 });
  f2.appendChild(txt("Активное поле", { size: 12, font: F.med }));
  var inp2 = input({ value: "86 500" });
  inp2.strokes = [solid(HEX.dark)]; inp2.strokeWeight = 1.5;
  f2.appendChild(inp2);
  var f3 = field("Поле с ошибкой", { placeholder: "", error: "Укажите стоимость перевозки", w: 250 });
  fields.appendChild(frow);
  frow.appendChild(f1); frow.appendChild(f2); frow.appendChild(f3);
  s.appendChild(fields);

  // Бейджи
  var bdgs = frame("Badges", { layout: "VERTICAL", gap: 12 });
  bdgs.appendChild(txt("СТАТУСЫ ЗАКАЗОВ", { size: 11, font: F.semi, color: HEX.gray, ls: 5 }));
  var b2 = frame("Row", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  [["Новый", HEX.gray], ["Расчёт выполнен", HEX.dark], ["Водитель назначен", HEX.green], ["В рейсе", HEX.warn], ["Завершён", HEX.gray], ["Не оплачен", HEX.red]].forEach(function (p) {
    b2.appendChild(statusRow(p[0], p[1]));
  });
  bdgs.appendChild(b2);
  s.appendChild(bdgs);
}

// --- Экран 02. Вход -----------------------------------------------------------

function buildLogin() {
  var s = screenRoot("02 · Вход", 1360, 0);
  s.primaryAxisAlignItems = "CENTER";
  s.counterAxisAlignItems = "CENTER";
  var c = card("LoginCard", { layout: "VERTICAL", w: 420, gap: 16, padX: 36, padY: 34, radius: 16, primary: "CENTER" });
  c.appendChild(logoRow(36, 22));
  var t = frame("T", { layout: "VERTICAL", gap: 6, cross: "CENTER", stretch: true });
  t.appendChild(txt("Вход в систему", { size: 17, font: F.semi }));
  t.appendChild(txt("Введите код доступа, выданный администратором", { size: 12, color: HEX.gray, align: "CENTER", wrap: true, stretch: true }));
  c.appendChild(t);
  c.appendChild(field("Код доступа", { required: true, placeholder: "••••••••••" }));
  c.appendChild(btn("Войти", "primary", { stretch: true, padY: 12 }));
  c.appendChild(divider(true));
  c.appendChild(txt("Код проверяется на сервере и хранится в БД в виде хеша.\nКоличество попыток ограничено.", { size: 11, color: HEX.gray, align: "CENTER", wrap: true, stretch: true, lh: 150 }));
  var demo = frame("Demo", { layout: "HORIZONTAL", padX: 10, padY: 5, radius: 6, bg: HEX.soft, cross: "CENTER", gap: 6 });
  demo.appendChild(txt("Демо-код: DEMO-2026", { size: 11, font: F.med, color: HEX.gray }));
  c.appendChild(demo);
  s.appendChild(c);
  var foot = txt("AutoMind © 2026 · Демонстрационный MVP", { size: 11, color: HEX.gray });
  foot.y = SCREEN_H - 48; foot.x = (SCREEN_W - 280) / 2;
  s.appendChild(foot);
  foot.layoutPositioning = "ABSOLUTE";
}

// --- Экран 03. Главная --------------------------------------------------------

function buildHome() {
  var s = screenRoot("03 · Главная", 0, 1200);
  s.appendChild(topbar());
  var content = frame("Content", { layout: "VERTICAL", gap: 24, padX: 44, padY: 32, stretch: true, grow: true });
  s.appendChild(content);

  var head = frame("Head", { layout: "VERTICAL", gap: 4 });
  head.appendChild(txt("Главная", { size: 24, font: F.semi }));
  head.appendChild(txt("Добрый день, Анна! Что делаем сегодня?", { size: 13, color: HEX.gray }));
  content.appendChild(head);

  // Три функциональных блока (ТЗ 2.5)
  var row = frame("Blocks", { layout: "HORIZONTAL", gap: 20, stretch: true });
  [
    ["🚚", "Мониторинг транспорта", "Карта автопарка, перемещение автомобилей по маршрутам, телеметрия, водители, история рейсов, ДТП и штрафы."],
    ["📊", "Экономика перевозок", "Создание заказа, расчёт себестоимости, сравнение водителей по экономике и рискам, назначение ответственного."],
    ["🤖", "AI Logistics Copilot", "Объяснение расчётов, анализ истории водителей и рекомендации по выбору — простым языком."]
  ].forEach(function (b) {
    var c = card("Block / " + b[1], { layout: "VERTICAL", gap: 14, padX: 26, padY: 26, grow: true, stretch: true });
    c.appendChild(iconCircle(b[0], 56, HEX.accent, 26));
    c.appendChild(txt(b[1], { size: 19, font: F.semi }));
    c.appendChild(txt(b[2], { size: 13, color: HEX.gray, wrap: true, stretch: true, lh: 155 }));
    var link = frame("Link", { layout: "HORIZONTAL", grow: true, primary: "MAX", cross: "MAX" });
    link.layoutMode = "HORIZONTAL";
    link.appendChild(txt("Перейти →", { size: 13, font: F.med, color: HEX.dark }));
    c.appendChild(link);
    row.appendChild(c);
  });
  content.appendChild(row);

  // KPI
  var kpis = frame("KPI", { layout: "HORIZONTAL", gap: 20, stretch: true });
  kpis.appendChild(kpiCard("Автомобилей", "6", "2 требуют внимания"));
  kpis.appendChild(kpiCard("Водителей", "6", "4 доступны для назначения"));
  kpis.appendChild(kpiCard("Заказов в работе", "3", "1 новый, не рассчитан", HEX.warn));
  kpis.appendChild(kpiCard("Средняя рентабельность", "27,1 %", "за последние 30 рейсов", HEX.dark));
  content.appendChild(kpis);

  var note = frame("Note", { layout: "HORIZONTAL", gap: 8, cross: "CENTER", padX: 16, padY: 12, radius: 10, bg: HEX.white, stretch: true });
  note.fills = [solid(HEX.white)];
  note.strokes = [solid(HEX.border)]; note.strokeWeight = 1;
  note.appendChild(txt("ℹ", { size: 13, color: HEX.dark }));
  note.appendChild(txt("Телеметрия обновляется автоматически (WebSocket). Окончательное решение по заказу всегда принимает диспетчер.", { size: 12, color: HEX.gray, wrap: true, stretch: true }));
  content.appendChild(note);
}

// --- Экран 04. Мониторинг ------------------------------------------------------

function buildMonitoring() {
  var s = screenRoot("04 · Мониторинг транспорта", 0, 2400);
  s.appendChild(topbar());

  var content = frame("Content", { layout: "HORIZONTAL", stretch: true, grow: true });

  // --- Левая боковая панель (ТЗ 4.3) ---
  var side = frame("Sidebar", { layout: "VERTICAL", w: 280, gap: 14, padX: 16, padY: 16, bg: HEX.white, stretch: true });
  side.strokes = [solid(HEX.border)];
  side.strokeTopWeight = 0; side.strokeBottomWeight = 0; side.strokeRightWeight = 0; side.strokeLeftWeight = 1;

  var seg = frame("Segments", { layout: "HORIZONTAL", padX: 4, padY: 4, radius: 9, bg: HEX.soft, stretch: true });
  [["Автомобили", true], ["Водители", false], ["Экономика", false]].forEach(function (t) {
    var item = frame("Seg / " + t[0], { layout: "HORIZONTAL", padX: 8, padY: 7, radius: 6, primary: "CENTER", grow: true });
    if (t[1]) { item.fills = [solid(HEX.white)]; item.effects = SHADOW_SOFT; }
    item.appendChild(txt(t[0], { size: 11, font: t[1] ? F.semi : F.reg, color: t[1] ? HEX.ink : HEX.gray, align: "CENTER" }));
    seg.appendChild(item);
  });
  side.appendChild(seg);

  side.appendChild(input({ placeholder: "🔍  Поиск по госномеру…", fillBg: HEX.soft, h: 36 }));

  var list = frame("VehicleList", { layout: "VERTICAL", gap: 4, stretch: true });
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
      primary: "SPACE_BETWEEN", stretch: true
    });
    if (v[4]) { item.fills = [solid(HEX.softGreen)]; item.strokes = [solid(HEX.accent)]; item.strokeWeight = 1; }
    var l = frame("L", { layout: "VERTICAL", gap: 2 });
    l.appendChild(txt(v[0], { size: 13, font: F.med }));
    l.appendChild(txt(v[1], { size: 10, color: HEX.gray }));
    item.appendChild(l);
    item.appendChild(dot(v[3], 8));
    list.appendChild(item);
  });
  side.appendChild(list);

  var sideBtns = frame("SideBtns", { layout: "VERTICAL", gap: 8, stretch: true });
  var addRow = frame("AddRow", { layout: "HORIZONTAL", gap: 8, stretch: true });
  var bA = btn("+ Автомобиль", "secondary", { padX: 12, padY: 9, size: 12 }); bA.layoutGrow = 1;
  var bD = btn("+ Водитель", "secondary", { padX: 12, padY: 9, size: 12 }); bD.layoutGrow = 1;
  addRow.appendChild(bA); addRow.appendChild(bD);
  sideBtns.appendChild(addRow);
  sideBtns.appendChild(btn("⚙  Экономические параметры", "ghost", { padY: 8 }));
  side.appendChild(sideBtns);
  content.appendChild(side);

  // --- Центр: карта (ТЗ 4.6) ---
  var center = frame("Center", { layout: "VERTICAL", gap: 10, padX: 16, padY: 16, grow: true, stretch: true });
  var head = frame("Head", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
  head.appendChild(txt("Мониторинг транспорта", { size: 19, font: F.semi }));
  head.appendChild(txt("Обновлено 2 сек назад · канал WebSocket", { size: 11, color: HEX.gray }));
  center.appendChild(head);

  var map = frame("Map", { w: 800, h: 830, bg: HEX.mapBg, radius: 12, clip: true, shadow: true, shadowSoft: true });
  center.appendChild(map);

  // кварталы и парки
  [[60, 60, 150, 110], [260, 90, 120, 90], [620, 80, 130, 150], [90, 600, 170, 130], [520, 640, 150, 120], [400, 300, 90, 70], [250, 640, 90, 110]]
    .forEach(function (b) { var r = rect(b[0], b[1], b[2], b[3], HEX.mapBlock, 4); map.appendChild(r); });
  [[660, 620, 120, 170], [40, 300, 110, 130]].forEach(function (b) { map.appendChild(rect(b[0], b[1], b[2], b[3], HEX.mapPark, 8)); });
  // дороги
  map.appendChild(rect(0, 226, 800, 12, HEX.white));
  map.appendChild(rect(0, 560, 800, 14, HEX.white));
  map.appendChild(rect(218, 0, 12, 830, HEX.white));
  map.appendChild(rect(556, 0, 10, 830, HEX.white));

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
    var m = frame("Marker " + n, { layout: "HORIZONTAL", w: selected ? 32 : 26, h: selected ? 32 : 26, radius: 999, bg: color, primary: "CENTER", cross: "CENTER" });
    m.x = x; m.y = y;
    m.fills = [solid(color)];
    if (selected) { m.strokes = [solid(HEX.white)]; m.strokeWeight = 3; m.effects = SHADOW; }
    m.appendChild(txt(n, { size: selected ? 13 : 11, font: F.bold, color: HEX.white }));
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
  var pop = card("Popup", { layout: "VERTICAL", w: 196, gap: 5, padX: 12, padY: 10, radius: 10 });
  pop.x = 420; pop.y = 210;
  map.appendChild(pop);
  var pr = frame("PR", { layout: "HORIZONTAL", gap: 7, cross: "CENTER" });
  pr.appendChild(txt("Е 789 КХ 77", { size: 12, font: F.semi }));
  pr.appendChild(dot(HEX.yellow, 7));
  pop.appendChild(pr);
  pop.appendChild(txt("Iveco Daily · дизель · Ерёмин А. П.", { size: 10, color: HEX.gray, wrap: true, w: 172 }));
  pop.appendChild(txt("74 км/ч · топливо 21 %", { size: 10, color: HEX.ink }));
  pop.appendChild(txt("Двигатель 94 °C — выше нормы", { size: 10, font: F.med, color: HEX.warn }));

  // зум
  var zoom = frame("Zoom", { layout: "VERTICAL", w: 30, radius: 8, bg: HEX.white, shadow: true });
  zoom.x = 756; zoom.y = 24;
  var zp = frame("Z+", { layout: "HORIZONTAL", w: 30, h: 30, primary: "CENTER", cross: "CENTER" });
  zp.appendChild(txt("+", { size: 15, font: F.med, color: HEX.gray }));
  var zm = frame("Z−", { layout: "HORIZONTAL", w: 30, h: 30, primary: "CENTER", cross: "CENTER" });
  zm.appendChild(txt("−", { size: 15, font: F.med, color: HEX.gray }));
  zoom.appendChild(zp);
  zoom.appendChild(frame("Div", { w: 30, h: 1, bg: HEX.border }));
  zoom.appendChild(zm);
  map.appendChild(zoom);

  // легенда состояний
  var legend = frame("Legend", { layout: "HORIZONTAL", gap: 12, padX: 12, padY: 8, radius: 8, bg: HEX.white, cross: "CENTER", opacity: 0.94 });
  legend.x = 16; legend.y = 778;
  [["Штат", HEX.green], ["Предупреждение", HEX.yellow], ["Внимание", HEX.warn], ["Критично", HEX.red], ["Неактивен", HEX.gray]].forEach(function (l) {
    legend.appendChild(dotLabel(l[0], l[1], 7));
  });
  map.appendChild(legend);
  var attr = txt("© OpenStreetMap contributors", { size: 9, color: HEX.gray, opacity: 0.8 });
  attr.x = 620; attr.y = 806;
  map.appendChild(attr);

  content.appendChild(center);

  // --- Правая панель (ТЗ 4.8): выбран Ерёмин А. П. ---
  var right = frame("InfoPanel", { layout: "VERTICAL", w: 320, gap: 10, padX: 14, padY: 14, stretch: true, bg: HEX.bg, clip: true });
  right.strokes = [solid(HEX.border)];
  right.strokeTopWeight = 0; right.strokeBottomWeight = 0; right.strokeLeftWeight = 0; right.strokeRightWeight = 1;

  // Блок 1: водитель
  var d1 = card("Driver", { layout: "VERTICAL", gap: 10, padX: 14, padY: 13 });
  var dr1 = frame("Row", { layout: "HORIZONTAL", gap: 10, cross: "CENTER", stretch: true });
  var av2 = frame("Avatar", { layout: "HORIZONTAL", w: 42, h: 42, radius: 999, primary: "CENTER", cross: "CENTER" });
  av2.fills = [solid(HEX.accent, 0.35)];
  av2.appendChild(txt("АЕ", { size: 13, font: F.semi, color: HEX.dark }));
  dr1.appendChild(av2);
  var dv = frame("V", { layout: "VERTICAL", gap: 2, grow: true });
  dv.appendChild(txt("Ерёмин Антон Павлович", { size: 13, font: F.semi, wrap: true, w: 200 }));
  dv.appendChild(txt("Стаж 5 лет · кат. C, CE", { size: 11, color: HEX.gray }));
  dr1.appendChild(dv);
  dr1.appendChild(statusRow("В рейсе", HEX.green));
  d1.appendChild(dr1);
  d1.appendChild(txt("+7 (903) 118-42-76 · принят 12.03.2021", { size: 11, color: HEX.gray }));
  var stats = frame("Stats", { layout: "HORIZONTAL", gap: 6, stretch: true });
  stats.appendChild(miniStat("Рейсы", "61"));
  stats.appendChild(miniStat("ДТП", "3", HEX.red));
  stats.appendChild(miniStat("Наруш.", "2", HEX.warn));
  stats.appendChild(miniStat("Штрафы", "8 000 ₽", HEX.warn));
  d1.appendChild(stats);
  right.appendChild(d1);

  // Блок 2: автомобиль
  var d2 = card("Vehicle", { layout: "VERTICAL", gap: 6, padX: 14, padY: 13 });
  d2.appendChild(txt("АВТОМОБИЛЬ", { size: 9, font: F.semi, color: HEX.gray, ls: 4 }));
  var vRow = frame("Row", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
  var vl = frame("V", { layout: "VERTICAL", gap: 2 });
  vl.appendChild(txt("Iveco Daily", { size: 13, font: F.semi }));
  vl.appendChild(txt("Е 789 КХ 77 · 2018 г. · дизель", { size: 11, color: HEX.gray }));
  vRow.appendChild(vl);
  vRow.appendChild(statusRow("Предупреждение", HEX.yellow));
  d2.appendChild(vRow);
  var stats2 = frame("Stats", { layout: "HORIZONTAL", gap: 6, stretch: true });
  stats2.appendChild(miniStat("Пробег", "241 530 км"));
  stats2.appendChild(miniStat("Топливо", "21 %", HEX.warn));
  stats2.appendChild(miniStat("Норма", "15,5 л/100"));
  d2.appendChild(stats2);
  right.appendChild(d2);

  // Блок 3: телеметрия
  var d3 = card("Telemetry", { layout: "VERTICAL", gap: 8, padX: 14, padY: 13 });
  d3.appendChild(txt("ТЕЛЕМЕТРИЯ · ОБНОВЛЕНО 2 СЕК НАЗАД", { size: 9, font: F.semi, color: HEX.gray, ls: 3 }));
  var g1 = frame("G1", { layout: "HORIZONTAL", gap: 6, stretch: true });
  g1.appendChild(miniStat("Скорость", "74 км/ч"));
  g1.appendChild(miniStat("Обороты", "2 100"));
  g1.appendChild(miniStat("Т двиг.", "94 °C", HEX.warn));
  d3.appendChild(g1);
  var g2 = frame("G2", { layout: "HORIZONTAL", gap: 6, stretch: true });
  g2.appendChild(miniStat("Т охл. жидк.", "92 °C", HEX.warn));
  g2.appendChild(miniStat("Расход", "16,8 л/100"));
  g2.appendChild(miniStat("Масло", "3,2 бар"));
  d3.appendChild(g2);
  var g3 = frame("G3", { layout: "HORIZONTAL", gap: 6, stretch: true });
  g3.appendChild(miniStat("Аккумулятор", "12,4 В"));
  g3.appendChild(miniStat("Зажигание", "Вкл"));
  g3.appendChild(miniStat("Движение", "Да"));
  d3.appendChild(g3);
  var warnChip = frame("Warn", { layout: "HORIZONTAL", gap: 7, padX: 10, padY: 7, radius: 8, cross: "CENTER" });
  warnChip.fills = [solid(HEX.warn, 0.12)];
  warnChip.appendChild(txt("⚠", { size: 11, color: HEX.warn }));
  warnChip.appendChild(txt("Перегрев двигателя — требуется внимание диспетчера", { size: 10, font: F.med, color: HEX.warn, wrap: true, stretch: true }));
  d3.appendChild(warnChip);
  right.appendChild(d3);

  // Блок 4: последние поездки
  var d4 = card("Trips", { layout: "VERTICAL", gap: 8, padX: 14, padY: 13 });
  d4.appendChild(txt("ПОСЛЕДНИЕ ПОЕЗДКИ (ИЗ 5)", { size: 9, font: F.semi, color: HEX.gray, ls: 3 }));
  [
    ["28.10 · Москва → Тула", "185 км · 6 ч 05 м · 34,0 л", "9 210 ₽", "без ДТП"],
    ["22.10 · Тула → Рязань", "162 км · 5 ч 20 м · 29,5 л", "8 480 ₽", "без ДТП"],
    ["15.10 · Москва → Калуга", "178 км · 5 ч 50 м · 31,2 л", "8 970 ₽", "ДТП на рейсе"]
  ].forEach(function (t, i) {
    var r = frame("Trip", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
    var l = frame("L", { layout: "VERTICAL", gap: 2 });
    l.appendChild(txt(t[0], { size: 12, font: F.med }));
    l.appendChild(txt(t[1], { size: 10, color: HEX.gray }));
    r.appendChild(l);
    var rr = frame("R", { layout: "VERTICAL", gap: 2, primary: "MAX", cross: "MAX" });
    rr.layoutMode = "VERTICAL";
    rr.primaryAxisAlignItems = "MAX";
    rr.counterAxisAlignItems = "MAX";
    rr.appendChild(txt(t[2], { size: 12, font: F.semi }));
    rr.appendChild(txt(t[3], { size: 9, color: i === 2 ? HEX.red : HEX.gray }));
    r.appendChild(rr);
    d4.appendChild(r);
  });
  d4.appendChild(txt("Все 5 поездок →", { size: 11, font: F.med, color: HEX.dark }));
  right.appendChild(d4);

  // Блок 5: ДТП и штрафы
  var d5 = card("Incidents", { layout: "VERTICAL", gap: 8, padX: 14, padY: 13 });
  d5.appendChild(txt("ДТП И ШТРАФЫ", { size: 9, font: F.semi, color: HEX.gray, ls: 4 }));
  [
    ["ДТП · столкновение на перекрёстке", "18.09.2025 · виновен · без штрафа", HEX.red],
    ["Нарушение · превышение +21 км/ч", "03.07.2025 · штраф 1 500 ₽ · оплачен", HEX.warn],
    ["Нарушение · проезд на красный", "14.02.2025 · штраф 1 000 ₽ · оплачен", HEX.warn]
  ].forEach(function (t) {
    var r = frame("Inc", { layout: "HORIZONTAL", gap: 8, cross: "CENTER", stretch: true });
    r.appendChild(dot(t[2], 7));
    var l = frame("L", { layout: "VERTICAL", gap: 1, grow: true });
    l.appendChild(txt(t[0], { size: 11, font: F.med, wrap: true, w: 220 }));
    l.appendChild(txt(t[1], { size: 10, color: HEX.gray }));
    r.appendChild(l);
    d5.appendChild(r);
  });
  right.appendChild(d5);

  content.appendChild(right);
  s.appendChild(content);
}

// --- Экран 05. Список заказов ---------------------------------------------------

function buildOrders() {
  var s = screenRoot("05 · Экономика — список заказов", 0, 3600);
  s.appendChild(topbar());
  var content = frame("Content", { layout: "VERTICAL", gap: 18, padX: 32, padY: 28, stretch: true, grow: true });
  s.appendChild(content);

  var head = frame("Head", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
  var hl = frame("HL", { layout: "VERTICAL", gap: 4 });
  hl.appendChild(txt("Экономика перевозок", { size: 24, font: F.semi }));
  hl.appendChild(txt("Заказы на перевозку и результаты экономического анализа", { size: 13, color: HEX.gray }));
  head.appendChild(hl);
  head.appendChild(btn("+ Создать заказ", "primary"));
  content.appendChild(head);

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
  var cardTable = card("OrdersTable", { padX: 8, padY: 10, gap: 0, stretch: true });
  cardTable.appendChild(table("Orders", cols, rows, 50));
  content.appendChild(cardTable);

  var foot = frame("Foot", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", stretch: true });
  foot.appendChild(txt("Показано 5 из 27 заказов", { size: 12, color: HEX.gray }));
  foot.appendChild(txt("Себестоимость и прибыль — лучшие значения среди кандидатов", { size: 11, color: HEX.gray }));
  content.appendChild(foot);
}

// --- Экран 06. Создание заказа ---------------------------------------------------

function buildOrderForm() {
  var s = screenRoot("06 · Создание заказа", 1560, 3600);
  s.appendChild(topbar());
  var content = frame("Content", { layout: "HORIZONTAL", gap: 22, padX: 32, padY: 28, stretch: true, grow: true });
  s.appendChild(content);

  var left = frame("Left", { layout: "VERTICAL", gap: 16, grow: true, stretch: true });

  var c1 = card("Cargo", { layout: "VERTICAL", gap: 14, stretch: true });
  c1.appendChild(sectionTitle("Основная информация", "ТЗ 5.3.1 · поля со звёздочкой обязательны"));
  c1.appendChild(field("Название заказа", { required: true, value: "Перевозка стеклопакетов" }));
  var r1 = frame("R1", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r1.appendChild(field("Тип груза", { required: true, value: "Хрупкий", iconRight: "▾" }));
  r1.appendChild(field("Описание груза", { value: "Стеклопакеты в деревянных рамах" }));
  c1.appendChild(r1);
  var r2 = frame("R2", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r2.appendChild(field("Масса груза, кг", { required: true, value: "2 400" }));
  r2.appendChild(field("Объём груза, м³", { value: "6,2" }));
  c1.appendChild(r2);
  var r3 = frame("R3", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r3.appendChild(field("Хрупкий груз", { checkbox: "Требует особой осторожности" }));
  r3.appendChild(field("Особые условия перевозки", { value: "Избегать резких торможений" }));
  c1.appendChild(r3);
  left.appendChild(c1);

  var c2 = card("Route", { layout: "VERTICAL", gap: 14, stretch: true });
  c2.appendChild(sectionTitle("Маршрут", "ТЗ 5.3.2 · доп. пробег — порожние перемещения"));
  var r4 = frame("R4", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r4.appendChild(field("Начальный адрес", { required: true, value: "Москва, ул. Складская, 12" }));
  r4.appendChild(field("Конечный адрес", { required: true, value: "Тула, пр. Мира, 44" }));
  c2.appendChild(r4);
  var r5 = frame("R5", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r5.appendChild(field("Расстояние, км", { required: true, value: "185" }));
  r5.appendChild(field("Дополнительный пробег, км", { required: true, value: "40" }));
  r5.appendChild(field("Плановое время, ч", { required: true, value: "6" }));
  c2.appendChild(r5);
  left.appendChild(c2);

  var c3 = card("Economics", { layout: "VERTICAL", gap: 14, stretch: true });
  c3.appendChild(sectionTitle("Экономические данные", "Загружены из настроек компании · можно скорректировать"));
  var r6 = frame("R6", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r6.appendChild(field("Выручка за заказ, ₽", { required: true, placeholder: "—", error: "Укажите стоимость перевозки" }));
  r6.appendChild(field("Стоимость топлива, ₽/л", { required: true, value: "62,50" }));
  c3.appendChild(r6);
  var r7 = frame("R7", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r7.appendChild(field("Оплата труда водителя, ₽/ч", { required: true, value: "320" }));
  r7.appendChild(field("Обслуживание, ₽/км", { required: true, value: "4,20" }));
  c3.appendChild(r7);
  var r8 = frame("R8", { layout: "HORIZONTAL", gap: 14, stretch: true });
  r8.appendChild(field("Доп. расходы, ₽", { required: true, value: "0" }));
  r8.appendChild(field("Платные дороги, ₽", { required: true, value: "1 250" }));
  r8.appendChild(field("Прочие расходы, ₽", { required: true, value: "0" }));
  c3.appendChild(r8);
  c3.appendChild(txt("Пустое поле не считается нулём: если параметр не применяется — укажите 0 явно (ТЗ 5.3.3).", { size: 11, color: HEX.gray, wrap: true, stretch: true }));
  left.appendChild(c3);

  var actions = frame("Actions", { layout: "HORIZONTAL", gap: 12, cross: "CENTER", stretch: true });
  actions.appendChild(btn("Рассчитать себестоимость", "disabled"));
  actions.appendChild(btn("Сохранить черновик", "secondary"));
  actions.appendChild(btn("Отмена", "ghost"));
  var spacerN = frame("Sp", { grow: true, h: 1 });
  actions.appendChild(spacerN);
  actions.appendChild(txt("Расчёт выполняется на сервере", { size: 11, color: HEX.gray }));
  left.appendChild(actions);

  content.appendChild(left);

  // Правая колонка: проверка данных
  var right = frame("Right", { layout: "VERTICAL", gap: 14, w: 330, stretch: true });
  var check = card("Validation", { layout: "VERTICAL", gap: 10, stretch: true });
  check.appendChild(txt("ПРОВЕРКА ДАННЫХ", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  [
    ["✓", "Название заказа заполнено", HEX.green],
    ["✓", "Маршрут задан полностью", HEX.green],
    ["✓", "Экономические параметры заданы", HEX.green],
    ["✕", "Выручка за заказ не указана", HEX.red]
  ].forEach(function (i) {
    var row = frame("Chk", { layout: "HORIZONTAL", gap: 8, cross: "CENTER" });
    row.appendChild(txt(i[0], { size: 12, font: F.bold, color: i[2] }));
    row.appendChild(txt(i[1], { size: 12, color: i[2] === HEX.red ? HEX.red : HEX.ink, wrap: true, stretch: true }));
    check.appendChild(row);
  });
  check.appendChild(divider(true));
  check.appendChild(txt("Расчёт не запускается, пока есть ошибки заполнения (ТЗ 5.4).", { size: 11, color: HEX.gray, wrap: true, stretch: true }));
  right.appendChild(check);

  var summary = card("Summary", { layout: "VERTICAL", gap: 10, stretch: true });
  summary.appendChild(txt("СВОДКА РАСЧЁТА", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  summary.appendChild(txt("Появится после успешного запуска: себестоимость по каждому кандидату, прибыль, рентабельность, риск и итоговая оценка.", { size: 12, color: HEX.gray, wrap: true, stretch: true, lh: 150 }));
  right.appendChild(summary);
  content.appendChild(right);
}

// --- Экран 07. Результаты расчёта ------------------------------------------------

function buildResults() {
  var s = screenRoot("07 · Результаты расчёта", 0, 4900, 1150);
  s.appendChild(topbar());
  var content = frame("Content", { layout: "VERTICAL", gap: 16, padX: 32, padY: 26, stretch: true, grow: true });
  s.appendChild(content);

  content.appendChild(txt("← Назад к списку заказов", { size: 12, color: HEX.gray }));
  var head = frame("Head", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
  var hl = frame("HL", { layout: "VERTICAL", gap: 4 });
  hl.appendChild(txt("Заказ №15 · Перевозка стеклопакетов", { size: 21, font: F.semi }));
  hl.appendChild(txt("Хрупкий груз · 2 400 кг · Москва → Тула · 225 км (185 + 40 порожний) · план 6 ч · выручка 86 500 ₽", { size: 12, color: HEX.gray }));
  head.appendChild(hl);
  head.appendChild(statusRow("Расчёт выполнен", HEX.dark));
  content.appendChild(head);

  var kpis = frame("KPI", { layout: "HORIZONTAL", gap: 16, stretch: true });
  kpis.appendChild(kpiCard("Выручка", "86 500 ₽", "введена диспетчером"));
  kpis.appendChild(kpiCard("Лучшая себестоимость", "30 131 ₽", "Смирнов П. В. · ГАЗель NEXT"));
  kpis.appendChild(kpiCard("Максимальная прибыль", "56 369 ₽", "рентабельность 65,2 %", HEX.dark));
  kpis.appendChild(kpiCard("Лучший кандидат", "Смирнов П. В.", "оценка 93/100 · риск 8/100", HEX.dark));
  content.appendChild(kpis);

  // Сравнительная таблица (ТЗ 5.7/5.9)
  var cols = [
    { title: "Водитель", w: 240 }, { title: "Автомобиль", w: 168 },
    { title: "Топливо", w: 104, align: "RIGHT" }, { title: "Себестоимость", w: 122, align: "RIGHT" },
    { title: "Прибыль", w: 116, align: "RIGHT" }, { title: "Рентаб.", w: 92, align: "RIGHT" },
    { title: "ДТП", w: 52, align: "RIGHT" }, { title: "Штрафы", w: 96, align: "RIGHT" },
    { title: "Риск", w: 68, align: "RIGHT" }, { title: "Оценка", w: 76, align: "RIGHT" },
    { title: "Комментарий", w: 170 }
  ];
  function money(v, o) { return { v: v, w: 0, o: Object.assign({ align: "RIGHT" }, o || {}) }; }
  var rows = [
    { __bg: HEX.softGreen, cells: [
      { driver: { name: "Смирнов П. В.", badge: "★ Лучший", badgeColor: HEX.dark }, w: 240 },
      { stack: [cell("ГАЗель NEXT", 168, { font: F.med }), cell("А 321 ВС 77", 168, { size: 10, color: HEX.gray })] },
      money("26 016 ₽"), money("30 131 ₽", { font: F.med }), money("56 369 ₽", { font: F.med, color: HEX.green }),
      money("65,2 %", { color: HEX.green, font: F.med }), money("0", { color: HEX.green }), money("0 ₽", { color: HEX.green }),
      money("8", { color: HEX.green, font: F.med }), money("93", { color: HEX.dark, font: F.bold }),
      { v: "Минимальный риск для хрупкого груза", w: 170, o: { size: 10, color: HEX.gray } }
    ]},
    { cells: [
      { driver: { name: "Ковалёв Д. С.", badge: "Кандидат", badgeColor: HEX.green }, w: 240 },
      { stack: [cell("MAN TGX", 168, { font: F.med }), cell("В 456 МН 50", 168, { size: 10, color: HEX.gray })] },
      money("37 969 ₽"), money("42 084 ₽"), money("44 416 ₽"),
      money("51,3 %"), money("0"), money("1 500 ₽"), money("12"), money("79", { font: F.semi }),
      { v: "Надёжный, но дороже по топливу", w: 170, o: { size: 10, color: HEX.gray } }
    ]},
    { cells: [
      { driver: { name: "Гулиев Р. Н.", badge: "Кандидат", badgeColor: HEX.green }, w: 240 },
      { stack: [cell("КамАЗ 6520", 168, { font: F.med }), cell("К 112 ОР 77", 168, { size: 10, color: HEX.gray })] },
      money("45 000 ₽"), money("49 115 ₽"), money("37 385 ₽"),
      money("43,2 %"), money("0"), money("1 500 ₽"), money("14"), money("74", { font: F.semi }),
      { v: "Высокий расход топлива", w: 170, o: { size: 10, color: HEX.gray } }
    ]},
    { __bg: "FAFBFA", cells: [
      { driver: { name: "Ерёмин А. П.", badge: "Недоступен · в рейсе", badgeColor: HEX.red }, color: HEX.gray, w: 240 },
      { stack: [cell("Iveco Daily", 168, { color: HEX.gray, font: F.med }), cell("Е 789 КХ 77", 168, { size: 10, color: HEX.gray })], color: HEX.gray },
      money("21 797 ₽", { color: HEX.gray }), money("25 912 ₽", { color: HEX.gray }),
      money("60 588 ₽", { color: HEX.gray }), money("70,0 %", { color: HEX.gray }),
      money("3", { color: HEX.gray }), money("8 000 ₽", { color: HEX.gray }), money("78", { color: HEX.red, font: F.med }),
      money("61", { color: HEX.gray }),
      { v: "Дешевле на 4 219 ₽, но риск выше в 9 раз", w: 170, o: { size: 10, color: HEX.warn } }
    ]},
    { __bg: "FAFBFA", cells: [
      { driver: { name: "Лебедев И. М.", badge: "Авто на обслуживании", badgeColor: HEX.gray }, color: HEX.gray, w: 240 },
      { stack: [cell("Hyundai HD78", 168, { color: HEX.gray, font: F.med }), cell("М 234 УЕ 50", 168, { size: 10, color: HEX.gray })], color: HEX.gray },
      money("—", { color: HEX.gray }), money("—", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }), money("1"), money("0 ₽", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }),
      { v: "Не рассматривается (ТЗ 5.7)", w: 170, o: { size: 10, color: HEX.gray } }
    ]},
    { __bg: "FAFBFA", cells: [
      { driver: { name: "Мамедов Э. Б.", badge: "Нет закреплённого ТС", badgeColor: HEX.gray }, color: HEX.gray, w: 240 },
      { stack: [cell("—", 168, { color: HEX.gray }), cell("решение п.10", 168, { size: 9, color: HEX.gray })], color: HEX.gray },
      money("—", { color: HEX.gray }), money("—", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }), money("0"), money("0 ₽", { color: HEX.gray }), money("—", { color: HEX.gray }),
      money("—", { color: HEX.gray }),
      { v: "История: 7 рейсов, данных мало", w: 170, o: { size: 10, color: HEX.gray } }
    ]}
  ];
  var tRows = rows.map(function (r) { return r.cells.map(function (c) { c.__own = true; return c; }); });
  tRows[0].__bg = HEX.softGreen; tRows[3].__bg = "FAFBFA"; tRows[4].__bg = "FAFBFA"; tRows[5].__bg = "FAFBFA";
  var cardTable = card("Candidates", { padX: 8, padY: 10, gap: 0, stretch: true });
  cardTable.appendChild(txt("СРАВНЕНИЕ КАНДИДАТОВ · ОПЛАТА ТРУДА 1 920 ₽, ОБСЛУЖИВАНИЕ 945 ₽, ПЛАТНЫЕ ДОРОГИ 1 250 ₽ — ОБЩИЕ ДЛЯ ВСЕХ", { size: 9, font: F.semi, color: HEX.gray, ls: 2 }));
  cardTable.appendChild(table("CandidatesTable", cols, tRows, 54));
  content.appendChild(cardTable);

  // Низ: обоснование + назначение
  var bottom = frame("Bottom", { layout: "HORIZONTAL", gap: 16, stretch: true, grow: true });
  var why = card("Why", { layout: "VERTICAL", gap: 12, grow: true, stretch: true });
  why.appendChild(sectionTitle("Обоснование оценки · Смирнов П. В.", "Веса для хрупкого груза: ДТП повышены до 35 % (решение п.5)"));
  var bars = [
    ["Экономическая эффективность · 25 %", 84],
    ["История ДТП · 35 %", 100],
    ["Нарушения и штрафы · 15 %", 100],
    ["Расход топлива · 10 %", 71],
    ["Надёжность выполнения рейсов · 15 %", 100]
  ];
  bars.forEach(function (b) {
    var row = frame("Bar", { layout: "HORIZONTAL", gap: 10, cross: "CENTER", stretch: true });
    var l = txt(b[0], { size: 11, color: HEX.gray });
    l.textAutoResize = "HEIGHT"; l.resize(300, 14);
    row.appendChild(l);
    var track = frame("Track", { w: 320, h: 8, radius: 4, bg: "E7EDE6" });
    var fillR = rect(320 * b[1] / 100, 8, HEX.dark, 4);
    track.appendChild(fillR);
    row.appendChild(track);
    row.appendChild(txt(String(b[1]), { size: 11, font: F.semi, w: 30, align: "RIGHT" }));
    why.appendChild(row);
  });
  why.appendChild(divider(true));
  var tot = frame("Total", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
  tot.appendChild(txt("ИТОГОВАЯ ОЦЕНКА", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  tot.appendChild(txt("93 / 100", { size: 22, font: F.bold, color: HEX.dark }));
  why.appendChild(tot);
  bottom.appendChild(why);

  var assign = card("Assign", { layout: "VERTICAL", gap: 10, w: 330, stretch: true });
  assign.appendChild(txt("НАЗНАЧЕНИЕ ВОДИТЕЛЯ", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  var ar = frame("Row", { layout: "HORIZONTAL", gap: 10, cross: "CENTER" });
  var av3 = frame("Avatar", { layout: "HORIZONTAL", w: 38, h: 38, radius: 999, primary: "CENTER", cross: "CENTER" });
  av3.fills = [solid(HEX.accent, 0.35)];
  av3.appendChild(txt("ПС", { size: 12, font: F.semi, color: HEX.dark }));
  ar.appendChild(av3);
  var avv = frame("V", { layout: "VERTICAL", gap: 2 });
  avv.appendChild(txt("Смирнов Пётр Васильевич", { size: 12, font: F.semi }));
  avv.appendChild(txt("ГАЗель NEXT · А 321 ВС 77", { size: 10, color: HEX.gray }));
  ar.appendChild(avv);
  assign.appendChild(ar);
  assign.appendChild(divider(true));
  [
    ["Себестоимость", "30 131 ₽"], ["Прибыль", "56 369 ₽"], ["Рентабельность", "65,2 %"], ["Риск", "8 / 100"]
  ].forEach(function (kv) {
    var row = frame("KV", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", stretch: true });
    row.appendChild(txt(kv[0], { size: 12, color: HEX.gray }));
    row.appendChild(txt(kv[1], { size: 12, font: F.med }));
    assign.appendChild(row);
  });
  assign.appendChild(btn("Назначить водителя", "primary", { stretch: true }));
  assign.appendChild(btn("Открыть карточку водителя", "secondary", { stretch: true }));
  assign.appendChild(txt("После назначения водитель и автомобиль недоступны для других заказов (ТЗ 5.9). Решение принимает диспетчер.", { size: 10, color: HEX.gray, wrap: true, stretch: true, lh: 140 }));
  bottom.appendChild(assign);
  content.appendChild(bottom);
}

// --- Экран 08. AI Logistics Copilot ----------------------------------------------

function buildCopilot() {
  var s = screenRoot("08 · AI Logistics Copilot", 1560, 4900);
  s.appendChild(topbar());
  var content = frame("Content", { layout: "HORIZONTAL", gap: 20, padX: 32, padY: 26, stretch: true, grow: true });
  s.appendChild(content);

  // Чат
  var chat = card("Chat", { layout: "VERTICAL", gap: 0, padX: 0, padY: 0, grow: true, stretch: true });
  var ch = frame("ChatHead", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", padX: 20, padY: 14, stretch: true });
  var chl = frame("HL", { layout: "VERTICAL", gap: 2 });
  chl.appendChild(txt("AI Logistics Copilot", { size: 16, font: F.semi }));
  chl.appendChild(txt("Объясняет расчёты на основе данных заказа №15 · заглушка LLM", { size: 11, color: HEX.gray }));
  ch.appendChild(chl);
  ch.appendChild(btn("Очистить историю", "ghost", { padY: 7, size: 12 }));
  chat.appendChild(ch);
  chat.appendChild(divider(true));

  var msgs = frame("Messages", { layout: "VERTICAL", gap: 14, padX: 20, padY: 18, grow: true, stretch: true, bg: HEX.bg });
  function bubble(text, isUser, extra) {
    var rowF = frame("MsgRow", { layout: "HORIZONTAL", stretch: true, primary: isUser ? "MAX" : "MIN" });
    var b = frame("Bubble", { layout: "VERTICAL", gap: 8, padX: 14, padY: 11, radius: 12, stretch: false });
    b.fills = [solid(isUser ? HEX.dark : HEX.white)];
    if (!isUser) { b.strokes = [solid(HEX.border)]; b.strokeWeight = 1; }
    b.appendChild(txt(text, { size: 13, color: isUser ? HEX.white : HEX.ink, wrap: true, w: isUser ? 420 : 560, lh: 152 }));
    if (extra) b.appendChild(extra);
    rowF.appendChild(b);
    return rowF;
  }
  msgs.appendChild(bubble("Здравствуйте! Я — AI Logistics Copilot. Могу объяснить расчёт заказа №15, сравнить водителей и оценить риски перевозки. Данные беру из системы; если данных недостаточно — скажу прямо.", false));
  msgs.appendChild(bubble("Кого лучше отправить на перевозку хрупкого груза по заказу №15?", true));
  var rec = frame("Rec", { layout: "VERTICAL", gap: 6 });
  rec.appendChild(badge("Рекомендация: Смирнов П. В.", HEX.dark, { padX: 10, padY: 5 }));
  rec.appendChild(txt("Причина: минимальный эксплуатационный риск — 8/100", { size: 11, color: HEX.gray }));
  msgs.appendChild(bubble("По заказу №15 «Перевозка стеклопакетов» (хрупкий груз, 2 400 кг) рекомендую Смирнова П. В. Кандидат Ерёмин А. П. дешевле на 4 219 ₽, однако за последние 10 рейсов у него 3 ДТП и штрафы на 8 000 ₽. Для хрупкого груза вес истории ДТП повышен до 35 %, поэтому итоговая оценка: Смирнов — 93, Ерёмин — 61. Окончательное решение за вами.", false, rec));
  msgs.appendChild(bubble("Почему перевозка Ерёминым дешевле?", true));
  var typing = frame("Typing", { layout: "HORIZONTAL", gap: 4, padX: 14, padY: 12, radius: 12, bg: HEX.white, cross: "CENTER" });
  typing.strokes = [solid(HEX.border)]; typing.strokeWeight = 1;
  typing.appendChild(dot(HEX.gray, 6));
  typing.appendChild(dot(HEX.gray, 6));
  typing.appendChild(dot(HEX.gray, 6));
  var trow = frame("Trow", { layout: "HORIZONTAL", stretch: true, primary: "MIN" });
  trow.appendChild(typing);
  trow.appendChild(txt("Помощник формирует ответ…", { size: 11, color: HEX.gray }));
  msgs.appendChild(trow);
  chat.appendChild(msgs);

  var chips = frame("Chips", { layout: "HORIZONTAL", gap: 8, padX: 20, padY: 10, stretch: true, bg: HEX.white });
  ["Почему эта перевозка дороже?", "Кого на хрупкий груз?", "Почему не самый дешёвый?"].forEach(function (c) {
    var chip = frame("Chip", { layout: "HORIZONTAL", padX: 11, padY: 7, radius: 999, bg: HEX.white, cross: "CENTER" });
    chip.strokes = [solid(HEX.border)]; chip.strokeWeight = 1;
    chip.appendChild(txt(c, { size: 11, color: HEX.dark }));
    chips.appendChild(chip);
  });
  chat.appendChild(divider(true));

  var inputRow = frame("InputRow", { layout: "HORIZONTAL", gap: 10, padX: 20, padY: 14, cross: "CENTER", stretch: true, bg: HEX.white });
  var inp = input({ placeholder: "Спросите о расчёте, рисках или водителях…" }); inp.layoutGrow = 1;
  inputRow.appendChild(inp);
  var send = frame("Send", { layout: "HORIZONTAL", w: 40, h: 40, radius: 10, bg: HEX.dark, primary: "CENTER", cross: "CENTER" });
  send.appendChild(txt("➤", { size: 14, color: HEX.white }));
  inputRow.appendChild(send);
  chat.appendChild(inputRow);
  content.appendChild(chat);

  // Контекст заказа
  var ctx = frame("Context", { layout: "VERTICAL", gap: 12, w: 320, stretch: true });
  var cc = card("ContextCard", { layout: "VERTICAL", gap: 10, stretch: true });
  cc.appendChild(txt("КОНТЕКСТ ЗАКАЗА", { size: 10, font: F.semi, color: HEX.gray, ls: 4 }));
  [
    ["Заказ", "№15 · Перевозка стеклопакетов"],
    ["Груз", "Хрупкий · 2 400 кг · 6,2 м³"],
    ["Маршрут", "Москва → Тула · 225 км"],
    ["Выручка", "86 500 ₽"],
    ["Лучший кандидат", "Смирнов П. В. · 93"]
  ].forEach(function (kv) {
    var row = frame("KV", { layout: "VERTICAL", gap: 1, stretch: true });
    row.appendChild(txt(kv[0].toUpperCase(), { size: 9, color: HEX.gray, ls: 3 }));
    row.appendChild(txt(kv[1], { size: 12, font: F.med, wrap: true, stretch: true }));
    cc.appendChild(row);
  });
  cc.appendChild(btn("Показать расчёт", "secondary", { stretch: true }));
  ctx.appendChild(cc);
  var hint = card("Hint", { layout: "VERTICAL", gap: 8, stretch: true, bg: HEX.softGreen });
  hint.fills = [solid(HEX.accent, 0.14)];
  hint.appendChild(txt("КАК ЭТО РАБОТАЕТ", { size: 10, font: F.semi, color: HEX.dark, ls: 4 }));
  hint.appendChild(txt("Помощник не считает сам: все цифры готовит backend. LLM-заглушка формирует текст по шаблонам и не выдумывает показатели (ТЗ 6.5, 6.7).", { size: 11, color: HEX.ink, wrap: true, stretch: true, lh: 150 }));
  ctx.appendChild(hint);
  content.appendChild(ctx);
}

// --- Экраны 09-10. Модальные формы ------------------------------------------------

function modalScreen(name, x, y, title, rowsBuilder) {
  var s = screenRoot(name, x, y);
  s.primaryAxisAlignItems = "CENTER";
  s.counterAxisAlignItems = "CENTER";
  // затемнение фона
  var dim = rect(SCREEN_W, SCREEN_H, HEX.ink, 0, 0.5);
  s.appendChild(dim);
  dim.layoutPositioning = "ABSOLUTE"; dim.x = 0; dim.y = 0;
  var m = card("Modal / " + title, { layout: "VERTICAL", gap: 16, w: 560, padX: 26, padY: 24, radius: 14 });
  var mh = frame("MHead", { layout: "HORIZONTAL", primary: "SPACE_BETWEEN", cross: "CENTER", stretch: true });
  mh.appendChild(txt(title, { size: 16, font: F.semi }));
  mh.appendChild(txt("✕", { size: 14, color: HEX.gray }));
  m.appendChild(mh);
  m.appendChild(divider(true));
  rowsBuilder(m);
  var foot = frame("MFoot", { layout: "HORIZONTAL", gap: 10, primary: "MAX", cross: "CENTER", stretch: true });
  foot.layoutMode = "HORIZONTAL";
  foot.primaryAxisAlignItems = "MAX";
  foot.appendChild(txt("Проверка уникальности VIN и госномера — на сервере (ТЗ 4.4)", { size: 10, color: HEX.gray }));
  foot.appendChild(btn("Отмена", "secondary"));
  foot.appendChild(btn("Сохранить", "primary"));
  m.appendChild(foot);
  s.appendChild(m);
  return s;
}

function buildVehicleModal() {
  modalScreen("09 · Добавление автомобиля", 0, 6300, "Добавление автомобиля", function (m) {
    var r1 = frame("R1", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r1.appendChild(field("Госномер", { required: true, value: "А 111 АА 77" }));
    r1.appendChild(field("Марка", { required: true, value: "ГАЗель", iconRight: "▾" }));
    m.appendChild(r1);
    var r2 = frame("R2", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r2.appendChild(field("Модель", { required: true, value: "NEXT" }));
    r2.appendChild(field("Год выпуска", { value: "2022" }));
    m.appendChild(r2);
    m.appendChild(field("VIN", { required: true, value: "X9634050", error: "VIN уже существует в системе" }));
    var r4 = frame("R4", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r4.appendChild(field("Тип топлива", { required: true, value: "Дизель", iconRight: "▾" }));
    r4.appendChild(field("Средний расход, л/100 км", { required: true, value: "18,5" }));
    m.appendChild(r4);
    var r5 = frame("R5", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r5.appendChild(field("Грузоподъёмность, кг", { required: true, value: "3 500" }));
    r5.appendChild(field("Статус", { value: "Активен", iconRight: "▾" }));
    m.appendChild(r5);
    m.appendChild(field("Закрепить водителя", { value: "— не выбран —", iconRight: "▾" }));
  });
}

function buildDriverModal() {
  modalScreen("10 · Добавление водителя", 1560, 6300, "Добавление водителя", function (m) {
    m.appendChild(field("ФИО", { required: true, value: "Иванов Иван Иванович" }));
    var r2 = frame("R2", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r2.appendChild(field("Телефон", { required: true, value: "+7 (___) ___-__-__" }));
    r2.appendChild(field("Дата трудоустройства", { value: "01.02.2025", iconRight: "📅" }));
    m.appendChild(r2);
    var r3 = frame("R3", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r3.appendChild(field("Номер удостоверения", { required: true, value: "7724 118902" }));
    r3.appendChild(field("Категория ВУ", { required: true, value: "C, CE", iconRight: "▾" }));
    m.appendChild(r3);
    var r4 = frame("R4", { layout: "HORIZONTAL", gap: 14, stretch: true });
    r4.appendChild(field("Стаж работы, лет", { value: "9" }));
    r4.appendChild(field("Статус", { value: "Доступен", iconRight: "▾" }));
    m.appendChild(r4);
    m.appendChild(field("Закрепить автомобиль", { value: "— не выбран —", iconRight: "▾" }));
  });
}

// --- Точка входа -----------------------------------------------------------------

async function main() {
  await Promise.all(Object.keys(F).map(function (k) { return figma.loadFontAsync(F[k]); }));

  // пересоздание страницы макета
  figma.root.children.forEach(function (p) {
    if (p.name === PAGE_NAME) p.remove();
  });
  var page = figma.createPage();
  page.name = PAGE_NAME;
  figma.currentPage = page;
  PAGE = page;

  buildDesignSystem();
  buildLogin();
  buildHome();
  buildMonitoring();
  buildOrders();
  buildOrderForm();
  buildResults();
  buildCopilot();
  buildVehicleModal();
  buildDriverModal();

  figma.viewport.scrollAndZoomIntoView([PAGE]);
  figma.notify("Макет AutoMind сгенерирован: дизайн-система + 9 экранов.");
  figma.closePlugin();
}

main().catch(function (e) {
  figma.notify("Ошибка генерации: " + (e && e.message ? e.message : e));
  figma.closePlugin();
});
