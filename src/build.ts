// build.ts — 把 tutorial.md 构建成工业直角风格静态网站
import { renderMarkdown } from "./markdown.ts";

const ROOT = import.meta.dir + "/..";
const SRC = `${ROOT}/tutorial.md`;
const DIST = `${ROOT}/dist`;

interface Meta {
  title: string;
  subtitle: string;
  version: string;
  date: string;
  author: string;
}

interface Chapter {
  num: number;
  title: string;
  part: string;
  html: string;
  lineCount: number;
  tags: string[];
}

function parseFrontmatter(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of src.split("\n")) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}

function tagsFor(title: string): string[] {
  const rules: [RegExp, string][] = [
    [/CLI/i, "CLI"],
    [/Git|提交|分支|版本/, "Git"],
    [/Skills|技能|SKILL/, "Skills"],
    [/审查|Review|review/, "代码审查"],
    [/部署|DevOps|CI|CD|Action/, "DevOps"],
    [/规则|Rules/, "规则"],
    [/提示词/, "提示词"],
    [/记忆|AGENTS/, "记忆"],
    [/模型/, "模型"],
    [/Quest/, "Quest"],
    [/Experts|专家/, "Experts"],
    [/MCP|扩展/, "MCP"],
    [/注册|登录|账号/, "账号"],
    [/安装|下载/, "安装"],
    [/界面|快捷键|IDE/, "IDE"],
    [/实战|项目/, "实战"],
    [/安全|问题/, "安全"],
  ];
  const tags: string[] = [];
  for (const [re, tag] of rules) {
    if (re.test(title)) tags.push(tag);
  }
  return tags.slice(0, 3);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- 解析 ----------
const raw = await Bun.file(SRC).text();
const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
const metaRaw = fm ? parseFrontmatter(fm[1]) : {};
const meta: Meta = {
  title: metaRaw.title ?? "Qoder 零基础实战教程",
  subtitle: metaRaw.subtitle ?? "",
  version: metaRaw.version ?? "2026",
  date: metaRaw.date ?? "",
  author: metaRaw.author ?? "",
};
let body = fm ? raw.slice(fm[0].length) : raw;

const chapters: Chapter[] = [];
const intro: string[] = [];
let part = "综合";
let current: { title: string; lines: string[] } | null = null;

for (const line of body.split("\n")) {
  if (/^# (第.+部分.*)$/.test(line)) {
    part = line.replace(/^#\s+/, "");
    continue;
  }
  const ch = line.match(/^## (第\d+章 .*)$/);
  if (ch) {
    if (current) {
      const joined = current.lines.join("\n");
      const html = renderMarkdown(joined, { headingOffset: -1 });
      const num = chapters.length + 1;
      chapters.push({
        num,
        title: current.title,
        part,
        html,
        lineCount: current.lines.length,
        tags: tagsFor(current.title),
      });
    }
    current = { title: ch[1], lines: [] };
    continue;
  }
  if (current) current.lines.push(line);
  else intro.push(line);
}
if (current) {
  const joined = current.lines.join("\n");
  chapters.push({
    num: chapters.length + 1,
    title: current.title,
    part,
    html: renderMarkdown(joined, { headingOffset: -1 }),
    lineCount: current.lines.length,
    tags: tagsFor(current.title),
  });
}

const introHtml = renderMarkdown(intro.join("\n"), { headingOffset: 0 });

// 按 part 分组
const partGroups: { name: string; chapters: Chapter[] }[] = [];
for (const ch of chapters) {
  const last = partGroups[partGroups.length - 1];
  if (last && last.name === ch.part) last.chapters.push(ch);
  else partGroups.push({ name: ch.part, chapters: [ch] });
}

const totalLines = chapters.reduce((a, c) => a + c.lineCount, 0);

// ---------- 布局模板 ----------
const siteTitle = "QODER//GUIDE";

function ticker(items: string[]): string {
  const inner = items.map((t) => `<span>${t}</span><i>▞</i>`).join("");
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${inner}${inner}</div></div>`;
}

function themeButton(): string {
  return `<button class="square-btn" id="theme-toggle" title="切换主题">◐</button>`;
}

function header(currentNum: number | null): string {
  const home = currentNum === null ? `<span class="logo active">${siteTitle}</span>` : `<a class="logo" href="../index.html">${siteTitle}</a>`;
  const chapLink = currentNum === null ? `<a class="navlink" href="chapters/01.html">教程目录 ↓</a>` : `<a class="navlink" href="../index.html">首页</a>`;
  return `<header class="topbar"><div class="topbar-inner">${home}<nav class="topnav">${chapLink}${themeButton()}</nav></div></header>`;
}

function footer(): string {
  return `<footer class="sitefooter">
    <div class="footer-stripe"></div>
    <div class="footer-inner">
      <div class="footer-brand"><span class="logo">${siteTitle}</span><p>Qoder 零基础实战教程 · 国际版 × 国内版</p></div>
      <div class="footer-meta">
        <p>本文档整理自 2026 年初公开资料与官方文档，命令与价格以官网为准。</p>
        <p class="mono">© <span id="year"></span> 计算机大破冰 · built with bun</p>
      </div>
    </div>
    ${ticker(["QODER", "QUEST", "EXPERTS", "SKILLS", "MCP", "GIT", "REVIEW", "DEVOPS", "PROMPT", "RULES"])}
  </footer>`;
}

// ---------- 首页 ----------
function chapterCard(ch: Chapter): string {
  const tags = ch.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  return `<a class="ch-card" href="chapters/${String(ch.num).padStart(2, "0")}.html">
    <div class="ch-num">${String(ch.num).padStart(2, "0")}</div>
    <div class="ch-title">${esc(ch.title)}</div>
    <div class="ch-meta"><span class="mono">${ch.lineCount} 行</span>${tags}</div>
  </a>`;
}

function indexPage(): string {
  const partSections = partGroups
    .map((g, gi) => {
      const cards = g.chapters.map(chapterCard).join("");
      return `<section class="part-block">
        <div class="part-head"><span class="part-index">PART ${String(gi + 1).padStart(2, "0")}</span><h2 class="part-name">${esc(g.name)}</h2></div>
        <div class="ch-grid">${cards}</div>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.subtitle)}">
<link rel="stylesheet" href="style.css">
</head>
<body data-page="index">
${header(null)}
${ticker(["QODER 零基础实战教程", "国际版 × 国内版", "50 章 · " + totalLines + " 行", "2026 最新", "写代码", "Git 版本管理", "Skills", "代码审查", "DevOps", "技术栈限定", "提示词工程"])}
<main class="index-main">
  <section class="hero">
    <div class="hero-deco">
      <span class="plus p1">+</span><span class="plus p2">+</span><span class="plus p3">+</span>
      <span class="sq sq-o big"></span><span class="sq sq-y big"></span><span class="sq sq-c big"></span>
    </div>
    <p class="hero-kicker">AGENTIC CODING PLATFORM · 2026 EDITION</p>
    <h1 class="hero-title">QODER<br><span class="hero-stroke">零基础实战</span></h1>
    <p class="hero-sub">${esc(meta.subtitle)}</p>
    <div class="hero-actions">
      <a class="cta" href="chapters/01.html">开始学习 ↓</a>
      <a class="cta ghost" href="#toc">查看目录</a>
    </div>
    <div class="hero-stats">
      <div class="stat"><span class="stat-num">50</span><span class="stat-label">章教程</span></div>
      <div class="stat"><span class="stat-num">${totalLines}</span><span class="stat-label">行内容</span></div>
      <div class="stat"><span class="stat-num">9</span><span class="stat-label">大主题</span></div>
      <div class="stat"><span class="stat-num">2</span><span class="stat-label">版本覆盖</span></div>
    </div>
  </section>

  <section class="intro-strip">
    <div class="intro-inner">${introHtml}</div>
  </section>

  <section id="toc" class="toc-section">
    <div class="toc-head">
      <h2>目录<span class="blink">▌</span></h2>
      <input id="ch-search" type="search" placeholder="搜索章节…" autocomplete="off">
    </div>
    ${partSections}
  </section>
</main>
${footer()}
<div class="rules-strip" aria-hidden="true">
  <span class="rs rs-o"></span><span class="rs rs-y"></span><span class="rs rs-c"></span>
  <span class="rules-text">直角 · 无阴影 · 几何 · 情绪</span>
</div>
<script src="app.js"></script>
</body>
</html>`;
}

// ---------- 章节页 ----------
function sidebar(active: number): string {
  const groups = partGroups
    .map(
      (g) => `<div class="side-part">
      <div class="side-part-name">${esc(g.name)}</div>
      <ul class="side-list">
        ${g.chapters
          .map((ch) => {
            const n = String(ch.num).padStart(2, "0");
            const activeCls = ch.num === active ? " class=\"active\"" : "";
            return `<li><a${activeCls} href="${String(ch.num).padStart(2, "0")}.html"><span class="side-num">${n}</span>${esc(ch.title.replace(/^第\d+章\s*/, ""))}</a></li>`;
          })
          .join("")}
      </ul>
    </div>`
    )
    .join("");
  return `<aside class="sidebar" id="sidebar">
    <div class="side-head"><span class="mono">目录 / INDEX</span></div>
    ${groups}
  </aside>`;
}

function chapterPage(ch: Chapter): string {
  const prev = ch.num > 1 ? chapters[ch.num - 2] : null;
  const next = ch.num < chapters.length ? chapters[ch.num] : null;
  const prevHtml = prev
    ? `<a class="pager prev" href="${String(prev.num).padStart(2, "0")}.html"><span class="pager-label">← 上一章</span><span class="pager-title">${esc(prev.title)}</span></a>`
    : `<span class="pager disabled"><span class="pager-label">← 上一章</span><span class="pager-title">目录开始</span></span>`;
  const nextHtml = next
    ? `<a class="pager next" href="${String(next.num).padStart(2, "0")}.html"><span class="pager-label">下一章 →</span><span class="pager-title">${esc(next.title)}</span></a>`
    : `<span class="pager disabled"><span class="pager-label">下一章 →</span><span class="pager-title">已到末尾</span></span>`;
  const tags = ch.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ch.title)} · ${siteTitle}</title>
<link rel="stylesheet" href="../style.css">
</head>
<body data-page="chapter" data-num="${ch.num}" data-prev="${ch.num - 1}" data-next="${ch.num + 1}">
<div class="progress" id="progress"></div>
${header(ch.num)}
<div class="layout">
  ${sidebar(ch.num)}
  <main class="chapter-main" id="chapter">
    <article class="chapter-article">
      <header class="chapter-head">
        <div class="chapter-index">CHAPTER ${String(ch.num).padStart(2, "0")} <span class="blink">▌</span></div>
        <h1 class="chapter-title">${esc(ch.title)}</h1>
        <div class="chapter-meta"><span class="mono">${ch.part}</span><span class="mono">${ch.lineCount} 行</span>${tags}</div>
      </header>
      <div class="chapter-body">
${ch.html}
      </div>
    </article>
    <nav class="pagers">
      ${prevHtml}
      ${nextHtml}
    </nav>
  </main>
</div>
${footer()}
<button class="totop" id="totop" title="回到顶部">↑</button>
<script src="../app.js"></script>
</body>
</html>`;
}

// ---------- 输出 ----------
await Bun.write(`${DIST}/index.html`, indexPage());
for (const ch of chapters) {
  await Bun.write(`${DIST}/chapters/${String(ch.num).padStart(2, "0")}.html`, chapterPage(ch));
}
await Bun.write(`${DIST}/style.css`, await Bun.file(`${ROOT}/src/style.css`).text());
await Bun.write(`${DIST}/app.js`, await Bun.file(`${ROOT}/src/app.js`).text());

console.log(`✓ 生成完成：${chapters.length} 个章节页 + index.html`);
console.log(`✓ 章节数 ${chapters.length}，总内容 ${totalLines} 行`);
