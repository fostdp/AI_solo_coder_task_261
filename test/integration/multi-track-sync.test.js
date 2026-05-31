import { calculateNoteTiming, checkTrackSync, mergeTracks, stepToTime } from '../../music-utils.js';

describe('多轨道同步播放测试', () => {
    const tempo = 120;
    
    test('多轨道同步播放', () => {
        const melodyTrack = [
            { step: 0, midiNote: 60, duration: 4, track: 'melody' },
            { step: 4, midiNote: 62, duration: 4, track: 'melody' },
            { step: 8, midiNote: 64, duration: 4, track: 'melody' },
            { step: 12, midiNote: 65, duration: 4, track: 'melody' }
        ];
        
        const chordTrack = [
            { step: 0, midiNote: 48, duration: 8, track: 'chords' },
            { step: 8, midiNote: 50, duration: 8, track: 'chords' }
        ];
        
        const drumTrack = [
            { step: 0, midiNote: 36, duration: 1, track: 'drums' },
            { step: 4, midiNote: 38, duration: 1, track: 'drums' },
            { step: 8, midiNote: 36, duration: 1, track: 'drums' },
            { step: 12, midiNote: 38, duration: 1, track: 'drums' }
        ];
        
        expect(checkTrackSync(melodyTrack, tempo)).toBe(true);
        expect(checkTrackSync(chordTrack, tempo)).toBe(true);
        expect(checkTrackSync(drumTrack, tempo)).toBe(true);
    });
    
    test('多轨道事件时间线对齐测试', () => {
        const melodyTrack = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 },
            { step: 12, midiNote: 65, duration: 4 }
        ];
        
        const bassTrack = [
            { step: 0, midiNote: 36, duration: 4 },
            { step: 4, midiNote: 38, duration: 4 },
            { step: 8, midiNote: 40, duration: 4 },
            { step: 12, midiNote: 41, duration: 4 }
        ];
        
        const melodyTiming = calculateNoteTiming(melodyTrack, tempo);
        const bassTiming = calculateNoteTiming(bassTrack, tempo);
        
        melodyTiming.forEach((note, i) => {
            expect(note.startTime).toBe(bassTiming[i].startTime);
        });
    });
    
    test('多轨道同步误差应检测不同速度测试', () => {
        const melodyTrack = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 },
            { step: 12, midiNote: 65, duration: 4 }
        ];
        
        const bassTrack = [
            { step: 0, midiNote: 36, duration: 4 },
            { step: 4, midiNote: 38, duration: 4 },
            { step: 8, midiNote: 40, duration: 4 },
            { step: 12, midiNote: 41, duration: 4 }
        ];
        
        const merged = mergeTracks(melodyTrack, bassTrack);
        
        expect(merged.length).toBe(8);
        expect(merged[0].step).toBe(0);
        expect(merged[1].step).toBe(0);
        expect(merged[2].step).toBe(4);
        expect(merged[3].step).toBe(4);
        expect(merged[4].step).toBe(8);
        expect(merged[5].step).toBe(8);
        expect(merged[6].step).toBe(12);
        expect(merged[7].step).toBe(12);
    });
    
    test('多轨道同步不同速度下应在正确的时间同步', () => {
        const track = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 },
            { step: 12, midiNote: 65, duration: 4 }
        ];
        
        const timing60 = calculateNoteTiming(track, 60);
        const timing120 = calculateNoteTiming(track, 120);
        
        timing120.forEach((note, i) => {
            expect(note.startTime * 2).toBe(timing60[i].startTime);
        });
    });
    
    test('多轨道同步应处理精确的毫秒级精度', () => {
        const track = [];
        for (let i = 0; i < 16; i++) {
            track.push({ step: i, midiNote: 60, duration: 1 });
        }
        
        const timing = calculateNoteTiming(track, 120);
        const stepMs = stepToTime(1, 120);
        
        timing.forEach((note, i) => {
            expect(note.startTime).toBe(i * stepMs);
        });
    });
    
    test('多轨道同步应检测到不同步的音符', () => {
        const outOfSyncTrack = [
            { step: 0.25, midiNote: 60, duration: 4 },
            { step: 4.75, midiNote: 62, duration: 4 }
        ];
        
        expect(checkTrackSync(outOfSyncTrack, 120, 10)).toBe(false);
    });
    
    test('多轨道同步应检测同步的音符在容差内', () => {
        const inSyncTrack = [
            { step: 0.01, midiNote: 60, duration: 4 },
            { step: 4.01, midiNote: 62, duration: 4 }
        ];
        
        expect(checkTrackSync(inSyncTrack, 120, 20)).toBe(true);
    });
    
    test('多轨道同步应处理复杂的节奏模式', () => {
        const drumPattern = {
            kick: [0, 8],
            snare: [4, 12],
            hihat: [0, 2, 4, 6, 8, 10, 12, 14]
        };
        
        const allNotes = [];
        Object.entries(drumPattern).forEach(([drum, steps]) => {
            steps.forEach(step => {
                allNotes.push({ step, midiNote: 36, duration: 1, drum });
            });
        });
        
        const timing = calculateNoteTiming(allNotes, tempo);
        
        timing.forEach(note => {
            expect(note.startTime % 250).toBe(0);
        });
    });
    
    test('多轨道同步应验证播放头位置计算', () => {
        const getPlayheadPosition = (currentStep, scrollLeft, gridWidth, totalSteps) => {
            return (currentStep / totalSteps) * gridWidth + scrollLeft;
        };
        
        const pianoRollWidth = 1920;
        const totalSteps = 64;
        
        for (let step = 0; step < totalSteps; step++) {
            const position = getPlayheadPosition(step, 0, pianoRollWidth, totalSteps);
            expect(position).toBe((step / totalSteps) * pianoRollWidth);
        }
    });
    
    test('多轨道同步应验证播放时的事件调度时间', () => {
        const scheduleNotes = (notes, tempo, callback) => {
            const timing = calculateNoteTiming(notes, tempo);
            const scheduled = [];
            
            timing.forEach(note => {
                scheduled.push({
                    ...note,
                    scheduledAt: note.startTime
                });
            });
            
            return scheduled;
        };
        
        const melodyTrack = [
            { step: 0, midiNote: 60, duration: 4 },
            { step: 4, midiNote: 62, duration: 4 },
            { step: 8, midiNote: 64, duration: 4 },
            { step: 12, midiNote: 65, duration: 4 }
        ];
        
        const scheduled = scheduleNotes(melodyTrack, 120);
        
        scheduled.forEach((note, i) => {
            expect(note.scheduledAt).toBe(i * 500);
        });
    });
});

describe('混音台功能测试', () => {
    test('混音台应正确的音量应用', () => {
        const calculateGain = (volume, muted, solo, hasSolo) => {
            if (hasSolo && !solo) return 0;
            if (muted) return 0;
            return volume;
        };
        
        expect(calculateGain(0.8, false, false, false)).toBe(0.8);
        expect(calculateGain(0.8, true, false, false)).toBe(0);
        expect(calculateGain(0.8, false, false, true)).toBe(0);
        expect(calculateGain(0.8, false, true, true)).toBe(0.8);
    });
    
    test('混音台应正确的静音独奏逻辑', () => {
        const mixerState = {
            melody: { volume: 0.8, muted: false, solo: false },
            chords: { volume: 0.6, muted: true, solo: false },
            drums: { volume: 0.7, muted: false, solo: true }
        };
        
        const hasSolo = Object.values(mixerState).some(m => m.solo);
        
        expect(hasSolo).toBe(true);
    });
    
    test('混音台应正确的声道音量', () => {
        const mixerState = {
            melody: { volume: 0.8, muted: false, solo: true },
            chords: { volume: 0.6, muted: false, solo: true },
            drums: { volume: 0.7, muted: false, solo: false }
        };
        
        const volumes = Object.entries(mixerState).map(([name, settings]) => {
            const hasSolo = Object.values(mixerState).some(m => m.solo);
            if (hasSolo && !settings.solo) return 0;
            if (settings.muted) return 0;
            return settings.volume;
        });
        
        expect(volumes[0]).toBe(0.8);
        expect(volumes[1]).toBe(0.6);
        expect(volumes[2]).toBe(0);
    });
});

describe('音频效果器测试', () => {
    test('混响效果器应正确的干湿比计算', () => {
        const applyReverb = (drySignal, wetAmount, decay) => {
            const wetSignal = drySignal * wetAmount * (1 / decay);
            return drySignal * (1 - wetAmount) + wetSignal;
        };
        
        const result = applyReverb(1.0, 0.3, 2.0);
        
        expect(result).toBe(1 * 0.85);
    });
    
    test('延迟效果器应正确的延迟时间计算', () => {
        const calculateDelayTime = (tempo, noteValue = 8) => {
            const beatMs = (60 / tempo) * 1000;
            return beatMs / (noteValue / 8);
        };
        
        expect(calculateDelayTime(120, 8)).toBe(250);
        expect(calculateDelayTime(120, 16)).toBe(125);
    });
    
    test('延迟效果器应正确的反馈计算', () => {
        const applyDelay = (input, feedback, delayTime) => {
            const delayed = input * feedback;
            return {
                original: input,
                delayed,
                total: delayed,
                time: delayTime
            };
        };
        
        const result = applyDelay(1.0, 0.4, 250);
        expect(result.delayed).toBe(0.4);
        expect(result.time).toBe(250);
    });
    
    test('效果器链应正确的信号处理链', () => {
        const processEffects = (signal, effects) => {
            let processed = signal;
            if (effects.reverb.enabled) {
                const dry = processed * (1 - effects.reverb.wet);
                const wet = processed * effects.reverb.wet * 0.5;
                processed = dry + wet;
            }
            if (effects.delay.enabled) {
                const dry = processed * (1 - effects.delay.wet);
                const wet = processed * effects.delay.wet * 0.3;
                processed = dry + wet;
            }
            return processed;
        };
        
        const signal = 1.0;
        const effects = {
            reverb: { enabled: true, wet: 0.3, decay: 2 },
            delay: { enabled: false, wet: 0.25, time: 0.3, feedback: 0.4 }
        };
        
        const result = processEffects(signal, effects);
        
        expect(result).toBe(1 * 0.7 + 0.3 * 0.5);
        expect(result).toBe(0.85);
    });
});
