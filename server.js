const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const WORKS_DIR = path.join(__dirname, 'works');
const COMMUNITY_DIR = path.join(__dirname, 'community');

if (!fs.existsSync(WORKS_DIR)) {
    fs.mkdirSync(WORKS_DIR);
}
if (!fs.existsSync(COMMUNITY_DIR)) {
    fs.mkdirSync(COMMUNITY_DIR);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/works', (req, res) => {
    try {
        const files = fs.readdirSync(WORKS_DIR);
        const works = files.map(file => {
            const content = fs.readFileSync(path.join(WORKS_DIR, file), 'utf8');
            return JSON.parse(content);
        });
        res.json(works);
    } catch (err) {
        res.status(500).json({ error: '无法加载作品列表' });
    }
});

app.post('/api/works', (req, res) => {
    try {
        const workData = req.body;
        const filename = `${workData.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
        const filepath = path.join(WORKS_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(workData, null, 2));
        res.json({ success: true, message: '作品保存成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法保存作品' });
    }
});

app.delete('/api/works/:name', (req, res) => {
    try {
        const files = fs.readdirSync(WORKS_DIR);
        for (const file of files) {
            const content = fs.readFileSync(path.join(WORKS_DIR, file), 'utf8');
            const work = JSON.parse(content);
            if (work.name === req.params.name) {
                fs.unlinkSync(path.join(WORKS_DIR, file));
                return res.json({ success: true });
            }
        }
        res.status(404).json({ error: '作品未找到' });
    } catch (err) {
        res.status(500).json({ error: '无法删除作品' });
    }
});

app.post('/api/works/publish', (req, res) => {
    try {
        const workData = req.body;
        const filename = `public_${workData.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
        const filepath = path.join(COMMUNITY_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(workData, null, 2));
        res.json({ success: true, message: '作品发布成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法发布作品' });
    }
});

app.get('/api/works/community', (req, res) => {
    try {
        const files = fs.readdirSync(COMMUNITY_DIR);
        const works = files.map(file => {
            const content = fs.readFileSync(path.join(COMMUNITY_DIR, file), 'utf8');
            return JSON.parse(content);
        });
        
        if (req.query.sort === 'popular') {
            works.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else if (req.query.sort === 'recent') {
            works.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        res.json(works);
    } catch (err) {
        res.status(500).json({ error: '无法加载社区作品' });
    }
});

app.post('/api/works/:name/like', (req, res) => {
    try {
        const files = fs.readdirSync(COMMUNITY_DIR);
        for (const file of files) {
            const filepath = path.join(COMMUNITY_DIR, file);
            const content = fs.readFileSync(filepath, 'utf8');
            const work = JSON.parse(content);
            
            if (work.name === req.params.name) {
                work.likes = (work.likes || 0) + 1;
                fs.writeFileSync(filepath, JSON.stringify(work, null, 2));
                return res.json({ success: true, likes: work.likes });
            }
        }
        res.status(404).json({ error: '作品未找到' });
    } catch (err) {
        res.status(500).json({ error: '无法点赞作品' });
    }
});

app.post('/api/works/:name/remix', (req, res) => {
    try {
        const files = fs.readdirSync(COMMUNITY_DIR);
        for (const file of files) {
            const content = fs.readFileSync(path.join(COMMUNITY_DIR, file), 'utf8');
            const work = JSON.parse(content);
            
            if (work.name === req.params.name) {
                const remixedWork = {
                    ...req.body,
                    originalAuthor: work.author,
                    originalWork: work.name,
                    remixedAt: new Date().toISOString()
                };
                
                const filename = `remix_${remixedWork.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
                fs.writeFileSync(path.join(COMMUNITY_DIR, filename), JSON.stringify(remixedWork, null, 2));
                
                return res.json({ success: true, message: '改编作品已发布' });
            }
        }
        res.status(404).json({ error: '作品未找到' });
    } catch (err) {
        res.status(500).json({ error: '无法改编作品' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🎹 数字音乐作曲工作坊 Pro 已启动！`);
    console.log(`📡 服务器运行在 http://localhost:${PORT}`);
    console.log(`🎵 请在浏览器中打开上述地址开始创作！\n`);
});
