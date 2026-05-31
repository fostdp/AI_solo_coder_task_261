import { createMockMIDIMessage } from '../setup.js';

describe('MIDI 信号映射', () => {
    let audioEngine;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('MIDI NOTE ON 命令应正确识别', () => {
        const noteOnMessage = createMockMIDIMessage(144, 60, 100);
        const command = noteOnMessage.data[0];
        const note = noteOnMessage.data[1];
        const velocity = noteOnMessage.data[2];
        
        expect(command).toBe(144);
        expect(note).toBe(60);
        expect(velocity).toBe(100);
    });

    test('MIDI NOTE OFF 命令应正确识别', () => {
        const noteOffMessage = createMockMIDIMessage(128, 60, 0);
        const command = noteOffMessage.data[0];
        const note = noteOffMessage.data[1];
        const velocity = noteOffMessage.data[2];
        
        expect(command).toBe(128);
        expect(note).toBe(60);
        expect(velocity).toBe(0);
    });

    test('MIDI 音符应正确映射到频率', () => {
        const noteMappings = [
            { midi: 60, note: 'C4', freq: 261.63 },
            { midi: 62, note: 'D4', freq: 293.66 },
            { midi: 64, note: 'E4', freq: 329.63 },
            { midi: 65, note: 'F4', freq: 349.23 },
            { midi: 67, note: 'G4', freq: 392.00 },
            { midi: 69, note: 'A4', freq: 440.00 },
            { midi: 71, note: 'B4', freq: 493.88 },
            { midi: 72, note: 'C5', freq: 523.25 }
        ];
        
        noteMappings.forEach(({ midi, freq }) => {
            const calculated = 440 * Math.pow(2, (midi - 69) / 12);
            expect(calculated).toBeCloseTo(freq, 1);
        });
    });

    test('MIDI 力度应正确映射到音量', () => {
        const velocityToVolume = (velocity) => {
            return Math.min(1, Math.max(0, velocity / 127));
        };
        
        expect(velocityToVolume(0)).toBe(0);
        expect(velocityToVolume(64)).toBeCloseTo(0.5, 1);
        expect(velocityToVolume(127)).toBe(1);
    });

    test('MIDI 八度应正确计算', () => {
        const getOctave = (midiNote) => {
            return Math.floor(midiNote / 12) - 1;
        };
        
        expect(getOctave(60)).toBe(4);
        expect(getOctave(69)).toBe(4);
        expect(getOctave(72)).toBe(5);
        expect(getOctave(24)).toBe(1);
    });

    test('MIDI 音名应正确计算', () => {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const getNoteName = (midiNote) => {
            return noteNames[midiNote % 12];
        };
        
        expect(getNoteName(60)).toBe('C');
        expect(getNoteName(61)).toBe('C#');
        expect(getNoteName(62)).toBe('D');
        expect(getNoteName(69)).toBe('A');
    });

    test('MIDI 音符范围验证', () => {
        const isValidMidiNote = (note) => {
            return Number.isInteger(note) && note >= 0 && note <= 127;
        };
        
        expect(isValidMidiNote(0)).toBe(true);
        expect(isValidMidiNote(60)).toBe(true);
        expect(isValidMidiNote(127)).toBe(true);
        expect(isValidMidiNote(-1)).toBe(false);
        expect(isValidMidiNote(128)).toBe(false);
        expect(isValidMidiNote(60.5)).toBe(false);
    });

    test('MIDI 力度范围验证', () => {
        const isValidVelocity = (velocity) => {
            return Number.isInteger(velocity) && velocity >= 0 && velocity <= 127;
        };
        
        expect(isValidVelocity(0)).toBe(true);
        expect(isValidVelocity(64)).toBe(true);
        expect(isValidVelocity(127)).toBe(true);
        expect(isValidVelocity(-1)).toBe(false);
        expect(isValidVelocity(128)).toBe(false);
    });

    test('MIDI 音高弯曲应正确映射', () => {
        const pitchBendToCents = (lsb, msb) => {
            const value = (msb << 7) | lsb;
            const center = 8192;
            const range = 200;
            return ((value - center) / center) * range;
        };
        
        expect(pitchBendToCents(0, 64)).toBe(0);
        expect(pitchBendToCents(127, 127)).toBeCloseTo(200);
        expect(pitchBendToCents(0, 0)).toBeCloseTo(-200);
    });

    test('MIDI 控制变化应正确识别', () => {
        const CC_VOLUME = 7;
        const CC_PAN = 10;
        const CC_SUSTAIN = 64;
        
        const createCCMessage = (ccNumber, value) => {
            return createMockMIDIMessage(176, ccNumber, value);
        };
        
        const volumeMsg = createCCMessage(CC_VOLUME, 100);
        expect(volumeMsg.data[0]).toBe(176);
        expect(volumeMsg.data[1]).toBe(CC_VOLUME);
        expect(volumeMsg.data[2]).toBe(100);
    });

    test('MIDI 通道应正确提取', () => {
        const getChannel = (statusByte) => {
            return statusByte & 0x0F;
        };
        
        expect(getChannel(144)).toBe(0);
        expect(getChannel(145)).toBe(1);
        expect(getChannel(159)).toBe(15);
    });

    test('MIDI 命令类型应正确识别', () => {
        const getCommandType = (statusByte) => {
            return statusByte & 0xF0;
        };
        
        expect(getCommandType(144)).toBe(144);
        expect(getCommandType(128)).toBe(128);
        expect(getCommandType(176)).toBe(176);
        expect(getCommandType(224)).toBe(224);
    });
});

describe('MIDI 集成测试', () => {
    test('MIDI 消息应正确解析', () => {
        const parseMIDIMessage = (message) => {
            const [status, data1, data2] = message.data;
            const command = status & 0xF0;
            const channel = status & 0x0F;
            
            return {
                command,
                channel,
                data1,
                data2,
                receivedTime: message.receivedTime
            };
        };
        
        const message = createMockMIDIMessage(144, 60, 100);
        const parsed = parseMIDIMessage(message);
        
        expect(parsed.command).toBe(144);
        expect(parsed.channel).toBe(0);
        expect(parsed.data1).toBe(60);
        expect(parsed.data2).toBe(100);
        expect(parsed.receivedTime).toBeDefined();
    });

    test('MIDI 音符事件应正确映射', () => {
        const handleNoteEvent = (message) => {
            const [status, note, velocity] = message.data;
            const command = status & 0xF0;
            
            if (command === 144 && velocity > 0) {
                return { type: 'noteOn', note, velocity };
            } else if (command === 128 || (command === 144 && velocity === 0)) {
                return { type: 'noteOff', note, velocity };
            }
            return null;
        };
        
        const noteOn = handleNoteEvent(createMockMIDIMessage(144, 60, 100));
        expect(noteOn.type).toBe('noteOn');
        expect(noteOn.note).toBe(60);
        
        const noteOff1 = handleNoteEvent(createMockMIDIMessage(128, 60, 64));
        expect(noteOff1.type).toBe('noteOff');
        
        const noteOff2 = handleNoteEvent(createMockMIDIMessage(144, 60, 0));
        expect(noteOff2.type).toBe('noteOff');
    });
});
