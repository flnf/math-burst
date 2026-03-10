/**
 * LevelManager Class
 * Responsible for generating math questions based on the active multiplication table,
 * managing the list of active questions currently displayed on screen,
 * and validating the user's answers against those questions.
 */
class LevelManager {
    /**
     * Initializes the LevelManager with a reference to the main Game state.
     * @param {Game} gameInstance - The active Game instance.
     */
    constructor(gameInstance) {
        this.game = gameInstance;
        this.activeQuestions = []; // Stores objects representing the balloons currently on screen
    }

    /**
     * Generates a new random math question based on the current level.
     * Level N maps to Table (N+1). So Level 1 is Table 2. Level 9 is Table 10.
     * Level 10 makes problems across Tables 2 through 10 randomly.
     * Multipliers are randomly chosen between 1 and 10.
     * @returns {Object} The generated question data containing id, text, answer, etc.
     */
    generateQuestion() {
        const level = this.game.currentLevel;
        let table;
        
        if (level < 10) {
            table = level + 1; // Level 1 -> Table 2 
        } else {
            // Level 10 (Boss Level): Pick a random table between 2 and 10
            table = Math.floor(Math.random() * 9) + 2; 
        }

        // Generate a random multiplier from 1 to 10
        const multiplier = Math.floor(Math.random() * 10) + 1;
        
        // Calculate the correct answer
        const answer = table * multiplier;
        // Format the string displayed to the user
        const text = `${table} x ${multiplier}`;

        // Create a unique question context payload
        const questionContent = {
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            text: text,
            answer: answer,
            table: table,
            multiplier: multiplier
        };

        // Add to tracking array
        this.activeQuestions.push(questionContent);
        return questionContent;
    }

    /**
     * Removes a specific question from the active list by its ID.
     * Called when a balloon hits the ground (missed).
     * @param {string} id - The unique identifier of the question to remove.
     */
    removeQuestion(id) {
        this.activeQuestions = this.activeQuestions.filter(q => q.id !== id);
    }

    /**
     * Evaluates the player's typed input to see if it correctly answers any active question.
     * @param {string|number} playerInput - The numerical answer inputted by the user.
     * @returns {Object} An object indicating if the answer was correct, and optionally which question it matched.
     */
    checkAnswer(playerInput) {
        const numericInput = parseInt(playerInput, 10);
        
        // Look through all currently active questions to see if the inputted number matches any of their answers
        const matchedIndex = this.activeQuestions.findIndex(q => q.answer === numericInput);
        
        if (matchedIndex !== -1) {
            // A match was found!
            const matchedQuestion = this.activeQuestions[matchedIndex];
            
            // Remove the matched question from the active array so it can no longer be answered
            this.activeQuestions.splice(matchedIndex, 1);
            
            return { correct: true, question: matchedQuestion };
        }
        
        // No match found
        return { correct: false };
    }
}
