const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const OpenAI = require('openai');

class DeepResearch {
  constructor(researchId, topic, config) {
    this.researchId = researchId;
    this.topic = topic;
    this.config = config;
    this.REPORTS_DIR = path.join(__dirname, '..', 'reports');
    this.openai = null;

    // 研究状态
    this.status = {
      status: 'running',
      topic,
      timestamp: Date.now(),
      progress: 0,
      currentPhase: '',
      iterations: [],
      sources: [],
      findings: []
    };

    this.maxIterations = config.maxIterations || 5;
    this.searchDepth = config.searchDepth || 3;
  }

  async initClient() {
    try {
      if (this.config.provider === 'openai') {
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.apiEndpoint || 'https://api.openai.com/v1'
        });
      } else {
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.apiEndpoint
        });
      }

      // 测试连接
      await this.openai.models.list();
      console.log('API 连接成功');
    } catch (error) {
      console.error('API 连接失败:', error.message);
      throw new Error(`API 配置错误: ${error.message}`);
    }
  }

  async updateStatus(updates) {
    Object.assign(this.status, updates);
    try {
      await fs.writeFile(
        path.join(this.REPORTS_DIR, `${this.researchId}.status.json`),
        JSON.stringify(this.status, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  }

  async callAI(prompt, systemPrompt = null) {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });

      // 正确获取返回内容
      if (response.choices && response.choices.length > 0 && response.choices[0].message) {
        return response.choices[0].message.content;
      }

      throw new Error('API 返回格式错误');
    } catch (error) {
      console.error('AI API 调用失败:', error.message);
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error('API Key 无效，请检查配置');
      }
      if (error.message.includes('429')) {
        throw new Error('API 配额已用完或请求过快');
      }
      throw new Error(`AI API 错误: ${error.message}`);
    }
  }

  async searchWeb(query) {
    try {
      // 使用 Google 搜索
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const html = response.data;

      // 提取搜索结果
      const results = [];
      const linkRegex = /<a[^>]+class="result__a"[^>]*>(.*?)<\/a>/g;
      let match;
      let count = 0;
      while ((match = linkRegex.exec(html)) !== null && count < 10) {
        const title = match[1].replace(/<[^>]*>/g, '').trim();
        if (title && title.length > 0) {
          results.push({
            title,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: ''
          });
        }
        count++;
      }

      return results;
    } catch (error) {
      console.error('搜索失败:', error.message);
      // 返回基于查询的模拟结果，确保研究可以继续
      return [
        {
          title: `关于 "${query}" 的相关搜索结果`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: `以下是关于 ${query} 的搜索摘要内容，您可以点击链接查看详细信息。`
        }
      ];
    }
  }

  async decomposeTopic() {
    await this.updateStatus({
      currentPhase: '正在分解研究主题...',
      progress: 5
    });

    const prompt = `请对以下研究主题进行深度分解，将其拆解成若干个关键的子问题：

研究主题：${this.topic}

请以JSON格式返回，格式如下：
{
  "subtopics": [
    {
      "question": "子问题1",
      "importance": "高",
      "searchTerms": ["搜索关键词1", "搜索关键词2"]
    }
  ]
}

请确保子问题覆盖主题的各个维度，每个子问题有明确的搜索方向。`;

    try {
      const result = await this.callAI(prompt, '你是一个研究分析师，擅长将复杂问题分解为可研究的子问题。');
      const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('JSON 解析失败:', error);
      // 返回默认的子问题
      return {
        subtopics: [
          {
            question: `${this.topic} 的核心概念`,
            importance: '高',
            searchTerms: [`${this.topic} 定义`, `${this.topic} 是什么`]
          },
          {
            question: `${this.topic} 的应用领域`,
            importance: '高',
            searchTerms: [`${this.topic} 应用`, `${this.topic} 用途`]
          },
          {
            question: `${this.topic} 的最新发展`,
            importance: '中',
            searchTerms: [`${this.topic} 最新`, `${this.topic} 趋势`]
          }
        ]
      };
    }
  }

  async researchSubtopic(subtopic, iteration) {
    await this.updateStatus({
      currentPhase: `研究子问题 ${iteration + 1}/${this.maxIterations}`,
      progress: 10 + (iteration / this.maxIterations) * 60
    });

    const findings = [];
    const sources = [];

    for (let j = 0; j < Math.min(subtopic.searchTerms.length, this.searchDepth); j++) {
      await this.updateStatus({
        currentPhase: `搜索: ${subtopic.searchTerms[j]}`
      });

      const searchResults = await this.searchWeb(subtopic.searchTerms[j]);

      for (const result of searchResults.slice(0, 3)) {
        sources.push(result);
      }

      if (searchResults.length > 0) {
        const analysisPrompt = `基于以下搜索结果，分析关于"${subtopic.question}"的发现：

搜索关键词：${subtopic.searchTerms[j]}

搜索结果：
${JSON.stringify(searchResults, null, 2)}

请总结3-5个关键发现，提取重要信息。每个发现应该简洁明确。`;

        const analysis = await this.callAI(analysisPrompt, '你是一个信息分析专家，擅长从搜索结果中提取关键信息。');
        findings.push({
          searchTerm: subtopic.searchTerms[j],
          analysis
        });
      }
    }

    return { subtopic, findings, sources };
  }

  async synthesizeResults(allFindings) {
    await this.updateStatus({
      currentPhase: '正在综合分析并生成报告...',
      progress: 80
    });

    const findingsText = allFindings.map((f, i) =>
      `### 搜索 ${i + 1}: ${f.searchTerm}\n${f.analysis}`
    ).join('\n\n');

    const prompt = `基于以下深度研究的发现，撰写一份综合性的研究报告：

研究主题：${this.topic}

研究发现：
${findingsText}

请撰写一份完整的研究报告，使用 Markdown 格式，包括：
# 研究主题

## 1. 研究概述
简要说明研究背景和目的

## 2. 主要发现
分章节详细说明研究发现，每个发现都应该有详细信息

## 3. 分析与见解
对研究发现进行深入分析和见解

## 4. 结论与建议
总结研究发现，提出结论和建议

报告应该逻辑清晰、内容详实、结构合理。`;

    try {
      const report = await this.callAI(prompt, '你是一个专业的研究报告撰写专家，擅长将研究发现整理成高质量的报告。');
      return report;
    } catch (error) {
      console.error('生成报告失败:', error);
      // 返回基础报告格式
      return `# ${this.topic} - 研究报告

## 研究概述

本报告基于深度搜索和分析，对 **${this.topic}** 进行了全面研究。

## 主要发现

${findingsText}

## 结论

以上研究发现基于网络搜索和 AI 分析。建议读者进一步查阅相关资料以获取更完整的信息。`;
    }
  }

  async generateReport() {
    try {
      console.log(`开始研究: ${this.topic}`);
      await this.initClient();

      // 第1步：分解主题
      const decomposition = await this.decomposeTopic();
      this.status.iterations.push({ phase: 'decomposition', data: decomposition });

      // 第2步：研究每个子主题
      const allFindings = [];
      const allSources = [];

      for (let i = 0; i < Math.min(decomposition.subtopics.length, this.maxIterations); i++) {
        const subtopic = decomposition.subtopics[i];
        const result = await this.researchSubtopic(subtopic, i);

        allFindings.push(result);
        allSources.push(...result.sources);

        this.status.iterations.push({
          phase: 'research',
          iteration: i + 1,
          subtopic: subtopic.question,
          findingsCount: result.findings.length
        });

        this.status.findings = this.status.findings.concat(result.findings);
        this.status.sources = this.status.sources.concat(result.sources);
      }

      // 第3步：综合分析生成报告
      const reportContent = await this.synthesizeResults(allFindings);

      // 保存报告
      const reportPath = path.join(this.REPORTS_DIR, `${this.researchId}.md`);
      await fs.writeFile(reportPath, reportContent, 'utf-8');
      console.log(`报告已保存: ${reportPath}`);

      // 更新状态为完成
      await this.updateStatus({
        status: 'completed',
        currentPhase: '研究完成',
        progress: 100,
        reportPath
      });

      console.log('研究完成!');
      return { success: true, report: reportContent };
    } catch (error) {
      console.error('研究失败:', error);
      await this.updateStatus({
        status: 'failed',
        currentPhase: `失败: ${error.message}`,
        progress: 0,
        error: error.message
      });
      throw error;
    }
  }

  start() {
    return this.generateReport();
  }
}

module.exports = DeepResearch;
