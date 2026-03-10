/**
 * Game Class
 * Manages the core game state, score tracking, combo multipliers,
 * player lives, and progression (unlocking new tables).
 */
class Game {
    constructor() {
        // Core game metrics
        this.score = 0;
        this.combo = 1;
        this.lives = 3;
        
        // Current level status
        this.currentLevel = 1; /* Maps Level 1-10 to tables and mixed modes */
        this.isPlaying = false;
        
        // Game progression configuration
        this.pointsPerCorrect = 10;
        this.questionsPerLevel = 15; // Increased slightly for better progress bar visualization
        this.questionsCompleted = 0;
        
        // Load persistently saved progress, or default to having level 1 unlocked
        this.unlockedLevels = this.loadProgress();
    }

    /**
     * Initializes a new level.
     * @param {number} levelNumber - The level to play (1-10).
     */
    startLevel(levelNumber) {
        this.currentLevel = levelNumber;
        this.score = 0;
        this.combo = 1;
        this.lives = 3;
        this.questionsCompleted = 0;
        this.isPlaying = true;
        
        console.log(`Starting Level: ${this.currentLevel}`);
    }

    /**
     * Ends the current level and optionally handles victory logic.
     * @param {boolean} win - True if the player completed the level successfully.
     */
    endLevel(win = false) {
        this.isPlaying = false;
        if (win) {
            this.unlockNextLevel();
        }
    }

    /**
     * Adds points to the score based on the current combo multiplier.
     * @returns {Object} Metrics regarding the score update and whether the level is complete.
     */
    addScore() {
        const points = this.pointsPerCorrect * this.combo;
        this.score += points;
        this.incrementCombo();
        this.questionsCompleted++;
        
        return {
            pointsAdded: points,
            newScore: this.score,
            levelComplete: this.questionsCompleted >= this.questionsPerLevel
        };
    }

    /**
     * Increases the combo multiplier to reward consecutive correct answers.
     * Capped at a maximum multiplier (e.g., x5).
     */
    incrementCombo() {
        this.combo++;
        if (this.combo > 5) this.combo = 5;
    }

    /**
     * Resets the combo multiplier back to x1, usually upon an incorrect answer.
     */
    resetCombo() {
        this.combo = 1;
    }

    /**
     * Deducts one life from the player and resets their combo.
     * @returns {boolean} True if the player has 0 or fewer lives remaining (Game Over).
     */
    loseLife() {
        this.lives--;
        this.resetCombo();
        return this.lives <= 0;
    }

    /**
     * Returns the current completion percentage for the level's progress bar.
     * @returns {number} Percentage between 0 and 100.
     */
    getProgressPercent() {
        if (this.questionsPerLevel === 0) return 0;
        return (this.questionsCompleted / this.questionsPerLevel) * 100;
    }

    /**
     * Unlocks the next level if it is not already unlocked.
     * Automatically saves progress to local storage.
     */
    unlockNextLevel() {
        const nextLevel = this.currentLevel + 1;
        // Cap progression at level 10
        if (nextLevel <= 10 && !this.unlockedLevels.includes(nextLevel)) {
            this.unlockedLevels.push(nextLevel);
            this.saveProgress();
        }
    }

    /**
     * Serializes and saves the array of unlocked levels to browser localStorage.
     */
    saveProgress() {
        try {
            localStorage.setItem('mathBurstLevelProgress', JSON.stringify(this.unlockedLevels));
        } catch (e) {
            console.warn('Could not save progress to localStorage', e);
        }
    }

    /**
     * Retrieves the array of previously unlocked levels from browser localStorage.
     * @returns {Array<number>} An array of unlocked level numbers.
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('mathBurstLevelProgress');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load progress from localStorage', e);
        }
        // Always return at least Level 1 unlocked if no save data exists
        return [1];
    }

    /**
     * Determines how many stars the player earns based on their remaining lives.
     * @returns {number} The star rating (1 to 3).
     */
    calculateStars() {
        if (this.lives === 3) return 3;
        if (this.lives === 2) return 2;
        return 1;
    }
}
