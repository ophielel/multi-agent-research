const OpenAI = require('openai');

/**
 * 研究员智能体
 * 职责：生成搜索查询，收集和初步分析信息
 */
class ResearcherAgent {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint || 'https://api.openai.com/v1'
    });
    this.researchData = {
      queries: [],
      sources: [],
      findings: []
    };
  }

  /**
   * 生成研究计划 - 分解主题为多个子问题
   */
  async planResearch(topic) {
    const prompt = `作为一名专业的研究员，请将以下研究主题分解为 4-6 个关键的子问题：

研究主题：${topic}

请以 JSON 格式返回，格式如下：
{
  "subtopics": [
    {
      "id": "1",
      "question": "子问题描述",
      "importance": "高|中|低",
      "searchQueries": ["查询1", "查询2", "查询3"]
    }
  ]
}

要求：
1. 子问题应覆盖主题的不同维度
2. 每个子问题应有 3-4 个搜索查询
3. 确保查询之间的互补性和递进性`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的研究员，擅长将复杂主题分解为可研究的问题。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const plan = JSON.parse(cleaned);

      this.researchData.plan = plan;
      return plan;
    } catch (error) {
      console.error('研究计划失败:', error);
      throw new Error(`研究计划生成失败: ${error.message}`);
    }
  }

  /**
   * 生成搜索查询
   */
  async generateSearchQueries(subtopic, existingQueries = []) {
    const prompt = `基于以下子问题和已有查询，生成 3-5 个新的搜索查询：

子问题描述：${subtopic.question}

已有查询：${existingQueries.join(', ') || '无'}

要求：
1. 新查询应探索不同的角度
2. 使用多样化的关键词组合
3. 避免重复已有查询
4. 查询应该具体且有针对性

请以 JSON 数组格式返回搜索查询。`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的搜索策略师，擅长构建有效的搜索查询。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const queries = JSON.parse(cleaned);

      // 如果解析失败，返回基础查询
      if (!Array.isArray(queries)) {
        return subtopic.searchQueries || [
          `${subtopic.question}`,
          `${subtopic.question} 定义`,
          `${subtopic.question} 特点`
        ];
      }

      return queries;
    } catch (error) {
      console.error('搜索查询生成失败:', error);
      return subtopic.searchQueries || [subtopic.question];
    }
  }

  /**
   * 分析搜索结果，提取关键发现
   */
  async analyzeFindings(searchResults, subtopic) {
    const prompt = `基于以下搜索结果，分析关于"${subtopic.question}"的发现：

子问题描述：${subtopic.question}

搜索结果：
${JSON.stringify(searchResults, null, 2)}

请以 JSON 格式返回分析结果：
{
  "keyFindings": [
    {
      "point": "关键发现1",
      "importance": "高|中|低",
      "evidence": "支撑证据"
    }
  ],
  "insights": [
    "洞察1",
    "洞察2"
  ],
  "followUpQuestions": [
    "后续问题1",
    "后续问题2"
  ]
}

要求：
1. 提取 3-5 个关键发现
2. 每个发现应有明确的证据支撑
3. 生成 2-3 个深度洞察
4. 提出 2-3 个值得进一步研究的问题`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的研究分析师，擅长从信息中提取关键发现和洞察。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 2500
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleaned);

      this.researchData.findings.push({
        subtopicId: subtopic.id,
        subtopicQuestion: subtopic.question,
        analysis
      });

      return analysis;
    } catch (error) {
      console.error('发现分析失败:', error);
      return {
        keyFindings: [],
        insights: [],
        followUpQuestions: []
      };
    }
  }

  /**
   * 验证信息质量
   */
  async validateInformation(info) {
    const prompt = `验证以下信息的准确性和可靠性：

信息：${JSON.stringify(info, null, 2)}

请评估：
1. 事实准确性 - 信息是否准确
2. 来源可靠性 - 来源是否可信
3. 完整性 - 信息是否完整

请以 JSON 格式返回：
{
  "isValid": true/false,
  "confidence": 0-1,
  "issues": ["问题1", "问题2"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的事实核查员，擅长验证信息的准确性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      return {
        isValid: true,
        confidence: 0.5,
        issues: []
      };
    }
  }
}

module.exports = ResearcherAgent;
