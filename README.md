# QoderGuideline

**Qoder 零基础实战教程（2026 版）** —— 从安装到 DevOps，50 章全面掌握 Qoder 国际版与国内版。

## 📖 手册内容

| 部分 | 章节 | 主题 |
| --- | --- | --- |
| 一 | 1–5 | 认识 Qoder、国际版 vs 国内版、注册登录、安装 |
| 二 | 6–18 | 用 Qoder 写代码（Ask / NEXT / 行间会话 / Agent / Quest / Experts / 建项目 / 重构 / 测试） |
| 三 | 19–24 | Git 版本管理（Review 面板、CLI 工作流、分支 PR、提交规范） |
| 四 | 25–30 | Skills（内置、社区安装、手写 SKILL.md、Skill UI、子智能体与 MCP） |
| 五 | 31–34 | 代码审查（Code Review Agent、diff/PR 审查、自定义规则、Hooks 门禁） |
| 六 | 35–39 | DevOps（Headless CI/CD、定时任务、一键部署、沙箱权限、GitHub Actions） |
| 七 | 40–44 | 技术栈限定（Rules 规则、AGENTS.md 记忆、模型选择、团队知识库） |
| 八 | 45–48 | 提示词工程（基础、结构化描述、提示词增强、成本控制） |
| 九 | 49–50 | 综合实战（需求→上线全流程）+ FAQ 与安全边界 |

## 🚀 部署

GitHub Actions 工作流（`.github/workflows/deploy.yml`）在每次 push 到 `main` 时：

1. 用 `oven-sh/setup-bun` 安装 Bun
2. `bun run build` 构建静态站点（`dist/`）
3. 通过 `actions/deploy-pages` 发布到 GitHub Pages

线上地址：`https://<用户名>.github.io/qoderGuideline/`

## 🖥 本地开发

```bash
bun run dev    # 构建 + 启动本地预览 http://localhost:4173
bun run build  # 仅构建到 dist/
```

## 🎨 设计

工业直角情绪几何风格：全直角、无阴影、硬边框、几何装饰、强对比。零 npm 运行时依赖（自研 Markdown → HTML 渲染器）。
