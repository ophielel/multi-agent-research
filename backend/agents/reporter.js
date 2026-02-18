const OpenAI = require('openai');

/**
 * 报告员智能体
 * 职责：撰写最终研究报告
 */
class ReporterAgent {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint || 'https://api.openai.com/v1'
    });
  }

  /**
   * 生成研究概述
   */
  async generateExecutiveSummary(topic, synthesis) {
    const prompt = `为以下研究撰写执行摘要：

研究主题：${topic}

综合分析：
${JSON.stringify(synthesis, null, 2)}

请撰写一份简洁有力的执行摘要，包括：
1. 研究目的
2. 主要发现（3-5 个要点）
3. 关键洞察
4. 整体结论

使用 Markdown 格式，控制在 300-500 字。`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的研究报告撰写专家，擅长撰写简洁有力的执行摘要。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 2000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('执行摘要生成失败:', error);
      return '# 执行摘要\n\n本报告基于多智能体协作研究完成。';
    }
  }

  /**
   * 生成详细报告章节
   */
  async generateDetailedReport(topic, findings, synthesis) {
    const prompt = `基于研究发现和综合分析，撰写详细的研究报告：

研究主题：${topic}

研究发现：
${JSON.stringify(findings, null, 2)}

综合分析：
${JSON.stringify(synthesis, null, 2)}

请使用 Markdown 格式撰写完整报告，包括以下结构：

# ${topic}

## 执行摘要
（执行摘要内容）

## 1. 研究背景
### 1.1 研究目的
### 1.2 研究范围
### 1.3 研究方法

## 2. 主要发现
### 2.1 核心主题1
（详细内容）

### 2.2 核心主题2
（详细内容）

### 2.3 核心主题3
（详细内容）

## 3. 分析与洞察
### 3.1 模式识别
### 3.2 趋势分析
### 3.3 因果关系
### 3.4 信息缺口

## 4. 结论与建议
### 4.1 主要结论
### 4.2 局限性说明
### 4.3 后续研究方向

## 5. 参考资料
- [来源1](URL)
- [来源2](URL)

---
*报告生成时间：${new Date().toISOString()}*
*研究方法：多智能体协作研究*

要求：
1. 内容详实，逻辑清晰
2. 每个发现都有详细说明
3. 包含数据支撑和证据
4. 提供可行的建议
5. 使用专业的报告语言`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的研究报告撰写专家，擅长撰写结构清晰、内容详实的研究报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 8000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('详细报告生成失败:', error);
      return `# ${topic} - 研究报告

## 执行摘要
本报告基于多智能体协作研究完成。

## 主要发现
${findings.map((f, i) => `### ${i + 1}. ${f.subtopicQuestion}\n\n${f.analysis?.keyFindings?.map(k => `- ${k.point}`).join('\n') || '暂无发现'}`).join('\n\n')}

## 参考资料
基于网络搜索和 AI 分析完成。`;
    }
  }

  /**
   * 优化报告格式
   */
  async formatReport(reportContent) {
    const prompt = `优化以下研究报告的格式和可读性：

${reportContent}

请改进：
1. 标题层级和结构
2. 段落之间的流畅性
3. 使用恰当的强调和格式
4. 确保语法和拼写正确

返回优化后的完整 Markdown 报告。`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的文档编辑，擅长优化 Markdown 格式和可读性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 6000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('报告优化失败:', error);
      return reportContent;
    }
  }
}

module.exports = ReporterAgent;
