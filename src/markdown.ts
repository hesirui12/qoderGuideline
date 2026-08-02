// markdown.ts — 零依赖、安全的 Markdown → HTML 渲染器
// 支持：标题、代码块、表格、引用、有序/无序/任务列表、段落、行内样式

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineText(s: string): string {
  let t = escapeHtml(s);
  t = t.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, text: string, url: string) =>
      `<a href="${url}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : ""}>${renderInlineText(text)}</a>`
  );
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return t;
}

export function renderInline(src: string): string {
  const parts = src.split(/`([^`]+)`/);
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) out += `<code>${escapeHtml(parts[i])}</code>`;
    else out += renderInlineText(parts[i]);
  }
  return out;
}

export interface RenderOpts {
  headingOffset?: number;
}

function parseRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
}

function renderListBlock(src: string): string {
  const lines = src.split("\n");
  const ordered = /^\s*\d+\.\s/.test(lines[0]);
  const base = lines[0].match(/^(\s*)/)![1].length;

  const walk = (start: number, indent: number): { html: string; next: number } => {
    const items: { text: string; children: string | null }[] = [];
    let i = start;
    while (i < lines.length) {
      const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (!m) break;
      const ind = m[1].length;
      if (ind !== indent) break;
      const text = m[3];
      let j = i + 1;
      const childLines: string[] = [];
      while (j < lines.length) {
        const cm = lines[j].match(/^(\s*)([-*+]|\d+\.)\s+/);
        if (!cm || cm[1].length <= indent) break;
        childLines.push(lines[j]);
        j++;
      }
      items.push({ text, children: childLines.length ? childLines.join("\n") : null });
      i = j;
    }
    const tag = ordered ? "ol" : "ul";
    const lis = items
      .map((it) => {
        const task = it.text.match(/^\[([ xX])\]\s+(.*)$/);
        let inner: string;
        if (task) {
          const checked = task[1].toLowerCase() === "x";
          inner = `<input type="checkbox" disabled ${checked ? "checked" : ""}><span>${renderInline(task[2])}</span>`;
        } else {
          inner = renderInline(it.text);
        }
        const kids = it.children ? walkNext(it.children) : "";
        return `<li${task ? " class=\"task\"" : ""}>${inner}${kids}</li>`;
      })
      .join("");
    return { html: `<${tag} class="lst">${lis}</${tag}>`, next: i };
  };

  const walkNext = (src2: string): string => {
    const lines2 = src2.split("\n");
    if (!lines2.length) return "";
    const r = parseListLines(lines2, 0);
    return r;
  };

  function parseListLines(ls: string[], idx: number): string {
    const first = ls[idx];
    const isOrd = /^\s*\d+\.\s/.test(first);
    const ind = first.match(/^(\s*)/)![1].length;
    const items: { text: string; children: string | null }[] = [];
    let i = idx;
    while (i < ls.length) {
      const m = ls[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (!m) break;
      if (m[1].length !== ind) break;
      let j = i + 1;
      const child: string[] = [];
      while (j < ls.length) {
        const cm = ls[j].match(/^(\s*)([-*+]|\d+\.)\s+/);
        if (!cm || cm[1].length <= ind) break;
        child.push(ls[j]);
        j++;
      }
      const t = m[3];
      const task = t.match(/^\[([ xX])\]\s+(.*)$/);
      let inner: string;
      if (task) {
        inner = `<input type="checkbox" disabled ${task[1].toLowerCase() === "x" ? "checked" : ""}><span>${renderInline(task[2])}</span>`;
      } else inner = renderInline(t);
      const kids = child.length ? parseListLines(child, 0) : "";
      items.push({ text: "", children: null });
      items[items.length - 1] = { text: t, children: child.length ? child.join("\n") : null };
      i = j;
    }
    const tag = isOrd ? "ol" : "ul";
    return `<${tag} class="lst">${items
      .map((it) => {
        const tk = it.text.match(/^\[([ xX])\]\s+(.*)$/);
        let inner2: string;
        if (tk) inner2 = `<input type="checkbox" disabled ${tk[1].toLowerCase() === "x" ? "checked" : ""}><span>${renderInline(tk[2])}</span>`;
        else inner2 = renderInline(it.text);
        const kids2 = it.children ? parseListLines(it.children.split("\n"), 0) : "";
        return `<li${tk ? " class=\"task\"" : ""}>${inner2}${kids2}</li>`;
      })
      .join("")}</${tag}>`;
  }

  // 入口：对整块直接解析
  const r = parseListLines(lines, 0);
  return r;
}

export function renderMarkdown(src: string, opts: RenderOpts = {}): string {
  const offset = opts.headingOffset ?? 0;
  const lines = src.split("\n");
  const blocks: string[] = [];
  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];
  let para: string[] = [];
  let headingCount = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push("p:" + para.join("\n"));
      para = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (inFence) {
      if (/^\s*```/.test(line)) {
        inFence = false;
        blocks.push(`code:${fenceLang}\n` + fenceBuf.join("\n"));
        fenceBuf = [];
        i++;
        continue;
      }
      fenceBuf.push(line);
      i++;
      continue;
    }
    if (/^\s*```/.test(line)) {
      flushPara();
      inFence = true;
      fenceLang = line.trim().replace(/^```/, "").trim();
      i++;
      continue;
    }
    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flushPara();
      blocks.push("h:" + line);
      i++;
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushPara();
      blocks.push("hr");
      i++;
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushPara();
      const rows: string[][] = [parseRow(line)];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push("table:" + JSON.stringify(rows));
      continue;
    }
    if (/^\s*>/.test(line)) {
      flushPara();
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        q.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push("quote:" + q.join("\n"));
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i]);
        i++;
      }
      blocks.push("list:" + items.join("\n"));
      continue;
    }
    para.push(line);
    i++;
  }
  if (inFence) blocks.push(`code:${fenceLang}\n` + fenceBuf.join("\n"));
  flushPara();

  return blocks
    .map((b) => {
      if (b === "hr") return `<hr class="hrule">`;
      const sep = b.indexOf(":");
      const kind = sep >= 0 ? b.slice(0, sep) : "";
      const payload = sep >= 0 ? b.slice(sep + 1) : b;
      switch (kind) {
        case "h": {
          const m = payload.match(/^(#{1,6})\s+(.*)$/)!;
          const lvl = Math.min(6, Math.max(2, m[1].length + offset));
          headingCount++;
          return `<h${lvl} id="sec-${headingCount}">${renderInline(m[2])}</h${lvl}>`;
        }
        case "code": {
          const nl = payload.indexOf("\n");
          const lang = nl >= 0 ? payload.slice(0, nl).trim() : "";
          const code = nl >= 0 ? payload.slice(nl + 1) : "";
          return `<div class="codeblock"><div class="codebar"><span class="sq sq-o"></span><span class="sq sq-y"></span><span class="sq sq-c"></span><span class="lang">${escapeHtml(lang || "code")}</span></div><pre><code>${escapeHtml(code)}</code></pre></div>`;
        }

        case "quote":
          return `<blockquote>${renderMarkdown(payload, opts)}</blockquote>`;
        case "table": {
          const rows: string[][] = JSON.parse(payload);
          const head = rows[0];
          const body = rows.slice(1);
          const th = head.map((c) => `<th>${renderInline(c)}</th>`).join("");
          const trs = body
            .map(
              (r) =>
                `<tr>${r
                  .map((c) => `<td>${renderInline(c)}</td>`)
                  .join("")}</tr>`
            )
            .join("");
          return `<div class="tablewrap"><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
        }
        case "list":
          return renderListBlock(payload);
        case "p":
          return `<p>${renderInline(payload)}</p>`;
        default:
          return "";
      }
    })
    .join("\n");
}
