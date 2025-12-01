# Weeknight · app-web · Cursor Context

Last updated: 2025-11-30

## 0) What this repo is

前端 PWA（Next.js/Vercel）。职责：用户界面、调用后端 API（Cloud Run）、
集成 Supabase Auth/Storage、GA4。

---

## 1) Tech Stack

- Next.js（App Router, Turbopack）
- Supabase JS
- 部署平台：Vercel（Production/Preview）

---

## 2) Domains

- Production：`https://app.useweeknight.com`
- Preprod/Staging：`https://staging.useweeknight.com`
- Preview：`*.vercel.app`（如 `https://app-web-tawny-zeta.vercel.app`）

---

## 3) Env Vars (.env.local / Vercel)

| Key | Example | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mvnjengmxzkrntyqubqe.supabase.co` | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<supabase-anon>` | client |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | client |

---

## 4) Backend API Endpoint

- Base：`https://api.useweeknight.com`（或基础域）
- Example：`POST /generate-card?userId=...` body=`image/png`

### 调用示例（Bearer Token）

```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

const res = await fetch("https://api.useweeknight.com/generate-card?userId=USER_ID", {
  method: "POST",
  headers: {
    "Content-Type": "image/png",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: pngBlob
});
```

---

## 5) Supabase Auth Redirects

- 生产：`https://app.useweeknight.com/auth/callback/*`
- 预发：`https://staging.useweeknight.com/auth/callback/*`
- 预览：`https://*.vercel.app/auth/callback/*`
- 本地：`http://localhost:3000/auth/callback/*`

---

## 6) Cursor Tips

- 打开：`src/app/*`、`src/lib/*`、`README_CURSOR_app-web.md`
- 关键词：`supabase.auth.getSession`、`Authorization: Bearer`、
  `uploadPngToCloudRun`
- 如果遇到 CORS 报错，先检查 **后端 CORS 白名单** 与请求头。
- 如在前端实现 Tonight 卡片、菜谱详情、步骤时间线等界面，涉及菜谱库字段时，
  请以根目录 `菜谱库_产品说明_v1.0.md` 与 `schema.sql` 中的
  recipe / recipe_step / recipe_media / nutrition_snapshot 为唯一标准。

更多统一的 Cursor 使用规范，见 ops-config/docs/CURSOR_HANDBOOK.md

---

## 7) 已完成工作（Step 7）

### 登录与认证

- `/login` - 支持 Apple/Google OAuth + Email/Password + Magic Link
- `/auth/callback` - OAuth 回调处理，检查冷启动状态
- `middleware.ts` - 路由保护（protected routes + admin routes）

### 用户流程

- `/onboarding` - 冷启动流程（家庭设置 → 滑卡偏好 → 完成）
- `/tonight` - Tonight 主页（文本输入 + SuggestionCard 列表 + 配菜软入口）
- `/cook` - 点按式烹饪界面（时间线 + 计时器 + 步骤控制）
- `/grocery` - 过道分组购物清单（勾选 + 还差清单）
- `/appliances` - 器具专题入口（Air Fryer/Sheet-pan/One-pot 等）
- `/profile` - 用户资料页

### API 客户端 (`src/lib/api.ts`)

- Tonight API: `getTonightSuggestions()`
- Recipes API: `searchRecipes()`, `getRecipeById()`, `getRecipeTimeline()`
- Telemetry API: `sendTelemetry()`
- Share Card API: `generateShareCard()`
- Cook API (Step 7): `startCookSession()`, `sendCookAction()`, `getCookSession()`,
  `createCookEventSource()`

### UI 组件

- `BottomNav` - 底部导航栏
- `Button` / `Input` - 基础表单组件
- 全局样式：`globals.css`（CSS 变量 + 暗色模式 + 动画）
