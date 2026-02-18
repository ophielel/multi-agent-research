const OpenAI = require('openai');

/**
 * 分析智能体
 * 职责：综合分析研究发现，提取洞察和模式
 */
class AnalyzerAgent {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint || 'https://api.openai.com/v1'
    });
  }

  /**
   * 综合分析所有研究发现
   */
  async synthesizeFindings(allFindings) {
    const prompt = `作为一位资深的研究分析师，请综合分析以下所有研究发现：

${JSON.stringify(allFindings, null, 2)}

请进行深度分析并返回 JSON 格式：
{
  "keyThemes": [
    {
      "theme": "核心主题",
      "supportingPoints": ["支撑点1", "支撑点2"],
      "evidenceCount": 数量
    }
  ],
  "patterns": [
    {
      "pattern": "模式描述",
      "occurrence": "频率",
      "significance": "重要性"
    }
  ],
  "gaps": [
    "信息缺口1",
    "信息缺口2"
  ],
  "contradictions": [
    "矛盾点1",
    "矛盾点2"
  ],
  "overallConfidence": 0.0-1.0,
  "recommendations": [
    "建议1",
    "建议2"
  ]
}

要求：
1. 识别 3-5 个核心主题
2. 识别重要的模式和趋势
3. 指出信息缺口
4. 识别任何矛盾或不一致
5. 提供整体置信度评估
6. 给出后续研究方向建议`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位资深的研究分析师，擅长综合分析复杂信息，识别模式和洞察。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 3000
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('综合分析失败:', error);
      return {
        keyThemes: [],
        patterns: [],
        gaps: [],
        contradictions: [],
        overallConfidence: 0.5,
        recommendations: []
      };
    }
  }

  /**
   * 交叉验证多个来源
   */
  async crossValidateSources(source1, source2) {
    const prompt = `对比两个来源的信息，验证一致性：

来源 1：
${JSON.stringify(source1, null, 2)}

来源 2：
${JSON.stringify(source2, null, 2)}

请返回 JSON 格式：
{
  "consistency": "high|medium|low",
  "agreements": ["一致点"],
  "disagreements": ["冲突点"],
  "reconciliation": "如何调和这些冲突"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的信息验证员，擅长对比和调和不同来源的信息。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('交叉验证失败:', error);
      return {
        consistency: 'low',
        agreements: [],
        disagreements: [],
        reconciliation: ''
      };
    }
  }

  /**
   * 提取关键指标和数据
   */
  async extractMetrics(findings) {
    const prompt = `从研究发现中提取关键指标和数据：

${JSON.stringify(findings, null, 2)}

请返回 JSON 格式：
{
  "metrics": [
    {
      "name": "指标名称",
      "value": "数值",
      "unit": "单位",
      "source": "来源",
      "reliability": "high|medium|low"
    }
  ],
  "trends": [
    {
      "direction": "上升/下降/稳定",
      "period": "时间范围",
      "significance": "重要性"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位数据分析师，擅长提取和组织量化信息。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      return { metrics: [], trends: [] };
    }
  }
}

module.exports = AnalyzerAgent;
