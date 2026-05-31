import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.MouseEvent = dom.window.MouseEvent;

class MockAudioContext {
    constructor() {
        this.state = 'suspended';
        this._nodes = [];
        this._destination = new MockAudioDestinationNode(this);
    }
    
    get destination() {
        return this._destination;
    }
    
    createOscillator() {
        const osc = new MockOscillatorNode(this);
        this._nodes.push(osc);
        return osc;
    }
    
    createGain() {
        const gain = new MockGainNode(this);
        this._nodes.push(gain);
        return gain;
    }
    
    createConvolver() {
        const convolver = new MockConvolverNode(this);
        this._nodes.push(convolver);
        return convolver;
    }
    
    createDelay(maxDelayTime = 1) {
        const delay = new MockDelayNode(this, maxDelayTime);
        this._nodes.push(delay);
        return delay;
    }
    
    createBuffer(numberOfChannels, length, sampleRate) {
        return new MockAudioBuffer(numberOfChannels, length, sampleRate);
    }
    
    decodeAudioData(audioData) {
        return Promise.resolve(new MockAudioBuffer(2, 44100, 44100));
    }
    
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
    
    suspend() {
        this.state = 'suspended';
        return Promise.resolve();
    }
    
    close() {
        this.state = 'closed';
        return Promise.resolve();
    }
}

class MockAudioNode {
    constructor(context) {
        this.context = context;
        this._connections = [];
    }
    
    connect(destination) {
        this._connections.push(destination);
        return destination;
    }
    
    disconnect() {
        this._connections = [];
    }
}

class MockOscillatorNode extends MockAudioNode {
    constructor(context) {
        super(context);
        this.type = 'sine';
        this.frequency = { value: 440 };
        this._started = false;
        this._stopped = false;
    }
    
    start(when = 0) {
        this._started = true;
        this._startTime = when;
    }
    
    stop(when = 0) {
        this._stopped = true;
        this._stopTime = when;
    }
}

class MockGainNode extends MockAudioNode {
    constructor(context) {
        super(context);
        this.gain = { value: 1 };
    }
}

class MockConvolverNode extends MockAudioNode {
    constructor(context) {
        super(context);
        this.buffer = null;
        this.normalize = true;
    }
}

class MockDelayNode extends MockAudioNode {
    constructor(context, maxDelayTime) {
        super(context);
        this.delayTime = { value: 0 };
        this.maxDelayTime = maxDelayTime;
    }
}

class MockAudioDestinationNode extends MockAudioNode {
    constructor(context) {
        super(context);
        this.maxChannelCount = 2;
    }
}

class MockAudioBuffer {
    constructor(numberOfChannels, length, sampleRate) {
        this.numberOfChannels = numberOfChannels;
        this.length = length;
        this.sampleRate = sampleRate;
        this.duration = length / sampleRate;
        this._channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
    }
    
    getChannelData(channel) {
        return this._channels[channel];
    }
}

class MockMediaRecorder {
    constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        this._chunks = [];
        this.ondataavailable = null;
        this.onstop = null;
    }
    
    start(timeslice) {
        this.state = 'recording';
        this._interval = setInterval(() => {
            if (this.ondataavailable) {
                this.ondataavailable({ data: new Blob(['mock audio data']) });
            }
        }, timeslice || 1000);
    }
    
    stop() {
        this.state = 'inactive';
        clearInterval(this._interval);
        if (this.onstop) {
            this.onstop();
        }
    }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.MediaRecorder = MockMediaRecorder;

global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

global.navigator.requestMIDIAccess = function() {
    return Promise.resolve({
        inputs: {
            values: () => [{
                onmidimessage: null,
                id: 'mock-midi-input',
                name: 'Mock MIDI Keyboard'
            }],
            size: 1
        },
        outputs: {
            values: () => [],
            size: 0
        },
        onstatechange: null
    });
};

export function createMockMIDIMessage(command, note, velocity) {
    return {
        data: new Uint8Array([command, note, velocity]),
        receivedTime: performance.now()
    };
}

export function createMockWork(overrides = {}) {
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

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
