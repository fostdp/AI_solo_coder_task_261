const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const START_OCTAVE = 0;
const END_OCTAVE = 8;
const NOTE_HEIGHT = 22;
const STEP_WIDTH = 30;
const STEPS_PER_BEAT = 4;
const TOTAL_STEPS = 64;

const CHORD_NOTES = {
    'C': [0, 4, 7],
    'Cm': [0, 3, 7],
    'D': [2, 6, 9],
    'Dm': [2, 5, 9],
    'E': [4, 8, 11],
    'Em': [4, 7, 11],
    'F': [5, 9, 12],
    'Fm': [5, 8, 12],
    'G': [7, 11, 14],
    'Gm': [7, 10, 14],
    'A': [9, 13, 16],
    'Am': [9, 12, 16],
    'B': [11, 15, 18],
    'Bdim': [11, 14, 17],
};

const CHORD_PROGRESSIONS = [
    ['C', 'Am', 'F', 'G'],
    ['C', 'G', 'Am', 'F'],
    ['Am', 'F', 'C', 'G'],
    ['F', 'G', 'Am', 'F'],
    ['C', 'Dm', 'Em', 'F'],
    ['G', 'Em', 'C', 'D'],
];

const DRUM_PRESETS = {
    rock: {
        kick: [0, 4, 8, 12],
        snare: [4, 12],
        hihat: [0, 2, 4, 6, 8, 10, 12, 14],
        tom: []
    },
    pop: {
        kick: [0, 6, 8, 14],
        snare: [4, 12],
        hihat: [0, 2, 4, 6, 8, 10, 12, 14],
        tom: []
    },
    funk: {
        kick: [0, 3, 8, 11],
        snare: [4, 12],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        tom: [6, 14]
    },
    jazz: {
        kick: [0, 7, 12],
        snare: [4, 11, 14],
        hihat: [0, 3, 6, 9, 12, 15],
        tom: [8, 10]
    },
    edm: {
        kick: [0, 4, 8, 12],
        snare: [4, 12],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        tom: [6, 7, 14, 15]
    }
};

class MusicWorkshop {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillators = new Map();
        this.notes = [];
        this.chords = [];
        this.drums = { kick: [], snare: [], hihat: [], tom: [] };
        this.tempo = 120;
        this.timeSignature = '4/4';
        this.keySignature = 'C';
        this.volume = 0.8;
        this.isPlaying = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.playInterval = null;
        this.selectedNote = null;
        this.currentChordIndex = 0;
        this.communityWorks = [];
        
        this.mixer = {
            melody: { volume: 0.8, muted: false, solo: false },
            chords: { volume: 0.6, muted: false, solo: false },
            drums: { volume: 0.7, muted: false, solo: false }
        };
        
        this.effects = {
            reverb: { enabled: false, wet: 0.3, decay: 2 },
            delay: { enabled: false, wet: 0.25, time: 0.3, feedback: 0.4 }
        };
        
        this.reverbNode = null;
        this.delayNode = null;
        this.delayFeedback = null;
        
        this.init();
    }

    init() {
        this.initAudio();
        this.initPianoRoll();
        this.initGrid();
        this.initDrums();
        this.initEvents();
        this.initMIDI();
        this.addChord('C');
        this.addChord('Am');
        this.addChord('F');
        this.addChord('G');
    }

    async initAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;
        
        this.melodyGain = this.audioContext.createGain();
        this.melodyGain.gain.value = this.mixer.melody.volume;
        
        this.chordsGain = this.audioContext.createGain();
        this.chordsGain.gain.value = this.mixer.chords.volume;
        
        this.drumsGain = this.audioContext.createGain();
        this.drumsGain.gain.value = this.mixer.drums.volume;
        
        this.melodyGain.connect(this.masterGain);
        this.chordsGain.connect(this.masterGain);
        this.drumsGain.connect(this.masterGain);
        
        this.masterGain.connect(this.audioContext.destination);
        
        await this.createReverb();
        this.createDelay();
    }

    async createReverb() {
        const impulseLength = this.audioContext.sampleRate * this.effects.reverb.decay;
        const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);
        
        for (let i = 0; i < impulseLength; i++) {
            const decay = Math.pow(1 - i / impulseLength, 2);
            leftChannel[i] = (Math.random() * 2 - 1) * decay;
            rightChannel[i] = (Math.random() * 2 - 1) * decay;
        }
        
        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = impulse;
    }

    createDelay() {
        this.delayNode = this.audioContext.createDelay(5.0);
        this.delayNode.delayTime.value = this.effects.delay.time;
        this.delayFeedback = this.audioContext.createGain();
        this.delayFeedback.gain.value = this.effects.delay.feedback;
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
    }

    initPianoRoll() {
        const pianoKeys = document.getElementById('pianoKeys');
        const notes = [];
        
        for (let octave = END_OCTAVE; octave >= START_OCTAVE; octave--) {
            for (let i = NOTE_NAMES.length - 1; i >= 0; i--) {
                const noteName = NOTE_NAMES[i];
                const isBlack = noteName.includes('#');
                const midiNote = octave * 12 + i;
                
                const key = document.createElement('div');
                key.className = `piano-key ${isBlack ? 'black' : 'white'}`;
                key.dataset.midi = midiNote;
                key.textContent = `${noteName}${octave}`;
                key.addEventListener('mousedown', () => this.playNote(midiNote, 'melody'));
                key.addEventListener('mouseup', () => this.stopNote(midiNote));
                pianoKeys.appendChild(key);
                
                notes.push({ note: midiNote, element: key });
            }
        }
        
        this.pianoNotes = notes;
        
        const pianoRoll = document.getElementById('pianoRoll');
        pianoRoll.style.width = `${TOTAL_STEPS * STEP_WIDTH}px`;
        pianoRoll.style.height = `${notes.length * NOTE_HEIGHT}px`;
    }

    initGrid() {
        const grid = document.getElementById('grid');
        const totalRows = (END_OCTAVE - START_OCTAVE + 1) * 12;
        const beatsPerBar = parseInt(this.timeSignature.split('/')[0]);
        
        for (let i = 0; i < totalRows; i++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            row.style.top = `${i * NOTE_HEIGHT}px`;
            grid.appendChild(row);
        }
        
        for (let i = 0; i <= TOTAL_STEPS; i++) {
            const col = document.createElement('div');
            const isBeat = i % STEPS_PER_BEAT === 0;
            const isBar = i % (STEPS_PER_BEAT * beatsPerBar) === 0;
            col.className = `grid-column ${isBar ? 'bar' : isBeat ? 'beat' : ''}`;
            col.style.left = `${i * STEP_WIDTH}px`;
            grid.appendChild(col);
        }
    }

    initDrums() {
        const drumTracks = document.querySelectorAll('.drum-steps');
        
        drumTracks.forEach(track => {
            const drumType = track.dataset.drum;
            track.innerHTML = '';
            
            for (let i = 0; i < 16; i++) {
                const step = document.createElement('div');
                step.className = `drum-step ${i % 4 === 0 ? 'beat' : ''}`;
                step.dataset.step = i;
                step.addEventListener('click', () => {
                    step.classList.toggle('active');
                    if (step.classList.contains('active')) {
                        if (!this.drums[drumType].includes(i)) {
                            this.drums[drumType].push(i);
                        }
                        this.playDrum(drumType);
                    } else {
                        this.drums[drumType] = this.drums[drumType].filter(s => s !== i);
                    }
                });
                track.appendChild(step);
            }
        });
        
        this.applyDrumPreset('rock');
    }

    initEvents() {
        const pianoRoll = document.getElementById('pianoRoll');
        
        pianoRoll.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecord());
        document.getElementById('saveBtn').addEventListener('click', () => this.showSaveModal());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadWork());
        document.getElementById('publishBtn').addEventListener('click', () => this.publishWork());
        document.getElementById('communityBtn').addEventListener('click', () => this.showCommunity());
        
        document.getElementById('tempo').addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            document.getElementById('tempoValue').textContent = this.tempo;
        });
        
        document.getElementById('timeSignature').addEventListener('change', (e) => {
            this.timeSignature = e.target.value;
            document.getElementById('grid').innerHTML = '';
            this.initGrid();
        });
        
        document.getElementById('keySignature').addEventListener('change', (e) => {
            this.keySignature = e.target.value;
        });
        
        document.getElementById('addChord').addEventListener('click', () => {
            const chord = document.getElementById('chordSelect').value;
            this.addChord(chord);
        });
        
        document.getElementById('generateChords').addEventListener('click', () => {
            this.generateRandomChords();
        });
        
        document.getElementById('clearDrums').addEventListener('click', () => {
            Object.keys(this.drums).forEach(drum => {
                this.drums[drum] = [];
                document.querySelectorAll(`[data-drum="${drum}"] .drum-step`).forEach(step => {
                    step.classList.remove('active');
                });
            });
        });
        
        document.getElementById('randomDrums').addEventListener('click', () => {
            this.generateRandomDrums();
        });
        
        document.getElementById('applyDrumPreset').addEventListener('click', () => {
            const preset = document.getElementById('drumPreset').value;
            this.applyDrumPreset(preset);
        });
        
        this.initMixerEvents();
        this.initEffectsEvents();
        
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('confirmBtn').addEventListener('click', () => this.saveWork());
        document.getElementById('closeCommunityBtn').addEventListener('click', () => {
            document.getElementById('communityModal').classList.add('hidden');
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNote) {
                this.deleteNote(this.selectedNote);
            }
        });
    }

    initMixerEvents() {
        document.querySelectorAll('.mixer-channel').forEach(channel => {
            const channelName = channel.dataset.channel;
            const volumeSlider = channel.querySelector('.channel-volume');
            const muteBtn = channel.querySelector('.mute-btn');
            const soloBtn = channel.querySelector('.solo-btn');
            
            volumeSlider.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                this.mixer[channelName].volume = value;
                channel.querySelector('.channel-value').textContent = `${e.target.value}%`;
                
                if (channelName === 'melody') {
                    this.melodyGain.gain.value = value;
                } else if (channelName === 'chords') {
                    this.chordsGain.gain.value = value;
                } else if (channelName === 'drums') {
                    this.drumsGain.gain.value = value;
                }
            });
            
            muteBtn.addEventListener('click', () => {
                this.mixer[channelName].muted = !this.mixer[channelName].muted;
                muteBtn.classList.toggle('active');
                this.updateMixer();
            });
            
            soloBtn.addEventListener('click', () => {
                this.mixer[channelName].solo = !this.mixer[channelName].solo;
                soloBtn.classList.toggle('active');
                this.updateMixer();
            });
        });
    }

    initEffectsEvents() {
        document.getElementById('reverbEnabled').addEventListener('change', (e) => {
            this.effects.reverb.enabled = e.target.checked;
            this.updateEffects();
        });
        
        document.getElementById('reverbWet').addEventListener('input', (e) => {
            this.effects.reverb.wet = e.target.value / 100;
            document.getElementById('reverbWetValue').textContent = e.target.value;
        });
        
        document.getElementById('reverbDecay').addEventListener('input', (e) => {
            this.effects.reverb.decay = parseFloat(e.target.value);
            document.getElementById('reverbDecayValue').textContent = e.target.value;
            this.createReverb();
        });
        
        document.getElementById('delayEnabled').addEventListener('change', (e) => {
            this.effects.delay.enabled = e.target.checked;
            this.updateEffects();
        });
        
        document.getElementById('delayWet').addEventListener('input', (e) => {
            this.effects.delay.wet = e.target.value / 100;
            document.getElementById('delayWetValue').textContent = e.target.value;
        });
        
        document.getElementById('delayTime').addEventListener('input', (e) => {
            this.effects.delay.time = e.target.value / 1000;
            document.getElementById('delayTimeValue').textContent = e.target.value;
            if (this.delayNode) {
                this.delayNode.delayTime.value = this.effects.delay.time;
            }
        });
        
        document.getElementById('delayFeedback').addEventListener('input', (e) => {
            this.effects.delay.feedback = e.target.value / 100;
            document.getElementById('delayFeedbackValue').textContent = e.target.value;
            if (this.delayFeedback) {
                this.delayFeedback.gain.value = this.effects.delay.feedback;
            }
        });
    }

    updateMixer() {
        const hasSolo = Object.values(this.mixer).some(m => m.solo);
        
        Object.entries(this.mixer).forEach(([channel, settings]) => {
            let gainValue = settings.volume;
            
            if (hasSolo && !settings.solo) {
                gainValue = 0;
            } else if (settings.muted) {
                gainValue = 0;
            }
            
            if (channel === 'melody') {
                this.melodyGain.gain.value = gainValue;
            } else if (channel === 'chords') {
                this.chordsGain.gain.value = gainValue;
            } else if (channel === 'drums') {
                this.drumsGain.gain.value = gainValue;
            }
        });
    }

    updateEffects() {
        if (this.effects.reverb.enabled) {
        }
        if (this.effects.delay.enabled) {
        }
    }

    addChord(chord) {
        this.chords.push(chord);
        this.renderChords();
    }

    removeChord(index) {
        this.chords.splice(index, 1);
        this.renderChords();
    }

    renderChords() {
        const container = document.getElementById('chordProgression');
        container.innerHTML = '';
        
        this.chords.forEach((chord, index) => {
            const item = document.createElement('div');
            item.className = 'chord-item';
            item.innerHTML = `${chord}<span class="remove">×</span>`;
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove')) {
                    this.removeChord(index);
                } else {
                    this.playChord(chord);
                }
            });
            container.appendChild(item);
        });
    }

    generateRandomChords() {
        const progression = CHORD_PROGRESSIONS[Math.floor(Math.random() * CHORD_PROGRESSIONS.length)];
        this.chords = [...progression];
        this.renderChords();
    }

    playChord(chord) {
        const notes = CHORD_NOTES[chord] || CHORD_NOTES['C'];
        notes.forEach((interval, index) => {
            setTimeout(() => {
                this.playNote(60 + interval, 'chords');
                setTimeout(() => {
                    this.stopNote(60 + interval);
                }, 500);
            }, index * 50);
        });
    }

    applyDrumPreset(preset) {
        const pattern = DRUM_PRESETS[preset];
        
        Object.keys(this.drums).forEach(drum => {
            this.drums[drum] = [];
            document.querySelectorAll(`[data-drum="${drum}"] .drum-step`).forEach(step => {
                step.classList.remove('active');
            });
        });
        
        Object.entries(pattern).forEach(([drum, steps]) => {
            steps.forEach(stepIndex => {
                const step = document.querySelector(`[data-drum="${drum}"] [data-step="${stepIndex}"]`);
                if (step) {
                    step.classList.add('active');
                    this.drums[drum].push(stepIndex);
                }
            });
        });
    }

    generateRandomDrums() {
        const drumTypes = Object.keys(this.drums);
        drumTypes.forEach(drum => {
            this.drums[drum] = [];
            document.querySelectorAll(`[data-drum="${drum}"] .drum-step`).forEach((step, index) => {
                if (Math.random() > 0.7) {
                    step.classList.add('active');
                    this.drums[drum].push(index);
                } else {
                    step.classList.remove('active');
                }
            });
        });
    }

    playDrum(drumType) {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        switch (drumType) {
            case 'kick':
                osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                gain.gain.setValueAtTime(1, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                break;
            case 'snare':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
                gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                break;
            case 'hihat':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
                gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                break;
            case 'tom':
                osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                break;
        }
        
        osc.connect(gain);
        gain.connect(this.drumsGain);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.5);
    }

    onMouseDown(e) {
        const pianoRoll = document.getElementById('pianoRoll');
        const rect = pianoRoll.getBoundingClientRect();
        const x = e.clientX - rect.left + pianoRoll.scrollLeft;
        const y = e.clientY - rect.top + pianoRoll.scrollTop;
        
        if (e.target.classList.contains('resize-handle')) {
            this.resizingNote = e.target.parentElement;
            this.dragStartX = e.clientX;
            this.noteStartWidth = parseInt(this.resizingNote.style.width);
            return;
        }
        
        if (e.target.classList.contains('note')) {
            this.draggingNote = e.target;
            this.selectedNote = e.target;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.noteStartX = parseInt(this.draggingNote.style.left);
            this.noteStartY = parseInt(this.draggingNote.style.top);
            this.selectNote(e.target);
            return;
        }
        
        const step = Math.floor(x / STEP_WIDTH);
        const noteIndex = Math.floor(y / NOTE_HEIGHT);
        const totalNotes = (END_OCTAVE - START_OCTAVE + 1) * 12;
        const midiNote = (END_OCTAVE * 12 + 11) - noteIndex;
        
        if (step >= 0 && step < TOTAL_STEPS && noteIndex >= 0 && noteIndex < totalNotes) {
            this.createNote(step, midiNote, 1);
        }
    }

    onMouseMove(e) {
        if (this.draggingNote) {
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            
            let newX = this.noteStartX + dx;
            newX = Math.round(newX / STEP_WIDTH) * STEP_WIDTH;
            newX = Math.max(0, Math.min(newX, (TOTAL_STEPS - 1) * STEP_WIDTH));
            
            let newY = this.noteStartY + dy;
            newY = Math.round(newY / NOTE_HEIGHT) * NOTE_HEIGHT;
            newY = Math.max(0, newY);
            
            this.draggingNote.style.left = `${newX}px`;
            this.draggingNote.style.top = `${newY}px`;
            
            this.updateNoteData(this.draggingNote);
        }
        
        if (this.resizingNote) {
            const dx = e.clientX - this.dragStartX;
            let newWidth = this.noteStartWidth + dx;
            newWidth = Math.round(newWidth / STEP_WIDTH) * STEP_WIDTH;
            newWidth = Math.max(STEP_WIDTH, newWidth);
            this.resizingNote.style.width = `${newWidth}px`;
            this.updateNoteData(this.resizingNote);
        }
    }

    onMouseUp(e) {
        this.draggingNote = null;
        this.resizingNote = null;
    }

    createNote(step, midiNote, duration) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        
        const totalNotes = (END_OCTAVE - START_OCTAVE + 1) * 12;
        const noteIndex = (END_OCTAVE * 12 + 11) - midiNote;
        
        noteElement.style.left = `${step * STEP_WIDTH}px`;
        noteElement.style.top = `${noteIndex * NOTE_HEIGHT}px`;
        noteElement.style.width = `${duration * STEP_WIDTH}px`;
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        noteElement.appendChild(resizeHandle);
        
        document.getElementById('notes').appendChild(noteElement);
        
        this.notes.push({
            element: noteElement,
            step: step,
            midiNote: midiNote,
            duration: duration
        });
        
        this.playNote(midiNote, 'melody');
        setTimeout(() => this.stopNote(midiNote), 200);
    }

    updateNoteData(noteElement) {
        const noteData = this.notes.find(n => n.element === noteElement);
        if (noteData) {
            noteData.step = Math.round(parseInt(noteElement.style.left) / STEP_WIDTH);
            noteData.duration = Math.round(parseInt(noteElement.style.width) / STEP_WIDTH);
            
            const totalNotes = (END_OCTAVE - START_OCTAVE + 1) * 12;
            const noteIndex = Math.round(parseInt(noteElement.style.top) / NOTE_HEIGHT);
            noteData.midiNote = (END_OCTAVE * 12 + 11) - noteIndex;
        }
    }

    selectNote(noteElement) {
        document.querySelectorAll('.note').forEach(n => n.classList.remove('selected'));
        noteElement.classList.add('selected');
    }

    deleteNote(noteElement) {
        const index = this.notes.findIndex(n => n.element === noteElement);
        if (index > -1) {
            this.notes.splice(index, 1);
            noteElement.remove();
            this.selectedNote = null;
        }
    }

    midiToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    playNote(midiNote, channel = 'melody') {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const freq = this.midiToFrequency(midiNote);
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        
        osc.connect(gain);
        
        if (channel === 'melody') {
            gain.connect(this.melodyGain);
        } else if (channel === 'chords') {
            gain.connect(this.chordsGain);
        }
        
        osc.start();
        
        this.oscillators.set(midiNote, { osc, gain });
        
        const key = document.querySelector(`.piano-key[data-midi="${midiNote}"]`);
        if (key) key.classList.add('active');
    }

    stopNote(midiNote) {
        const noteData = this.oscillators.get(midiNote);
        if (noteData) {
            const { osc, gain } = noteData;
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
            setTimeout(() => {
                osc.stop();
                osc.disconnect();
                gain.disconnect();
            }, 100);
            this.oscillators.delete(midiNote);
        }
        
        const key = document.querySelector(`.piano-key[data-midi="${midiNote}"]`);
        if (key) key.classList.remove('active');
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸ 暂停';
        document.getElementById('status').textContent = '播放中...';
        
        const stepDuration = (60 / this.tempo) / STEPS_PER_BEAT * 1000;
        
        if (!this.startTime) {
            this.startTime = performance.now() - this.currentTime;
        }
        
        this.playInterval = setInterval(() => {
            const elapsed = performance.now() - this.startTime;
            const currentStep = Math.floor(elapsed / stepDuration) % TOTAL_STEPS;
            const current16th = Math.floor(elapsed / (stepDuration / 4)) % 16;
            
            this.currentTime = elapsed;
            this.updatePlayhead(currentStep);
            this.updateCurrentBar(currentStep);
            this.updateTimeDisplay();
            
            this.notes.forEach(note => {
                if (note.step === currentStep) {
                    this.playNote(note.midiNote, 'melody');
                    setTimeout(() => this.stopNote(note.midiNote), stepDuration * note.duration * 0.9);
                }
            });
            
            if (this.chords.length > 0 && currentStep % 16 === 0) {
                const chordIndex = Math.floor(currentStep / 16) % this.chords.length;
                const chord = this.chords[chordIndex];
                const notes = CHORD_NOTES[chord] || CHORD_NOTES['C'];
                notes.forEach(interval => {
                    this.playNote(60 + interval, 'chords');
                    setTimeout(() => this.stopNote(60 + interval), stepDuration * 15);
                });
            }
            
            Object.entries(this.drums).forEach(([drum, steps]) => {
                if (steps.includes(current16th)) {
                    this.playDrum(drum);
                }
            });
        }, stepDuration);
    }

    pause() {
        this.isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ 播放';
        document.getElementById('status').textContent = '已暂停';
        clearInterval(this.playInterval);
    }

    stop() {
        this.isPlaying = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.startTime = null;
        document.getElementById('playBtn').textContent = '▶ 播放';
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('status').textContent = '已停止';
        clearInterval(this.playInterval);
        this.updatePlayhead(0);
        this.updateTimeDisplay();
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
    }

    updatePlayhead(step) {
        const playhead = document.getElementById('playhead');
        playhead.style.left = `${step * STEP_WIDTH}px`;
        
        const pianoRoll = document.getElementById('pianoRoll');
        const scrollLeft = step * STEP_WIDTH - pianoRoll.clientWidth / 2;
        pianoRoll.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }

    updateCurrentBar(step) {
        const beatsPerBar = parseInt(this.timeSignature.split('/')[0]);
        const bar = Math.floor(step / (STEPS_PER_BEAT * beatsPerBar)) + 1;
        document.getElementById('currentBar').textContent = `小节: ${bar}`;
    }

    updateTimeDisplay() {
        const seconds = Math.floor(this.currentTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const ms = Math.floor((this.currentTime % 1000));
        document.getElementById('time').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    async toggleRecord() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const dest = this.audioContext.createMediaStreamDestination();
            this.masterGain.connect(dest);
            
            this.mediaRecorder = new MediaRecorder(dest.stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording_${Date.now()}.wav`;
                a.click();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            document.getElementById('recordBtn').classList.add('recording');
            document.getElementById('status').textContent = '录音中...';
            
            this.play();
        } catch (err) {
            console.error('录音失败:', err);
            alert('无法开始录音，请确保已授权麦克风访问权限');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('status').textContent = '录音已保存';
        this.stop();
    }

    initMIDI() {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess()
                .then((access) => {
                    document.getElementById('midiStatus').textContent = '🎹 MIDI键盘: 已连接';
                    
                    const inputs = access.inputs.values();
                    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
                        input.value.onmidimessage = (message) => this.onMIDIMessage(message);
                    }
                    
                    access.onstatechange = (e) => {
                        if (e.port.state === 'connected') {
                            document.getElementById('midiStatus').textContent = '🎹 MIDI键盘: 已连接';
                        } else {
                            document.getElementById('midiStatus').textContent = '🎹 MIDI键盘: 未连接';
                        }
                    };
                })
                .catch((err) => {
                    console.log('MIDI不可用:', err);
                });
        }
    }

    onMIDIMessage(message) {
        const [command, note, velocity] = message.data;
        
        if (command === 144 && velocity > 0) {
            this.playNote(note, 'melody');
        } else if (command === 128 || (command === 144 && velocity === 0)) {
            this.stopNote(note);
        }
    }

    showSaveModal() {
        document.getElementById('modal').classList.remove('hidden');
        document.getElementById('modalTitle').textContent = '保存作品';
        document.getElementById('workName').value = '';
        document.getElementById('workDescription').value = '';
        document.getElementById('workName').focus();
    }

    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    getWorkData(name, description = '') {
        return {
            name: name,
            description: description,
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            keySignature: this.keySignature,
            notes: this.notes.map(n => ({
                step: n.step,
                midiNote: n.midiNote,
                duration: n.duration
            })),
            chords: [...this.chords],
            drums: {
                kick: [...this.drums.kick],
                snare: [...this.drums.snare],
                hihat: [...this.drums.hihat],
                tom: [...this.drums.tom]
            },
            mixer: {
                melody: { ...this.mixer.melody },
                chords: { ...this.mixer.chords },
                drums: { ...this.mixer.drums }
            },
            effects: {
                reverb: { ...this.effects.reverb },
                delay: { ...this.effects.delay }
            },
            author: 'Anonymous',
            plays: 0,
            likes: 0,
            createdAt: new Date().toISOString()
        };
    }

    async saveWork() {
        const name = document.getElementById('workName').value.trim();
        const description = document.getElementById('workDescription').value.trim();
        
        if (!name) {
            alert('请输入作品名称');
            return;
        }
        
        const workData = this.getWorkData(name, description);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/works', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                alert('作品保存成功！');
                this.hideModal();
            } else {
                throw new Error('保存失败');
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('保存请求超时，已保存到本地');
            }
            localStorage.setItem(`work_${name}`, JSON.stringify(workData));
            alert('作品已保存到本地存储');
            this.hideModal();
        }
    }

    async loadWork() {
        try {
            const response = await fetch('/api/works');
            const works = await response.json();
            
            if (works.length === 0) {
                alert('没有保存的作品');
                return;
            }
            
            const workNames = works.map(w => w.name).join('\n');
            const name = prompt(`请选择要加载的作品:\n${workNames}`);
            
            if (name) {
                const work = works.find(w => w.name === name);
                if (work) {
                    this.loadWorkData(work);
                }
            }
        } catch (err) {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('work_'));
            if (keys.length === 0) {
                alert('没有保存的作品');
                return;
            }
            
            const workNames = keys.map(k => k.replace('work_', '')).join('\n');
            const name = prompt(`请选择要加载的作品:\n${workNames}`);
            
            if (name) {
                const data = localStorage.getItem(`work_${name}`);
                if (data) {
                    this.loadWorkData(JSON.parse(data));
                }
            }
        }
    }

    loadWorkData(work) {
        this.notes.forEach(n => n.element.remove());
        this.notes = [];
        
        this.tempo = work.tempo || 120;
        document.getElementById('tempo').value = this.tempo;
        document.getElementById('tempoValue').textContent = this.tempo;
        
        if (work.timeSignature) {
            this.timeSignature = work.timeSignature;
            document.getElementById('timeSignature').value = work.timeSignature;
            document.getElementById('grid').innerHTML = '';
            this.initGrid();
        }
        
        if (work.keySignature) {
            this.keySignature = work.keySignature;
            document.getElementById('keySignature').value = work.keySignature;
        }
        
        if (work.chords) {
            this.chords = work.chords;
            this.renderChords();
        }
        
        if (work.drums) {
            Object.entries(work.drums).forEach(([drum, steps]) => {
                document.querySelectorAll(`[data-drum="${drum}"] .drum-step`).forEach(step => {
                    step.classList.remove('active');
                });
                steps.forEach(stepIndex => {
                    const step = document.querySelector(`[data-drum="${drum}"] [data-step="${stepIndex}"]`);
                    if (step) step.classList.add('active');
                });
                this.drums[drum] = steps;
            });
        }
        
        if (work.mixer) {
            Object.entries(work.mixer).forEach(([channel, settings]) => {
                this.mixer[channel] = settings;
                const channelEl = document.querySelector(`[data-channel="${channel}"]`);
                if (channelEl) {
                    channelEl.querySelector('.channel-volume').value = settings.volume * 100;
                    channelEl.querySelector('.channel-value').textContent = `${Math.round(settings.volume * 100)}%`;
                }
            });
            this.updateMixer();
        }
        
        work.notes.forEach(n => {
            this.createNote(n.step, n.midiNote, n.duration);
        });
        
        alert(`作品 "${work.name}" 已加载！`);
    }

    async publishWork() {
        const name = prompt('请输入作品名称用于发布:');
        if (!name) return;
        
        const description = prompt('请输入作品描述（可选）:') || '';
        const workData = this.getWorkData(name, description);
        workData.isPublic = true;
        
        try {
            const response = await fetch('/api/works/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workData)
            });
            
            if (response.ok) {
                alert('作品发布成功！已发布到社区');
            } else {
                throw new Error('发布失败');
            }
        } catch (err) {
            localStorage.setItem(`public_work_${name}`, JSON.stringify(workData));
            alert('作品已保存到本地（服务器不可用）');
        }
    }

    async showCommunity() {
        try {
            const response = await fetch('/api/works/community');
            this.communityWorks = await response.json();
        } catch (err) {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('public_work_'));
            this.communityWorks = keys.map(k => JSON.parse(localStorage.getItem(k)));
        }
        
        this.renderCommunityWorks();
        document.getElementById('communityModal').classList.remove('hidden');
    }

    renderCommunityWorks() {
        const container = document.getElementById('communityWorks');
        container.innerHTML = '';
        
        if (this.communityWorks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5);">社区暂无作品</p>';
            return;
        }
        
        this.communityWorks.forEach((work, index) => {
            const card = document.createElement('div');
            card.className = 'work-card';
            card.innerHTML = `
                <h4>${work.name}</h4>
                <div class="author">作者: ${work.author || 'Anonymous'}</div>
                ${work.description ? `<p style="font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 10px;">${work.description}</p>` : ''}
                <div class="stats">
                    <span>▶ ${work.plays || 0} 播放</span>
                    <span>❤ ${work.likes || 0} 喜欢</span>
                </div>
                <div class="actions">
                    <button class="btn small" onclick="window.workshop.remixWork(${index})">🎨 改编</button>
                    <button class="btn small" onclick="window.workshop.loadCommunityWork(${index})">📂 加载</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    loadCommunityWork(index) {
        const work = this.communityWorks[index];
        if (work) {
            this.loadWorkData(work);
            document.getElementById('communityModal').classList.add('hidden');
        }
    }

    remixWork(index) {
        const work = this.communityWorks[index];
        if (work) {
            this.loadWorkData(work);
            document.getElementById('communityModal').classList.add('hidden');
            alert('开始改编！修改后可以保存为新作品');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.workshop = new MusicWorkshop();
});
