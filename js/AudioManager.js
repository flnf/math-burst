/**
 * AudioManager Class
 * Utilizes the native Web Audio API to synthesize application sound effects procedurally.
 * This avoids the need for external .mp3 files and provides instant playback across browsers.
 */
class AudioManager {
    constructor() {
        // Initialize the Audio Context, handling vendor prefixes for Safari
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a master gain (volume) node to prevent sounds from being too loud
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.3; // Limit global volume to 30%
        this.masterGain.connect(this.audioCtx.destination);
    }

    /**
     * Underlying helper function to schedule and play a generic synthesized waveform.
     * @param {number} frequency - The pitch of the sound in Hz.
     * @param {string} type - The waveform type ('sine', 'square', 'sawtooth', 'triangle').
     * @param {number} duration - The duration of the sound in seconds.
     */
    playTone(frequency, type, duration) {
        // Many browsers suspend AudioContext until user interaction; resume if needed.
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
        
        // Apply an envelope to prevent harsh clicking at the start/end of the tone:
        // Start at full volume...
        gainNode.gain.setValueAtTime(1, this.audioCtx.currentTime);
        // ...and quickly decay down to near zero over the requested duration.
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        
        // Wire up the nodes: oscillator -> gain -> masterGain
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Schedule start and stop points
        oscillator.start(this.audioCtx.currentTime);
        oscillator.stop(this.audioCtx.currentTime + duration);
    }

    /**
     * Plays an upbeat, ascending arpeggio signifying a correct answer.
     */
    playCorrect() {
        // Chords: C5 -> E5 -> G5 over quick succession
        this.playTone(523.25, 'sine', 0.1);         // C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.1), 50);  // E5
        setTimeout(() => this.playTone(783.99, 'sine', 0.2), 100); // G5
    }

    /**
     * Plays a buzzing, slightly dissonant tone indicating a wrong answer.
     */
    playWrong() {
        // Sawtooth wave sounds harsh and 'buzzy', perfect for an error.
        this.playTone(150, 'sawtooth', 0.3);
    }

    /**
     * Plays a short, gentle pop for general UI interactions (button clicks, menus).
     */
    playPop() {
        this.playTone(800, 'sine', 0.05);
    }

    /**
     * Plays a triumphant fanfare sequence for clearing a level.
     */
    playWin() {
        const notes = [440, 554.37, 659.25, 880]; // A Major Arpeggio: A4, C#5, E5, A5
        notes.forEach((freq, index) => {
            // Square waves give an energetic, 8-bit retro gaming feel
            setTimeout(() => {
                this.playTone(freq, 'square', 0.2 + (index === 3 ? 0.4 : 0));
            }, index * 150);
        });
    }

    /**
     * Plays a descending, minor sequence indicating game over or life lost.
     */
    playGameOver() {
        const notes = [440, 415.30, 392.00, 349.23]; // Descending sad notes: A4, Ab4, G4, F4
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 'sawtooth', 0.3 + (index === 3 ? 0.5 : 0));
            }, index * 300);
        });
    }
}
