# 🌍 智游 AI (TravelGenius)

**基于大语言模型的智能旅游规划助手**

智游 AI 是一个现代化的 React 应用程序，利用 Google Gemini (或 OpenAI) 的强大能力，结合高德地图服务，为您生成个性化、可视化的旅行攻略。它不仅能生成详细的每日行程，还支持通过自然语言对话实时调整方案，让旅行规划像聊天一样简单。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.0-38bdf8.svg)

## ✨ 核心功能

*   **🤖 智能行程生成**:
    *   **多目的地规划**: 支持添加多个目的地并进行拖拽排序，智能规划路线。
    *   **个性化定制**: 自定义日期范围（自动计算天数）、预算、人数。
    *   **风格与兴趣**: 内置“特种兵”、“Citywalk”等多种旅行风格，支持自定义标签。
    *   **小红书风格**: 模拟资深博主口吻，提供网红打卡点、避雷指南和本地美食推荐。

*   **🗺️ 交互式地图集成**:
    *   **高德地图 (AMap)**: 自动将生成的景点、餐厅、酒店绘制在地图上。
    *   **路线可视化**: 每日行程路径连线，直观展示游玩动线。
    *   **信息窗口**: 点击地图标记查看详细信息。

*   **💬 AI 对话修改 (Chat Interface)**:
    *   **实时调整**: 对生成的行程不满意？直接告诉 AI：“第二天太累了，删掉一个景点”或“把晚餐换成火锅”。
    *   **增量更新**: 智能理解上下文，仅修改需要调整的部分，保持整体结构不变。

*   **⚙️ 灵活的模型配置**:
    *   **Google Gemini**: 原生集成，支持 Google Search Grounding (联网搜索) 获取最新数据。
    *   **OpenAI 兼容模式**: 支持接入 GPT-4, DeepSeek, Moonshot (Kimi) 等兼容 OpenAI 接口的模型。
    *   **外部爬虫接入**: 预留接口可接入 Python 后端爬虫，获取更深度的私有数据。

*   **📱 现代化 UI/UX**:
    *   响应式布局，适配桌面与移动端。
    *   精美的处理日志动画 (`ProcessingLog`)。
    *   支持行程导出 (打印/PDF)。

## 🛠️ 技术栈

*   **前端框架**: React 19, TypeScript
*   **构建工具**: Vite (推荐) 或各类支持 ES Modules 的环境
*   **样式库**: Tailwind CSS
*   **图标库**: Lucide React
*   **AI SDK**: `@google/genai` (Google 官方 SDK)
*   **地图服务**: `@amap/amap-jsapi-loader` (高德地图)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/travel-genius.git
cd travel-genius
```

### 2. 安装依赖

确保您已安装 Node.js (v18+)。

```bash
npm install
# 或者
yarn install
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 首次运行配置

打开浏览器访问 `http://localhost:5173`。点击右上角的 **“设置”** 图标进行必要的 API 配置。

## 🔑 配置指南

为了让应用正常工作，您至少需要配置 **AI 模型** 和 **地图 Key**。

### 1. AI 模型配置 (二选一)

#### 🅰️ Google Gemini (推荐)
*   优势：免费额度高，支持实时联网搜索 (Google Grounding)，数据更新。
*   获取 Key: 访问 [Google AI Studio](https://aistudio.google.com/)。
*   配置位置: 设置 -> AI & 数据源 -> 选择 Google Gemini -> 输入 API Key。

#### 🅱️ OpenAI 兼容接口
*   优势：可使用 DeepSeek、Kimi 等国产模型，或 GPT-4。
*   配置位置: 设置 -> AI & 数据源 -> 选择 OpenAI 兼容接口。
    *   Base URL: 例如 `https://api.deepseek.com/v1`
    *   API Key: 您的模型服务商 Key。
    *   Model Name: 例如 `deepseek-chat`。

### 2. 高德地图配置 (必须)

*   访问 [高德开放平台](https://console.amap.com/dev/key/app)。
*   创建应用并申请 Key。
*   **注意**: 必须选择 **"Web端 (JS API)"** 类型的 Key。
*   配置位置: 设置 -> 地图服务。
    *   **Web端 Key**: 填入您申请的 Key。
    *   **安全密钥 (Security Code)**: 为了在本地开发环境顺利加载地图，建议配置安全密钥。

## 📂 项目结构

```text
src/
├── components/          # UI 组件
│   ├── ChatInterface.tsx    # AI 对话修改悬浮窗
│   ├── MapComponent.tsx     # 高德地图封装组件
│   ├── ProcessingLog.tsx    # 生成过程中的终端动画
│   ├── SettingsModal.tsx    # 设置弹窗
│   └── TravelForm.tsx       # 首页输入表单
├── services/
│   └── geminiService.ts     # AI 核心逻辑 (生成、验证、修改)
├── types.ts             # TypeScript 类型定义
├── App.tsx              # 主应用入口
├── index.tsx            # 挂载点
└── index.html           # HTML 模板 & 样式动画
```

## 📝 常见问题

**Q: 地图无法加载，显示白屏或报错？**
A: 请确保您在高德控制台申请的是 **Web端 (JS API)** Key，而不是 Web 服务 Key。如果您在 Codesandbox 或特定受限环境中运行，可能会因为 referrer 限制导致地图被拦截，请尝试在设置中配置 Security Code。

**Q: AI 生成速度很慢？**
A: 这是一个复杂的推理任务。Gemini 通常需要 10-20 秒来生成完整的 3-5 天行程，尤其是开启了 Google Search 联网功能时。请耐心等待“处理日志”动画完成。

**Q: 为什么生成的地点在地图上位置不对？**
A: AI 会尽力返回经纬度，但偶尔会产生幻觉。系统会自动尝试在地图上标记，如果坐标偏差过大，地图标记可能会偏离。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源。
