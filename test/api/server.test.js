import request from 'supertest';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const TEST_WORKS_DIR = path.join(__dirname, '../../test-works');
const TEST_COMMUNITY_DIR = path.join(__dirname, '../../test-community');

beforeAll(() => {
    if (!fs.existsSync(TEST_WORKS_DIR)) fs.mkdirSync(TEST_WORKS_DIR, { recursive: true });
    if (!fs.existsSync(TEST_COMMUNITY_DIR)) fs.mkdirSync(TEST_COMMUNITY_DIR, { recursive: true });
});

afterAll(() => {
    if (fs.existsSync(TEST_WORKS_DIR)) fs.rmSync(TEST_WORKS_DIR, { recursive: true, force: true });
    if (fs.existsSync(TEST_COMMUNITY_DIR)) fs.rmSync(TEST_COMMUNITY_DIR, { recursive: true, force: true });
});

beforeEach(() => {
    fs.readdirSync(TEST_WORKS_DIR).forEach(f => fs.unlinkSync(path.join(TEST_WORKS_DIR, f)));
    fs.readdirSync(TEST_COMMUNITY_DIR).forEach(f => fs.unlinkSync(path.join(TEST_COMMUNITY_DIR, f)));
});

app.use(cors());
app.use(express.json());

app.get('/api/works', (req, res) => {
    try {
        const files = fs.readdirSync(TEST_WORKS_DIR);
        const works = files.map(file => {
            const content = fs.readFileSync(path.join(TEST_WORKS_DIR, file), 'utf8');
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
        const filepath = path.join(TEST_WORKS_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(workData, null, 2));
        res.json({ success: true, message: '作品保存成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法保存作品' });
    }
});

app.delete('/api/works/:name', (req, res) => {
    try {
        const files = fs.readdirSync(TEST_WORKS_DIR);
        for (const file of files) {
            const content = fs.readFileSync(path.join(TEST_WORKS_DIR, file), 'utf8');
            const work = JSON.parse(content);
            if (work.name === req.params.name) {
                fs.unlinkSync(path.join(TEST_WORKS_DIR, file));
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
        const filepath = path.join(TEST_COMMUNITY_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(workData, null, 2));
        res.json({ success: true, message: '作品发布成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法发布作品' });
    }
});

app.get('/api/works/community', (req, res) => {
    try {
        const files = fs.readdirSync(TEST_COMMUNITY_DIR);
        const works = files.map(file => {
            const content = fs.readFileSync(path.join(TEST_COMMUNITY_DIR, file), 'utf8');
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
        const files = fs.readdirSync(TEST_COMMUNITY_DIR);
        for (const file of files) {
            const filepath = path.join(TEST_COMMUNITY_DIR, file);
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

function createTestWork(overrides = {}) {
    return {
        name: 'Test Work',
        description: 'A test work',
        tempo: 120,
        timeSignature: '4/4',
        keySignature: 'C',
        notes: [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 },
            { step: 12, midiNote: 65, duration: 4 }
        ],
        chords: ['C', 'Am', 'F', 'G'],
        drums: {
            kick: [0, 8],
            snare: [4, 12],
            hihat: [0, 2, 4, 6, 8, 10, 12, 14],
            tom: []
        },
        mixer: {
            melody: { volume: 0.8, muted: false, solo: false },
            chords: { volume: 0.6, muted: false, solo: false },
            drums: { volume: 0.7, muted: false, solo: false }
        },
        effects: {
            reverb: { enabled: false, wet: 0.3, decay: 2 },
            delay: { enabled: false, wet: 0.25, time: 0.3, feedback: 0.4 }
        },
        author: 'Test Author',
        createdAt: new Date().toISOString(),
        ...overrides
    };
}

describe('作品 API 测试', () => {
    test('GET /api/works 应返回作品列表', async () => {
        const work = createTestWork();
        const filename = `test_work_${Date.now()}.json`;
        fs.writeFileSync(path.join(TEST_WORKS_DIR, filename), JSON.stringify(work));
        
        const response = await request(app).get('/api/works');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
    });
    
    test('GET /api/works 应在空目录返回空数组', async () => {
        const response = await request(app).get('/api/works');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual([]);
    });
    
    test('POST /api/works 应正确保存作品', async () => {
        const work = createTestWork();
        const response = await request(app).post('/api/works').send(work);
        
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        
        const files = fs.readdirSync(TEST_WORKS_DIR);
        expect(files.length).toBe(1);
    });
    
    test('POST /api/works 应对无效数据返回错误', async () => {
        const response = await request(app).post('/api/works').send({ invalid: true });
        
        expect(response.statusCode).toBe(500);
    });
    
    test('DELETE /api/works/:name 应正确删除作品', async () => {
        const work = createTestWork();
        const filename = `test_work_${Date.now()}.json`;
        fs.writeFileSync(path.join(TEST_WORKS_DIR, filename), JSON.stringify(work));
        
        const response = await request(app).delete(`/api/works/${work.name}`);
        
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        
        const files = fs.readdirSync(TEST_WORKS_DIR);
        expect(files.length).toBe(0);
    });
    
    test('DELETE /api/works/:name 应对不存在的作品返回404', async () => {
        const response = await request(app).delete('/api/works/NonExistentWork');
        
        expect(response.statusCode).toBe(404);
    });
});

describe('社区 API 测试', () => {
    test('POST /api/works/publish 应正确发布作品', async () => {
        const work = createTestWork();
        const response = await request(app).post('/api/works/publish').send(work);
        
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        
        const files = fs.readdirSync(TEST_COMMUNITY_DIR);
        expect(files.length).toBe(1);
    });
    
    test('GET /api/works/community 应返回社区作品列表', async () => {
        const work = createTestWork();
        const filename = `public_test_work_${Date.now()}.json`;
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, filename), JSON.stringify(work));
        
        const response = await request(app).get('/api/works/community');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
    });
    
    test('GET /api/works/community?sort=popular 应按点赞排序', async () => {
        const work1 = createTestWork({ name: 'Work 1', likes: 10 });
        const work2 = createTestWork({ name: 'Work 2', likes: 50 });
        const work3 = createTestWork({ name: 'Work 3', likes: 30 });
        
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, `work1_${Date.now()}.json`), JSON.stringify(work1));
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, `work2_${Date.now()}.json`), JSON.stringify(work2));
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, `work3_${Date.now()}.json`), JSON.stringify(work3));
        
        const response = await request(app).get('/api/works/community?sort=popular');
        
        expect(response.statusCode).toBe(200);
        expect(response.body[0].name).toBe('Work 2');
        expect(response.body[1].name).toBe('Work 3');
        expect(response.body[2].name).toBe('Work 1');
    });
    
    test('GET /api/works/community?sort=recent 应按时间排序', async () => {
        const work1 = createTestWork({ name: 'Work 1', createdAt: '2024-01-01' });
        const work2 = createTestWork({ name: 'Work 2', createdAt: '2024-01-15' });
        
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, `work1_${Date.now()}.json`), JSON.stringify(work1));
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, `work2_${Date.now()}.json`), JSON.stringify(work2));
        
        const response = await request(app).get('/api/works/community?sort=recent');
        
        expect(response.statusCode).toBe(200);
        expect(response.body[0].name).toBe('Work 2');
        expect(response.body[1].name).toBe('Work 1');
    });
    
    test('POST /api/works/:name/like 应正确点赞作品', async () => {
        const work = createTestWork({ likes: 5 });
        const filename = `public_test_work_${Date.now()}.json`;
        fs.writeFileSync(path.join(TEST_COMMUNITY_DIR, filename), JSON.stringify(work));
        
        const response = await request(app).post(`/api/works/${work.name}/like`);
        
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.likes).toBe(6);
    });
    
    test('POST /api/works/:name/like 应对不存在的作品返回404', async () => {
        const response = await request(app).post('/api/works/NonExistentWork/like');
        
        expect(response.statusCode).toBe(404);
    });
});

describe('作品数据完整性测试', () => {
    test('保存的作品应保持所有数据', async () => {
        const work = createTestWork({
            name: 'Data Integrity Test',
            description: 'Testing data integrity',
            tempo: 140,
            timeSignature: '3/4',
            keySignature: 'G',
            notes: [
                { step: 0, midiNote: 60, duration: 4 },
                { step: 4, midiNote: 62, duration: 4 }
            ]
        });
        
        await request(app).post('/api/works').send(work);
        
        const response = await request(app).get('/api/works');
        const savedWork = response.body[0];
        
        expect(savedWork.name).toBe(work.name);
        expect(savedWork.description).toBe(work.description);
        expect(savedWork.tempo).toBe(work.tempo);
        expect(savedWork.timeSignature).toBe(work.timeSignature);
        expect(savedWork.keySignature).toBe(work.keySignature);
        expect(savedWork.notes).toEqual(work.notes);
        expect(savedWork.chords).toEqual(work.chords);
        expect(savedWork.drums).toEqual(work.drums);
        expect(savedWork.mixer).toEqual(work.mixer);
        expect(savedWork.effects).toEqual(work.effects);
        expect(savedWork.author).toBe(work.author);
    });
    
    test('保存的作品应包含创建时间', async () => {
        const work = createTestWork();
        
        await request(app).post('/api/works').send(work);
        
        const response = await request(app).get('/api/works');
        const savedWork = response.body[0];
        
        expect(savedWork.createdAt).toBeDefined();
        expect(new Date(savedWork.createdAt).toString()).not.toBe('Invalid Date');
    });
});

describe('错误处理测试', () => {
    test('应对无效 JSON 返回错误', async () => {
        const response = await request(app).post('/api/works').send('invalid json');
        
        expect(response.statusCode).toBe(500);
    });
    
    test('应对空数据返回错误', async () => {
        const response = await request(app).post('/api/works').send({});
        
        expect(response.statusCode).toBe(500);
    });
});

describe('并发测试', () => {
    test('应正确处理多个并发请求', async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            const work = createTestWork({ name: `Work ${i}` });
            promises.push(request(app).post('/api/works').send(work));
        }
        
        const responses = await Promise.all(promises);
        
        responses.forEach(response => {
            expect(response.statusCode).toBe(200);
        });
        
        const files = fs.readdirSync(TEST_WORKS_DIR);
        expect(files.length).toBe(10);
    });
});
