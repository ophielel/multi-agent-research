# 🔬 Deep Research Launcher

AI 深度研究启动器 - 自动进行深度研究并生成完整报告

## 功能特点

- **深度研究**：采用多轮迭代搜索，深入探索主题
- **广度搜索**：并行执行多个搜索查询，全面覆盖主题
- **智能配置**：支持多种 AI 服务商（OpenAI、Anthropic、Azure、自定义）
- **可视化界面**：友好的中文 Web 界面
- **进度追踪**：实时显示研究进度和日志
- **报告管理**：查看、下载、删除历史研究报告

## 工作原理

Deep Research 采用深度-广度搜索算法：

1. **问题分解**：将研究主题分解为若干子问题
2. **搜索查询生成**：为每个子问题生成搜索关键词
3. **深度迭代**：
   - 执行搜索获取内容
   - 从结果中提取关键发现
   - 生成后续研究问题
   - 递归进入下一层深度
4. **报告生成**：综合所有发现生成完整报告

```
深度: 5层 (每层递减)
广度: 4个并行查询 (每层减半)
```

## 安装

### 前置要求

- Node.js 18+
- npm 或 yarn

### 步骤

```bash
# 1. 安装依赖
npm install

# 2. 创建环境配置（可选）
cp .env.example .env

# 3. 启动服务器
npm start
```

开发模式：
```bash
npm run dev
```

## 使用

1. 打开浏览器访问 `http://localhost:3000`

2. **配置 AI 服务**：
   - 点击"配置"标签
   - 选择服务商
   - 输入 API Key
   - 设置端点和模型
   - 点击保存

3. **开始研究**：
   - 在"研究"标签输入主题
   - 点击"开始研究"
   - 等待研究完成

4. **查看报告**：
   - 在"报告库"标签查看所有报告
   - 点击"查看"阅读完整报告
   - 点击"下载"保存为 Markdown 文件

## 配置说明

### 支持的服务商

| 服务商 | API 端点示例 | 推荐模型 |
|--------|--------------|---------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Anthropic | `https://api.anthropic.com/v1` | `claude-3-5-sonnet-20241022` |
| Azure OpenAI | `https://your-resource.openai.azure.com/` | `gpt-4o` |
| 自定义 | 任意兼容 OpenAI API 的端点 | 自定义 |

### 研究参数

- **最大迭代次数**：1-20，控制研究的深度
- **搜索深度**：1-10，控制每层并行查询数

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript
- **AI 集成**：OpenAI SDK（兼容多家服务商）
- **Markdown 渲染**：marked.js

## 项目结构

```
deep-research-launcher/
├── backend/
│   ├── server.js          # Express 服务器
│   └── deepResearch.js    # Deep Research 核心逻辑
├── frontend/
│   ├── index.html         # 主页面
│   ├── styles.css        # 样式
│   └── app.js          # 前端逻辑
├── reports/             # 生成的报告存储
├── config.json          # 用户配置
└── package.json
```

## 常见问题

### 研究一直显示"进行中"怎么办？

可能的原因：
- API Key 无效或已过期
- 网络连接问题
- API 配额耗尽

检查方法：
- 查看浏览器控制台错误信息
- 检查 API Key 是否正确
- 确认网络连接正常

### 如何使用本地模型（如 Ollama）？

配置自定义端点：
```
API 端点: http://localhost:11434/v1
模型: llama2
```

### 研究可以导出为 PDF 吗？

目前导出为 Markdown 格式，可以：
1. 使用 Markdown 编辑器转换
2. 使用 pandoc: `pandoc report.md -o report.pdf`

## 开发

### API 端点

```
GET  /api/config           # 获取配置
POST /api/config           # 保存配置
POST /api/research/start   # 开始研究
GET  /api/research/list    # 获取报告列表
GET  /api/research/status/:id  # 获取研究状态
GET  /api/research/report/:id  # 获取报告内容
DELETE /api/research/:id    # 删除报告
```

## 许可证

MIT License

## 致谢

参考的开源项目：
- [gpt-researcher](https://github.com/assafelovic/gpt-researcher)
- [deep-research](https://github.com/dzhng/deep-research)
