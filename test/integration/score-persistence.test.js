import { serializeWork, deserializeWork, validateWork, validateNote } from '../../music-utils.js';
import { createMockWork } from '../setup.js';

describe('乐谱数据结构测试', () => {
    test('乐谱数据结构应包含所有必要字段', () => {
        const work = createMockWork();
        
        expect(work).toHaveProperty('name');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('tempo');
        expect(work).toHaveProperty('timeSignature');
        expect(work).toHaveProperty('keySignature');
        expect(work).toHaveProperty('notes');
        expect(work).toHaveProperty('chords');
        expect(work).toHaveProperty('drums');
        expect(work).toHaveProperty('mixer');
        expect(work).toHaveProperty('effects');
        expect(work).toHaveProperty('author');
        expect(work).toHaveProperty('createdAt');
    });
    
    test('音符数据结构应包含所有必要字段', () => {
        const note = { step: 0, midiNote: 60, duration: 4 };
        
        expect(note).toHaveProperty('step');
        expect(note).toHaveProperty('midiNote');
        expect(note).toHaveProperty('duration');
    });
    
    test('鼓点数据结构应包含所有必要字段', () => {
        const drums = {
            kick: [0, 8],
            snare: [4, 12],
            hihat: [0, 2, 4, 6, 8, 10, 12, 14],
            tom: []
        };
        
        expect(drums).toHaveProperty('kick');
        expect(drums).toHaveProperty('snare');
        expect(drums).toHaveProperty('hihat');
        expect(drums).toHaveProperty('tom');
    });
});

describe('乐谱序列化测试', () => {
    test('serializeWork 应正确序列化作品', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        
        expect(typeof serialized).toBe('string');
        expect(() => JSON.parse(serialized)).not.toThrow();
    });
    
    test('serializeWork 应保持所有数据完整性', () => {
        const work = createMockWork({
            name: 'Test Melody',
            description: 'A test melody for unit testing'
        });
        
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.name).toBe(work.name);
        expect(deserialized.description).toBe(work.description);
        expect(deserialized.tempo).toBe(work.tempo);
        expect(deserialized.timeSignature).toBe(work.timeSignature);
        expect(deserialized.keySignature).toBe(work.keySignature);
        expect(deserialized.author).toBe(work.author);
    });
    
    test('serializeWork 应正确序列化音符数据', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.notes.length).toBe(work.notes.length);
        deserialized.notes.forEach((note, i) => {
            expect(note.step).toBe(work.notes[i].step);
            expect(note.midiNote).toBe(work.notes[i].midiNote);
            expect(note.duration).toBe(work.notes[i].duration);
        });
    });
    
    test('serializeWork 应正确序列化和弦数据', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.chords).toEqual(work.chords);
    });
    
    test('serializeWork 应正确序列化鼓点数据', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.drums).toEqual(work.drums);
    });
    
    test('serializeWork 应正确序列化混音台数据', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.mixer).toEqual(work.mixer);
    });
    
    test('serializeWork 应正确序列化效果器数据', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.effects).toEqual(work.effects);
    });
});

describe('乐谱反序列化测试', () => {
    test('deserializeWork 应正确解析作品', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(validateWork(deserialized)).toBe(true);
    });
    
    test('deserializeWork 应对无效 JSON 应抛出错误', () => {
        expect(() => deserializeWork('invalid json')).toThrow();
        expect(() => deserializeWork(JSON.stringify({ invalid: true }))).toThrow();
    });
    
    test('deserializeWork 应正确处理空作品', () => {
        const emptyWork = createMockWork({
            name: 'Empty',
            description: '',
            notes: [],
            chords: [],
            drums: { kick: [], snare: [], hihat: [], tom: [] }
        });
        
        const serialized = serializeWork(emptyWork);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.notes.length).toBe(0);
        expect(deserialized.chords.length).toBe(0);
    });
});

describe('乐谱数据验证测试', () => {
    test('validateWork 应正确验证有效作品', () => {
        const validWork = createMockWork();
        expect(validateWork(validWork)).toBe(true);
    });
    
    test('validateWork 应正确识别无效作品', () => {
        expect(validateWork(null)).toBe(false);
        expect(validateWork(undefined)).toBe(false);
        expect(validateWork({})).toBe(false);
        expect(validateWork(createMockWork({ name: '' }))).toBe(false);
        expect(validateWork(createMockWork({ tempo: 10 }))).toBe(false);
        expect(validateWork(createMockWork({ tempo: 301 }))).toBe(false);
        expect(validateWork(createMockWork({ notes: 'not an array' }))).toBe(false);
        expect(validateWork(createMockWork({ notes: [{ invalid: true }] }))).toBe(false);
    });
    
    test('validateNote 应正确验证音符', () => {
        expect(validateNote({ step: 0, midiNote: 60, duration: 4 })).toBe(true);
        expect(validateNote({ step: 63, midiNote: 127, duration: 1 })).toBe(true);
        
        expect(validateNote(null)).toBe(false);
        expect(validateNote({ step: -1, midiNote: 60, duration: 4 })).toBe(false);
        expect(validateNote({ step: 64, midiNote: 60, duration: 4 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: -1, duration: 4 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: 128, duration: 4 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: 60, duration: 0 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: 60 })).toBe(false);
    });
});

describe('乐谱版本兼容性测试', () => {
    test('作品应向后兼容旧版本', () => {
        const oldFormat = {
            name: 'Old',
            tempo: 120,
            notes: [{ step: 0, midiNote: 60, duration: 4 }]
        };
        
        const normalized = normalizeWork(oldFormat);
        expect(normalized.description).toBe('');
        expect(normalized.timeSignature).toBe('4/4');
        expect(normalized.keySignature).toBe('C');
        expect(normalized.chords).toEqual([]);
        expect(normalized).toHaveProperty('drums');
        expect(normalized).toHaveProperty('mixer');
        expect(normalized).toHaveProperty('effects');
    });
    
    test('作品应正确处理缺失字段', () => {
        const minimalWork = {
            name: 'Minimal',
            tempo: 120,
            notes: []
        };
        
        const normalized = normalizeWork(minimalWork);
        expect(validateWork(normalized)).toBe(true);
    });
});

function normalizeWork(work) {
    return {
        name: work.name || '',
        description: work.description || '',
        tempo: work.tempo || 120,
        timeSignature: work.timeSignature || '4/4',
        keySignature: work.keySignature || 'C',
        notes: work.notes || [],
        chords: work.chords || [],
        drums: work.drums || { kick: [], snare: [], hihat: [], tom: [] },
        mixer: work.mixer || {
            melody: { volume: 0.8, muted: false, solo: false },
            chords: { volume: 0.6, muted: false, solo: false },
            drums: { volume: 0.7, muted: false, solo: false }
        },
        effects: work.effects || {
            reverb: { enabled: false, wet: 0.3, decay: 2 },
            delay: { enabled: false, wet: 0.25, time: 0.3, feedback: 0.4 }
        },
        author: work.author || 'Anonymous',
        createdAt: work.createdAt || new Date().toISOString()
    };
}

describe('乐谱存储测试', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    
    test('作品应正确保存到本地存储', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        localStorage.setItem('work_test', serialized);
        
        const retrieved = localStorage.getItem('work_test');
        expect(retrieved).toBe(serialized);
    });
    
    test('作品应正确从本地存储加载', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        localStorage.setItem('work_test', serialized);
        
        const retrieved = localStorage.getItem('work_test');
        const deserialized = deserializeWork(retrieved);
        
        expect(deserialized.name).toBe(work.name);
        expect(deserialized.tempo).toBe(work.tempo);
        expect(deserialized.notes).toEqual(work.notes);
    });
    
    test('应正确列出所有保存的作品', () => {
        for (let i = 1; i <= 3; i++) {
            const work = createMockWork({ name: `Work ${i}` });
            localStorage.setItem(`work_work_${i}`, serializeWork(work));
        }
        
        const keys = Object.keys(localStorage);
        expect(keys.length).toBe(3);
    });
    
    test('应正确删除作品', () => {
        const work = createMockWork();
        localStorage.setItem('work_test', serializeWork(work));
        
        expect(localStorage.getItem('work_test')).not.toBeNull();
        
        localStorage.removeItem('work_test');
        
        expect(localStorage.getItem('work_test')).toBeNull();
    });
});

describe('乐谱导出导入测试', () => {
    test('作品应正确导出 JSON 字符串', () => {
        const work = createMockWork();
        const json = serializeWork(work);
        
        expect(typeof json).toBe('string');
        expect(() => JSON.parse(json)).not.toThrow();
    });
    
    test('作品应正确从 JSON 字符串导入', () => {
        const work = createMockWork();
        const json = serializeWork(work);
        const imported = deserializeWork(json);
        
        expect(imported.name).toBe(work.name);
        expect(imported.tempo).toBe(work.tempo);
        expect(imported.notes).toEqual(work.notes);
    });
    
    test('作品应正确导出 Blob 对象', () => {
        const work = createMockWork();
        const json = serializeWork(work);
        const blob = new Blob([json], { type: 'application/json' });
        
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');
    });
});

describe('乐谱数据完整性测试', () => {
    test('作品应正确计算音符数据完整性', () => {
        const work = createMockWork();
        const serialized1 = serializeWork(work);
        const serialized2 = serializeWork(work);
        
        expect(serialized1).toBe(serialized2);
    });
    
    test('作品应正确计算不同作品应不同', () => {
        const work1 = createMockWork({ name: 'Work 1' });
        const work2 = createMockWork({ name: 'Work 2' });
        
        const serialized1 = serializeWork(work1);
        const serialized2 = serializeWork(work2);
        
        expect(serialized1).not.toBe(serialized2);
    });
    
    test('作品应正确计算作品大小', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const size = new Blob([serialized]).size;
        
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThan(1024 * 1024);
    });
});

describe('乐谱数据迁移测试', () => {
    test('作品应正确迁移数据格式', () => {
        const oldFormat = {
            songName: 'Old Song',
            bpm: 120,
            melody: [{ position: 0, note: 60, length: 4 }],
            created_at: '2024-01-01'
        };
        
        const migrated = migrateFromV1(oldFormat);
        
        expect(migrated.name).toBe('Old Song');
        expect(migrated.tempo).toBe(120);
        expect(migrated.notes).toHaveLength(1);
        expect(migrated.notes[0].step).toBe(0);
        expect(migrated.notes[0].midiNote).toBe(60);
        expect(migrated.notes[0].duration).toBe(4);
    });
    
    test('作品应正确检测数据版本', () => {
        const work = createMockWork();
        
        expect(getDataVersion(work)).toBe('2.0');
    });
});

function migrateFromV1(oldFormat) {
    return {
        name: oldFormat.songName,
        description: '',
        tempo: oldFormat.bpm,
        timeSignature: '4/4',
        keySignature: 'C',
        notes: oldFormat.melody.map(m => ({
            step: m.position,
            midiNote: m.note,
            duration: m.length
        })),
        chords: [],
        drums: { kick: [], snare: [], hihat: [], tom: [] },
        mixer: {
            melody: { volume: 0.8, muted: false, solo: false },
            chords: { volume: 0.6, muted: false, solo: false },
            drums: { volume: 0.7, muted: false, solo: false }
        },
        effects: {
            reverb: { enabled: false, wet: 0.3, decay: 2 },
            delay: { enabled: false, wet: 0.25, time: 0.3, feedback: 0.4 }
        },
        author: 'Anonymous',
        createdAt: oldFormat.created_at || new Date().toISOString()
    };
}

function getDataVersion(work) {
    if (work.timeSignature && work.mixer) return '2.0';
    if (work.notes) return '1.0';
    return '0.9';
}
