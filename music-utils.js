export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const START_OCTAVE = 0;
export const END_OCTAVE = 8;
export const NOTE_HEIGHT = 22;
export const STEP_WIDTH = 30;
export const STEPS_PER_BEAT = 4;
export const TOTAL_STEPS = 64;

export const CHORD_NOTES = {
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

export const CHORD_PROGRESSIONS = [
    ['C', 'Am', 'F', 'G'],
    ['C', 'G', 'Am', 'F'],
    ['Am', 'F', 'C', 'G'],
    ['F', 'G', 'Am', 'F'],
    ['C', 'Dm', 'Em', 'F'],
    ['G', 'Em', 'C', 'D'],
];

export function midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function frequencyToMidi(frequency) {
    return Math.round(69 + 12 * Math.log2(frequency / 440));
}

export function midiToNoteName(midiNote) {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function noteNameToMidi(noteName) {
    const match = noteName.match(/([A-G]#?)(-?\d+)/);
    if (!match) return null;
    
    const [, note, octave] = match;
    const noteIndex = NOTE_NAMES.indexOf(note);
    if (noteIndex === -1) return null;
    
    return (parseInt(octave) + 1) * 12 + noteIndex;
}

export function stepToTime(step, tempo, stepsPerBeat = STEPS_PER_BEAT) {
    const beatsPerSecond = tempo / 60;
    const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
    return step * secondsPerStep * 1000;
}

export function timeToStep(timeMs, tempo, stepsPerBeat = STEPS_PER_BEAT) {
    const beatsPerSecond = tempo / 60;
    const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
    return Math.round(timeMs / (secondsPerStep * 1000));
}

export function getChordNotes(chordName, baseOctave = 4) {
    const intervals = CHORD_NOTES[chordName];
    if (!intervals) return [];
    
    const baseMidi = (baseOctave + 1) * 12;
    return intervals.map(interval => baseMidi + interval);
}

export function validateNote(note) {
    if (!note || typeof note !== 'object') return false;
    if (typeof note.step !== 'number' || note.step < 0 || note.step >= TOTAL_STEPS) return false;
    if (typeof note.midiNote !== 'number' || note.midiNote < 0 || note.midiNote > 127) return false;
    if (typeof note.duration !== 'number' || note.duration < 1) return false;
    return true;
}

export function validateWork(work) {
    if (!work || typeof work !== 'object') return false;
    if (typeof work.name !== 'string' || work.name.trim() === '') return false;
    if (typeof work.tempo !== 'number' || work.tempo < 20 || work.tempo > 300) return false;
    if (!Array.isArray(work.notes)) return false;
    if (!work.notes.every(validateNote)) return false;
    if (work.chords && !Array.isArray(work.chords)) return false;
    if (work.drums && typeof work.drums !== 'object') return false;
    return true;
}

export function serializeWork(work) {
    return JSON.stringify({
        name: work.name,
        description: work.description || '',
        tempo: work.tempo,
        timeSignature: work.timeSignature || '4/4',
        keySignature: work.keySignature || 'C',
        notes: work.notes.map(n => ({
            step: Math.round(n.step),
            midiNote: Math.round(n.midiNote),
            duration: Math.round(n.duration)
        })),
        chords: work.chords || [],
        drums: work.drums || {},
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
    }, null, 2);
}

export function deserializeWork(jsonString) {
    try {
        const work = JSON.parse(jsonString);
        if (!validateWork(work)) {
            throw new Error('Invalid work data');
        }
        return work;
    } catch (e) {
        throw new Error(`Failed to deserialize work: ${e.message}`);
    }
}

export function calculateNoteTiming(notes, tempo) {
    return notes.map(note => ({
        ...note,
        startTime: stepToTime(note.step, tempo),
        durationMs: stepToTime(note.duration, tempo)
    }));
}

export function checkTrackSync(trackNotes, tempo, toleranceMs = 10) {
    const timing = calculateNoteTiming(trackNotes, tempo);
    const beatMs = (60 / tempo) * 1000;
    
    return timing.every(note => {
        const beatOffset = note.startTime % beatMs;
        return beatOffset < toleranceMs || (beatMs - beatOffset) < toleranceMs;
    });
}

export function calculateTimingError(expected, actual) {
    return Math.abs(expected - actual);
}

export function mergeTracks(...tracks) {
    const allNotes = tracks.flat();
    return allNotes.sort((a, b) => a.step - b.step);
}

export function quantizeNote(note, grid = 1) {
    return {
        ...note,
        step: Math.round(note.step / grid) * grid,
        duration: Math.max(1, Math.round(note.duration / grid) * grid)
    };
}

export default {
    NOTE_NAMES,
    CHORD_NOTES,
    CHORD_PROGRESSIONS,
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
    quantizeNote
};
