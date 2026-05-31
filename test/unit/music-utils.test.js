import {
    midiToFrequency,
    frequencyToMidi,
    midiToNoteName,
    noteNameToMidi,
    stepToTime,
    timeToStep,
    getChordNotes,
    validateNote,
    validateWork,
    serializeWork,
    deserializeWork,
    calculateNoteTiming,
    checkTrackSync,
    calculateTimingError,
    mergeTracks,
    quantizeNote,
    CHORD_NOTES,
    TOTAL_STEPS
} from '../../music-utils.js';
import { createMockWork } from '../setup.js';

describe('MIDI 转换函数', () => {
    test('midiToFrequency 应正确转换 MIDI 音符到频率', () => {
        expect(midiToFrequency(69)).toBe(440);
        expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
        expect(midiToFrequency(72)).toBeCloseTo(523.25, 1);
    });

    test('frequencyToMidi 应正确转换频率到 MIDI 音符', () => {
        expect(frequencyToMidi(440)).toBe(69);
        expect(frequencyToMidi(261.63)).toBe(60);
        expect(frequencyToMidi(523.25)).toBe(72);
    });

    test('midiToNoteName 应正确转换 MIDI 到音符名', () => {
        expect(midiToNoteName(60)).toBe('C4');
        expect(midiToNoteName(69)).toBe('A4');
        expect(midiToNoteName(72)).toBe('C5');
    });

    test('noteNameToMidi 应正确转换音符名到 MIDI', () => {
        expect(noteNameToMidi('C4')).toBe(60);
        expect(noteNameToMidi('A4')).toBe(69);
        expect(noteNameToMidi('C5')).toBe(72);
    });

    test('noteNameToMidi 对无效音符名应返回 null', () => {
        expect(noteNameToMidi('H4')).toBeNull();
        expect(noteNameToMidi('invalid')).toBeNull();
    });
});

describe('时间转换函数', () => {
    const tempo = 120;
    const stepsPerBeat = 4;

    test('stepToTime 应正确转换步数到毫秒', () => {
        const beatMs = 500;
        const stepMs = beatMs / stepsPerBeat;
        
        expect(stepToTime(0, tempo)).toBe(0);
        expect(stepToTime(4, tempo)).toBe(500);
        expect(stepToTime(1, tempo)).toBeCloseTo(125);
    });

    test('timeToStep 应正确转换毫秒到步数', () => {
        expect(timeToStep(0, tempo)).toBe(0);
        expect(timeToStep(500, tempo)).toBe(4);
        expect(timeToStep(125, tempo)).toBe(1);
    });

    test('stepToTime 和 timeToStep 往返转换应一致', () => {
        for (let step = 0; step < 16; step++) {
            const time = stepToTime(step, tempo);
            const convertedBack = timeToStep(time, tempo);
            expect(convertedBack).toBe(step);
        }
    });
});

describe('和弦函数', () => {
    test('getChordNotes 应返回正确的和弦音符', () => {
        const cMajor = getChordNotes('C', 4);
        expect(cMajor).toEqual([60, 64, 67]);
        
        const aMinor = getChordNotes('Am', 4);
        expect(aMinor).toEqual([57, 60, 64]);
    });

    test('getChordNotes 对未知和弦应返回空数组', () => {
        expect(getChordNotes('XYZ', 4)).toEqual([]);
    });

    test('getChordNotes 应支持不同八度', () => {
        const c4 = getChordNotes('C', 4);
        const c5 = getChordNotes('C', 5);
        expect(c5).toEqual(c4.map(n => n + 12));
    });
});

describe('验证函数', () => {
    test('validateNote 应正确验证音符', () => {
        expect(validateNote({ step: 0, midiNote: 60, duration: 4 })).toBe(true);
        expect(validateNote({ step: 63, midiNote: 127, duration: 1 })).toBe(true);
        
        expect(validateNote(null)).toBe(false);
        expect(validateNote({ step: -1, midiNote: 60, duration: 4 })).toBe(false);
        expect(validateNote({ step: TOTAL_STEPS, midiNote: 60, duration: 4 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: -1, duration: 4 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: 128, duration: 4 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: 60, duration: 0 })).toBe(false);
        expect(validateNote({ step: 0, midiNote: 60 })).toBe(false);
    });

    test('validateWork 应正确验证作品', () => {
        const validWork = createMockWork();
        expect(validateWork(validWork)).toBe(true);
    });

    test('validateWork 应正确识别无效作品', () => {
        expect(validateWork(null)).toBe(false);
        expect(validateWork({})).toBe(false);
        expect(validateWork(createMockWork({ name: '' }))).toBe(false);
        expect(validateWork(createMockWork({ tempo: 10 }))).toBe(false);
        expect(validateWork(createMockWork({ tempo: 301 }))).toBe(false);
        expect(validateWork(createMockWork({ notes: 'not an array' }))).toBe(false);
        expect(validateWork(createMockWork({ notes: [{ invalid: true }] }))).toBe(false);
    });
});

describe('序列化函数', () => {
    test('serializeWork 应正确序列化作品', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        expect(typeof serialized).toBe('string');
        expect(() => JSON.parse(serialized)).not.toThrow();
    });

    test('serializeWork 应正确序列化作品', () => {
        const work = createMockWork();
        const serialized = serializeWork(work);
        const deserialized = deserializeWork(serialized);
        
        expect(deserialized.name).toBe(work.name);
        expect(deserialized.tempo).toBe(work.tempo);
        expect(deserialized.notes).toEqual(work.notes);
        expect(deserialized.chords).toEqual(work.chords);
        expect(deserialized.drums).toEqual(work.drums);
    });

    test('deserializeWork 应对无效 JSON 应抛出错误', () => {
        expect(() => deserializeWork('invalid json')).toThrow();
        expect(() => deserializeWork(JSON.stringify({ invalid: true }))).toThrow();
    });
});

describe('音符时长精度测试', () => {
    const tempo = 120;

    test('calculateNoteTiming 应计算正确的开始时间', () => {
        const notes = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 2 },
            { step: 6, midiNote: 64, duration: 2 }
        ];
        
        const timing = calculateNoteTiming(notes, tempo);
        
        expect(timing[0].startTime).toBe(0);
        expect(timing[0].durationMs).toBe(500);
        expect(timing[1].startTime).toBe(500);
        expect(timing[1].durationMs).toBe(250);
        expect(timing[2].startTime).toBe(750);
        expect(timing[2].durationMs).toBe(250);
    });

    test('calculateNoteTiming 应处理不同速度', () => {
        const note = { step: 4, midiNote: 60, duration: 4 };
        
        const timing120 = calculateNoteTiming([note], 120);
        const timing60 = calculateNoteTiming([note], 60);
        
        expect(timing60[0].startTime).toBe(timing120[0].startTime * 2);
        expect(timing60[0].durationMs).toBe(timing120[0].durationMs * 2);
    });

    test('音符时长精度应在 1ms 以内', () => {
        const notes = [];
        for (let i = 0; i < 16; i++) {
            notes.push({ step: i, midiNote: 60, duration: 1 });
        }
        
        const timing = calculateNoteTiming(notes, tempo);
        const beatMs = 500;
        
        timing.forEach((t, i) => {
            const expected = i * (beatMs / 4);
            expect(t.startTime).toBe(expected);
            expect(t.durationMs).toBe(beatMs / 4);
        });
    });

    test('calculateTimingError 应计算正确的误差', () => {
        expect(calculateTimingError(500, 505)).toBe(5);
        expect(calculateTimingError(505, 500)).toBe(5);
        expect(calculateTimingError(0, 0)).toBe(0);
    });

    test('checkTrackSync 应检测同步情况', () => {
        const notes = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 }
        ];
        
        expect(checkTrackSync(notes, 120)).toBe(true);
    });

    test('checkTrackSync 应检测到不同步', () => {
        const notes = [
            { step: 0.5, midiNote: 60, duration: 4 },
            { step: 4.3, midiNote: 62, duration: 4 }
        ];
        
        expect(checkTrackSync(notes, 120, 10)).toBe(false);
    });
});

describe('多轨道合并测试', () => {
    test('mergeTracks 应正确合并轨道', () => {
        const track1 = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 }
        ];
        const track2 = [
            { step: 4, midiNote: 72, duration: 4 },
            { step: 12, midiNote: 76, duration: 4 }
        ];
        
        const merged = mergeTracks(track1, track2);
        
        expect(merged.length).toBe(4);
        expect(merged[0].step).toBe(0);
        expect(merged[1].step).toBe(4);
        expect(merged[2].step).toBe(8);
        expect(merged[3].step).toBe(12);
    });

    test('mergeTracks 应处理空轨道', () => {
        const track1 = [{ step: 0, midiNote: 60, duration: 4 }];
        const track2 = [];
        
        const merged = mergeTracks(track1, track2);
        expect(merged.length).toBe(1);
    });
});

describe('量化测试', () => {
    test('quantizeNote 应正确量化音符', () => {
        const note = { step: 1.3, midiNote: 60, duration: 3.7 };
        const quantized = quantizeNote(note, 1);
        
        expect(quantized.step).toBe(1);
        expect(quantized.duration).toBe(4);
    });

    test('quantizeNote 应支持不同网格大小', () => {
        const note = { step: 5, midiNote: 60, duration: 3 };
        const quantized = quantizeNote(note, 4);
        
        expect(quantized.step).toBe(4);
        expect(quantized.duration).toBe(4);
    });

    test('quantizeNote 不应修改原始对象', () => {
        const note = { step: 1.3, midiNote: 60, duration: 3.7 };
        const quantized = quantizeNote(note);
        
        expect(quantized).not.toBe(note);
        expect(note.step).toBe(1.3);
    });
});
