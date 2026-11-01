// Smoke-тест генератора макета: подменяет Figma Plugin API моком и запускает code.js в Node.
// Проверяет, что все 10 корневых фреймов создаются без исключений.
"use strict";

function makeNode(type) {
  const n = {
    type: type || "NODE",
    children: [],
    x: 0, y: 0, width: 0, height: 0,
    appendChild(c) { n.children.push(c); },
    remove() { n.__removed = true; },
    resize(w, h) { n.width = w; n.height = h; }
  };
  return n;
}

const root = { type: "ROOT", children: [] };

const figmaMock = {
  root,
  _count: 0,
  currentPage: null,
  createPage() { const p = makeNode("PAGE"); root.children.push(p); return p; },
  createFrame() { figmaMock._count++; return makeNode("FRAME"); },
  createText() { figmaMock._count++; return makeNode("TEXT"); },
  createRectangle() { figmaMock._count++; return makeNode("RECT"); },
  createEllipse() { figmaMock._count++; return makeNode("ELLIPSE"); },
  createVector() { figmaMock._count++; return makeNode("VECTOR"); },
  createLine() { figmaMock._count++; return makeNode("LINE"); },
  loadFontAsync() { return Promise.resolve(); },
  notify(msg) { console.log("[notify]", msg); },
  closePlugin() { figmaMock.__closed = true; },
  viewport: { scrollAndZoomIntoView() {} }
};

global.figma = figmaMock;

process.on("unhandledRejection", e => { console.error("REJECTION:", e); process.exit(1); });

require("../figma-plugin/code.js");

setTimeout(() => {
  const page = root.children[root.children.length - 1];
  const names = page.children.map(f => f.name);
  console.log("Создано узлов:", figmaMock._count);
  console.log("Корневых фреймов на странице:", page.children.length);
  names.forEach(n => console.log("  ·", n));
  const errors = names.filter(n => String(n).startsWith("ОШИБКА"));
  if (errors.length) {
    console.error("FAIL: генерация с ошибками:", errors.join("; "));
    process.exit(1);
  }
  if (page.children.length !== 10) {
    console.error("FAIL: ожидалось 10 корневых фреймов");
    process.exit(1);
  }
  console.log("OK: генератор отработал без ошибок");
}, 100);
