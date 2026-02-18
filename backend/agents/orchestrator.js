const fs = require('fs').promises;
const path = require('path');
const ResearcherAgent = require('./researcher');
const SearcherAgent = require('./searcher');
const AnalyzerAgent = require('./analyzer');
const ReporterAgent = require('./reporter');

/**
 * 编排器 - 多智能体协作的核心
 * 职责：协调所有智能体的工作流程，管理研究进度
 */
class Orchestrator {
  constructor(researchId, topic, config) {
    this.researchId = researchId;
    this.topic = topic;
    this.config = config;
    this.REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

    // 初始化智能体
    this.researcher = new ResearcherAgent(config);
    this.searcher = new SearcherAgent(config);
    this.analyzer = new AnalyzerAgent(config);
    this.reporter = new ReporterAgent(config);

    // 研究状态
    this.status = {
      status: 'running',
      phase: '初始化',
      progress: 0,
      topic,
      timestamp: Date.now(),
      agents: {
        researcher: { status: 'idle', lastAction: '' },
        searcher: { status: 'idle', lastAction: '' },
        analyzer: { status: 'idle', lastAction: '' },
        reporter: { status: 'idle', lastAction: '' }
      },
      iterations: [],
      findings: [],
      synthesis: null
    };
  }

  /**
   * 更新状态到文件
   */
  async updateStatus(updates) {
    Object.assign(this.status, updates);
    await this.saveStatus();
  }

  async saveStatus() {
    try {
      const statusPath = path.join(this.REPORTS_DIR, `${this.researchId}.status.json`);
      await fs.writeFile(statusPath, JSON.stringify(this.status, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存状态失败:', error);
    }
  }

  /**
   * 启动多智能体研究流程
   */
  async startResearch() {
    console.log(`🚀 启动多智能体研究: ${this.topic}`);

    try {
      // 阶段 1: 研究计划
      await this.runPhasePlanning();

      // 阶段 2: 并行搜索
      await this.runPhaseSearch();

      // 阶段 3: 分析与综合
      await this.runPhaseAnalysis();

      // 阶段 4: 报告生成
      await this.runPhaseReporting();

      // 完成
      await this.updateStatus({
        status: 'completed',
        phase: '研究完成',
        progress: 100
      });

      console.log('✅ 多智能体研究完成!');
      return { success: true };

    } catch (error) {
      console.error('研究失败:', error);
      await this.updateStatus({
        status: 'failed',
        phase: `失败: ${error.message}`,
        progress: 0,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 阶段 1: 研究计划
   */
  async runPhasePlanning() {
    console.log('📋 阶段 1: 研究计划');
    await this.updateStatus({
      phase: '制定研究计划...',
      progress: 5,
      'agents.researcher.status': 'active',
      'agents.researcher.lastAction': '制定研究计划'
    });

    const plan = await this.researcher.planResearch(this.topic);

    this.status.plan = plan;
    this.status.iterations.push({
      phase: 'planning',
      timestamp: Date.now(),
      subtopicsCount: plan.subtopics?.length || 0
    });
  }

  /**
   * 阶段 2: 并行搜索
   */
  async runPhaseSearch() {
    console.log('🔍 阶段 2: 搜索与分析');
    await this.updateStatus({
      phase: '多智能体搜索中...',
      progress: 15,
      'agents.searcher.status': 'active',
      'agents.searcher.lastAction': '执行搜索'
    });

    const subtopics = this.status.plan?.subtopics || [];
    const allFindings = [];

    // 并行处理每个子主题
    for (let i = 0; i < subtopics.length; i++) {
      const subtopic = subtopics[i];
      const progressBase = 20 + (i / subtopics.length) * 40;

      await this.updateStatus({
        phase: `搜索子主题 ${i + 1}/${subtopics.length}`,
        progress: progressBase
      });

      // 2.1 生成搜索查询
      await this.updateAgentStatus('researcher', 'active', '生成搜索查询');
      const queries = await this.researcher.generateSearchQueries(subtopic, []);
      subtopic.searchQueries = queries;

      // 2.2 执行搜索
      await this.updateAgentStatus('searcher', 'active', `搜索: ${queries[0]}`);
      const searchResults = [];
      for (const query of queries.slice(0, 3)) {
        const results = await this.searcher.search(query, 3);
        searchResults.push(...results);
      }

      // 2.3 分析发现
      await this.updateAgentStatus('researcher', 'active', '分析发现');
      const analysis = await this.researcher.analyzeFindings(searchResults, subtopic);
      analysis.searchResults = searchResults;

      allFindings.push(analysis);

      this.status.iterations.push({
        phase: 'search',
        timestamp: Date.now(),
        subtopic: subtopic.question,
        queriesCount: queries.length,
        resultsCount: searchResults.length,
        findingsCount: analysis.keyFindings?.length || 0
      });
    }

    this.status.findings = allFindings;
  }

  /**
   * 阶段 3: 分析与综合
   */
  async runPhaseAnalysis() {
    console.log('🧠 阶段 3: 综合分析');
    await this.updateStatus({
      phase: '多智能体分析中...',
      progress: 75,
      'agents.analyzer.status': 'active',
      'agents.analyzer.lastAction': '综合分析'
    });

    // 3.1 综合分析
    await this.updateAgentStatus('analyzer', 'active', '综合研究发现');
    const synthesis = await this.analyzer.synthesizeFindings(this.status.findings);
    this.status.synthesis = synthesis;

    // 3.2 提取关键指标（可选）
    if (this.status.findings.length > 3) {
      await this.updateAgentStatus('analyzer', 'active', '提取关键指标');
      const metrics = await this.analyzer.extractMetrics(this.status.findings);
      this.status.metrics = metrics;
    }

    this.status.iterations.push({
      phase: 'analysis',
      timestamp: Date.now(),
      keyThemesCount: synthesis.keyThemes?.length || 0,
      patternsCount: synthesis.patterns?.length || 0
    });
  }

  /**
   * 阶段 4: 报告生成
   */
  async runPhaseReporting() {
    console.log('📝 阶段 4: 生成报告');
    await this.updateStatus({
      phase: '多智能体生成报告...',
      progress: 90,
      'agents.reporter.status': 'active',
      'agents.reporter.lastAction': '撰写报告'
    });

    // 4.1 生成详细报告
    await this.updateAgentStatus('reporter', 'active', '生成详细报告');
    const detailedReport = await this.reporter.generateDetailedReport(
      this.topic,
      this.status.findings,
      this.status.synthesis
    );

    // 4.2 优化格式
    await this.updateAgentStatus('reporter', 'active', '优化报告格式');
    const finalReport = await this.reporter.formatReport(detailedReport);

    // 4.3 保存报告
    const reportPath = path.join(this.REPORTS_DIR, `${this.researchId}.md`);
    await fs.writeFile(reportPath, finalReport, 'utf-8');

    this.status.iterations.push({
      phase: 'reporting',
      timestamp: Date.now(),
      reportLength: finalReport.length
    });

    console.log(`📄 报告已保存: ${reportPath}`);
  }

  /**
   * 更新智能体状态
   */
  async updateAgentStatus(agent, status, action) {
    this.status.agents[agent] = {
      status,
      lastAction: action
    };
    await this.updateStatus({ [`agents.${agent}.status`]: status });
  }

  /**
   * 获取研究摘要（用于前端显示）
   */
  getSummary() {
    return {
      id: this.researchId,
      topic: this.status.topic,
      status: this.status.status,
      progress: this.status.progress,
      phase: this.status.phase,
      timestamp: this.status.timestamp,
      plan: this.status.plan,
      findings: this.status.findings,
      synthesis: this.status.synthesis,
      agents: this.status.agents,
      iterations: this.status.iterations
    };
  }
}

module.exports = Orchestrator;
