const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const DeepResearch = require('./deepResearch');

const app = express();
const PORT = process.env.PORT || 3000;
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// 创建报告目录
fs.mkdir(REPORTS_DIR, { recursive: true }).catch(console.error);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 获取当前配置
app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    const config = await fs.readFile(configPath, 'utf-8').catch(() => '{}');
    res.json(JSON.parse(config));
  } catch (error) {
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

// 保存配置
app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    const configPath = path.join(__dirname, '..', 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '配置保存失败: ' + error.message });
  }
});

// 开始深度研究
app.post('/api/research/start', async (req, res) => {
  try {
    const { topic, config } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ success: false, message: '请输入研究主题' });
    }

    // 异步执行研究
    const researchId = Date.now().toString();
    const research = new DeepResearch(researchId, topic, config);

    research.start().then(result => {
      console.log(`研究完成: ${researchId}`);
    }).catch(error => {
      console.error(`研究失败: ${researchId}`, error);
    });

    res.json({ success: true, researchId, message: '研究已开始，请稍候...' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取研究状态
app.get('/api/research/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const statusPath = path.join(REPORTS_DIR, `${id}.status.json`);

    try {
      const status = await fs.readFile(statusPath, 'utf-8');
      res.json(JSON.parse(status));
    } catch {
      res.json({ status: 'not_found', message: '未找到研究任务' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取研究报告
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取所有研究报告列表
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
            progress: status.progress
          });
        } catch {}
      }
    }

    reports.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除研究报告
app.delete('/api/research/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reportPath = path.join(REPORTS_DIR, `${id}.md`);
    const statusPath = path.join(REPORTS_DIR, `${id}.status.json`);

    await fs.unlink(reportPath).catch(() => {});
    await fs.unlink(statusPath).catch(() => {});

    res.json({ success: true, message: '报告已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n=== Deep Research Launcher ===`);
  console.log(`服务器运行中: http://localhost:${PORT}`);
  console.log(`\n请在浏览器中打开上述地址使用`);
});
