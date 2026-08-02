// serve.ts — 极简静态文件服务器（Bun）
import { $ } from "bun";

const DIST = `${import.meta.dir}/../dist`;
const PORT = Number(process.env.PORT || 4173);

// 确保已构建
const idx = Bun.file(`${DIST}/index.html`);
if (!(await idx.exists())) {
  console.log("⚠ 未找到构建产物，先执行构建…");
  await $`bun run ${import.meta.dir}/build.ts`.quiet();
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/index.html";
    const file = Bun.file(DIST + p);
    if (await file.exists()) {
      return new Response(file);
    }
    // SPA 兜底 → 首页
    if (!p.includes(".")) {
      return new Response(Bun.file(`${DIST}/index.html`));
    }
    return new Response("404 Not Found", { status: 404 });
  },
});

console.log("");
console.log("  ┌──────────────────────────────────────┐");
console.log("  │   QODER//GUIDE  ·  bun static server   │");
console.log("  └──────────────────────────────────────┘");
console.log(`  本地预览:  http://localhost:${server.port}`);
console.log(`  教程首页:  http://localhost:${server.port}/index.html`);
console.log(`  第 01 章:  http://localhost:${server.port}/chapters/01.html`);
console.log("");
