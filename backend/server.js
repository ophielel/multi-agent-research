const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const Orchestrator = require('./agents/orchestrator');

const app = express();
const PORT = process.env.PORT || 3000;
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// 创建报告目录
fs.mkdir(REPORTS_DIR, { recursive: true }).catch(console.error);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ==================== 配置管理 ====================

app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    const config = await fs.readFile(configPath, 'utf-8').catch(() => '{}');
    res.json(JSON.parse(config));
  } catch (error) {
    console.error('获取配置失败:', error);
    res.json({
      apiKey: '',
      apiEndpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      provider: 'openai',
      maxIterations: 5,
      searchDepth: 3
    });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    const configPath = path.join(__dirname, '..', 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ 配置已保存');
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({ success: false, message: '配置保存失败: ' + error.message });
  }
});

// ==================== 多智能体研究管理 ====================

// 存储正在运行的研究
const activeResearches = new Map();

app.post('/api/research/start', async (req, res) => {
  try {
    const { topic, config } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ success: false, message: '请输入研究主题' });
    }

    const researchId = Date.now().toString();
    console.log(`\n🚀 新研究请求: ${topic}`);

    // 创建编排器实例
    const orchestrator = new Orchestrator(researchId, topic, config);
    activeResearches.set(researchId, orchestrator);

    // 异步启动研究流程
    orchestrator.startResearch().then(() => {
      console.log(`✅ 研究 ${researchId} 完成`);
    }).catch(error => {
      console.error(`❌ 研究 ${researchId} 失败:`, error);
    });

    res.json({ success: true, researchId, message: '多智能体研究已启动，请稍候...' });
  } catch (error) {
    console.error('启动研究失败:', error);
    res.status(500).json({ success: false, message: '启动失败: ' + error.message });
  }
});

app.get('/api/research/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const statusPath = path.join(REPORTS_DIR, `${id}.status.json`);

    try {
      const status = await fs.readFile(statusPath, 'utf-8');
      const parsedStatus = JSON.parse(status);
      res.json(parsedStatus);
    } catch {
      // 如果没有状态文件，从活跃研究中查找
      const orchestrator = activeResearches.get(id);
      if (orchestrator) {
        res.json(orchestrator.getSummary());
      } else {
        res.json({ status: 'not_found', message: '未找到研究任务' });
      }
    }
  } catch (error) {
    console.error('获取状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/research/report/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reportPath = path.join(REPORTS_DIR, `${id}.md`);

    try {
      const report = await fs.readFile(reportPath, 'utf-8');
      res.json({ success: true, content: report });
    } catch {
      res.json({ success: false, message: '报告尚未生成或不存在' });
    }
  } catch (error) {
    console.error('获取报告失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/research/list', async (req, res) => {
  try {
    const files = await fs.readdir(REPORTS_DIR);
    const reports = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        const id = file.replace('.md', '');
        const statusPath = path.join(REPORTS_DIR, `${id}.status.json`);

        try {
          const status = JSON.parse(await fs.readFile(statusPath, 'utf-8'));
          reports.push({
            id,
            topic: status.topic,
            status: status.status,
            timestamp: status.timestamp,
            progress: status.progress,
            phase: status.phase,
            agents: status.agents,
            synthesis: status.synthesis
          });
        } catch {}
      }
    }

    // 按时间戳排序
    reports.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, reports });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/research/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 停止活跃的研究
    const orchestrator = activeResearches.get(id);
    if (orchestrator) {
      activeResearches.delete(id);
      console.log(`🛑 取消研究: ${id}`);
    }

    const reportPath = path.join(REPORTS_DIR, `${id}.md`);
    const statusPath = path.join(REPORTS_DIR, `${id}.status.json`);

    await fs.unlink(reportPath).catch(() => {});
    await fs.unlink(statusPath).catch(() => {});

    console.log('🗑️ 报告已删除:', id);
    res.json({ success: true, message: '报告已删除' });
  } catch (error) {
    console.error('删除报告失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 多智能体特定 API ====================

// 获取研究计划的详细视图
app.get('/api/research/plan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orchestrator = activeResearches.get(id);

    if (orchestrator && orchestrator.status.plan) {
      res.json({
        success: true,
        plan: orchestrator.status.plan,
        subtopicsCount: orchestrator.status.plan?.subtopics?.length || 0
      });
    } else {
      res.json({ success: false, message: '研究计划不可用' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取研究发现
app.get('/api/research/findings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orchestrator = activeResearches.get(id);

    if (orchestrator) {
      res.json({
        success: true,
        findings: orchestrator.status.findings,
        count: orchestrator.status.findings.length
      });
    } else {
      res.json({ success: false, message: '发现不可用' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取综合分析
app.get('/api/research/synthesis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orchestrator = activeResearches.get(id);

    if (orchestrator && orchestrator.status.synthesis) {
      res.json({
        success: true,
        synthesis: orchestrator.status.synthesis
      });
    } else {
      res.json({ success: false, message: '综合分析不可用' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 服务器启动 ====================

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  多智能体协作研究系统`);
  console.log(`${'='.repeat(50)}`);
  console.log(`\n🚀 服务器运行中: http://localhost:${PORT}`);
  console.log(`\n💡 架构: 多智能体协作`);
  console.log(`   ├─ 编排器: 协调所有智能体`);
  console.log(`   ├─ 研究员: 制定计划、分析发现`);
  console.log(`   ├─ 搜索员: 执行网络搜索`);
  console.log(`   ├─ 分析员: 综合分析、提取洞察`);
  console.log(`   └─ 报告员: 撰写研究报告`);
  console.log(`${'='.repeat(50)}\n`);
});
