/**
 * UI Class
 * Manages all DOM manipulations, screen transitions, HUD updates,
 * and intricate CSS-based animations (like balloons falling and popping).
 */
class UI {
    constructor() {
        // Cache references to the core screen containers
        this.screens = {
            menu: document.getElementById('screen-main-menu'),
            levelSelect: document.getElementById('screen-level-select'),
            gameplay: document.getElementById('screen-gameplay'),
            result: document.getElementById('screen-result')
        };

        // Cache references to Heads-Up Display (HUD) elements
        this.scoreEl = document.getElementById('score');
        this.comboEl = document.getElementById('combo');
        this.comboContainerEl = document.querySelector('.combo-container');
        this.livesEl = document.getElementById('lives');
        
        // Cache Play area and interactive inputs
        this.playArea = document.getElementById('play-area');
        this.answerInput = document.getElementById('answer-input');
        this.answerForm = document.getElementById('answer-form');
        
        // Cache Level Grid container
        this.levelGrid = document.getElementById('level-grid');
        
        // Cache Result screen readouts
        this.resultTitleEl = document.getElementById('result-title');
        this.resultStarsEl = document.getElementById('result-stars');
        this.resultScoreEl = document.getElementById('result-score');
        this.resultMessageEl = document.getElementById('result-message');
        
        // Progress Bar
        this.progressBarEl = document.getElementById('progress-bar');
        
        // Aitana Companion
        this.aitanaBubble = document.getElementById('aitana-bubble');
        this.aitanaAvatar = document.getElementById('aitana-avatar');
        
        // Manage active balloon DOM elements by ID for easy tracking and removal
        this.activeBalloons = new Map();
        
        // Spanish dialogue arrays for Aitana
        this.dialogueCorrect = ["¡Genial!", "¡Muy bien!", "¡Excelente!", "¡Súper!", "¡Bravo!"];
        this.dialogueWrong = ["¡Ups!", "¡Intenta otra vez!", "¡Casi!", "¡Tú puedes!"];
        
        // Voice caching for TTS
        this.aitanaVoice = null;
        this.initTTS();
    }

    /**
     * Initializes the SpeechSynthesis API and selects a suitable Spanish female voice.
     */
    initTTS() {
        if (!('speechSynthesis' in window)) return;
        
        const setVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            // Try to find a Spanish voice, preferably a female sounding one (often default or indicated in name)
            // 'es-ES' indicates default Spanish from Spain
            const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
            // Prioritize specific known good voices if possible, otherwise just grab a Spanish one
            this.aitanaVoice = spanishVoices.find(v => v.name.includes('Monica')) || 
                               spanishVoices.find(v => v.name.includes('Helena')) ||
                               spanishVoices.find(v => v.lang === 'es-ES') || 
                               spanishVoices[0] || null;
        };

        // Voices are loaded asynchrnously
        setVoice();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = setVoice;
        }
    }

    /**
     * Transitions visibility between the main structural screens of the app.
     * @param {string} screenName - The key of the screen to activate ('menu', 'levelSelect', 'gameplay', 'result').
     */
    showScreen(screenName) {
        // Hide all screens first
        Object.values(this.screens).forEach(screen => {
            if(screen) {
                screen.classList.add('hidden');
                screen.classList.remove('active');
            }
        });
        
        // Activate requested screen after a tiny delay to ensure CSS transitions trigger nicely
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
            setTimeout(() => {
                this.screens[screenName].classList.add('active');
            }, 50); // 50ms ensures display:none resolves before animating opacity
        }
    }

    /**
     * Dynamically builds the grid of 10 level selector buttons.
     * @param {Array<number>} unlockedLevels - The array of currently unlocked level integers.
     * @param {Function} onSelect - Callback executed when a valid unlocked level is clicked.
     */
    generateLevelButtons(unlockedLevels, onSelect) {
        this.levelGrid.innerHTML = ''; // Clear out any existing buttons
        
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.classList.add('level-btn');
            
            // Assign a slight color tint to each button based on its index for a rainbow effect
            const hue = (i * 36) % 360; // 36 degrees * 10 levels = 360
            const bgColor = `hsl(${hue}, 80%, 90%)`;
            const borderColor = `hsl(${hue}, 80%, 70%)`;
            
            btn.style.backgroundColor = bgColor;
            btn.style.borderBottom = `8px solid ${borderColor}`; // Thicker border for large buttons
            
            // Label based on level logic (Levels 1-9 map to Tables 2-10. Level 10 is Mixed)
            if (i < 10) {
                btn.innerHTML = `Nivel ${i}<br><span style="font-size: 1rem; opacity: 0.8">(Tabla del ${i+1})</span>`;
            } else {
                btn.innerHTML = `Nivel 10<br><span style="font-size: 1rem; opacity: 0.8">(¡Jefe Mixto!)</span>`;
            }
            
            if (unlockedLevels.includes(i)) {
                // If unlocked, it's playable
                btn.addEventListener('click', () => onSelect(i));
            } else {
                // If locked, disable and dim it
                btn.classList.add('locked');
                btn.disabled = true;
            }
            
            this.levelGrid.appendChild(btn);
        }
    }

    /**
     * Syncs header metrics (score, combo, lives, progress bar) with the current Game state.
     * @param {Game} game - Active game instance details.
     */
    updateHUD(game) {
        this.scoreEl.innerText = game.score;
        this.comboEl.innerText = game.combo;
        
        // Only show Combo visually if it is greater than 1x
        if (game.combo > 1) {
            this.comboContainerEl.classList.remove('hidden');
        } else {
            this.comboContainerEl.classList.add('hidden');
        }
        
        // Visually represent health via heart emojis
        this.livesEl.innerText = '❤️'.repeat(game.lives) + '🖤'.repeat(3 - game.lives);
        
        // Update Progress Bar
        const percent = game.getProgressPercent();
        this.progressBarEl.style.width = `${percent}%`;
    }

    /**
     * Creates and animates a new balloon falling from the top of the screeen.
     * @param {Object} question - Payload containing text and balloon ID.
     * @param {Function} onMiss - Callback triggered if the balloon reaches the bottom unaided.
     */
    spawnBalloon(question, onMiss) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.innerText = question.text; // e.g. "5 x 3"
        
        // Insert into the DOM area
        this.playArea.appendChild(balloon);
        
        // Calculate dynamic randomized horizontal placement
        const playAreaWidth = this.playArea.offsetWidth;
        // Balloon approx width is ~120px. Keep it fully inside constraints.
        const maxLeft = Math.max(0, playAreaWidth - 120);
        const startX = Math.random() * maxLeft;
        
        balloon.style.left = `${startX}px`;
        balloon.style.top = '-100px'; // Start out of sight above the screen
        
        // Pick from an array of vibrant, child-friendly colors
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C', '#9B5DE5'];
        balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        // Reading offsetWidth forces the browser to reflow, applying the start positions immediately
        // before we define the end positions and transition timings.
        void balloon.offsetWidth;

        // Animate downward. Randomize slightly how long it takes to fall (8s - 12s on early levels)
        const duration = 8000 + Math.random() * 4000;
        
        balloon.style.transition = `top ${duration}ms linear`;
        // Target Y coord is just off the bottom edge
        balloon.style.top = `${this.playArea.offsetHeight + 50}px`;

        // Start a fallback timer that fires exactly when the CSS animation finishes
        const missTimer = setTimeout(() => {
            if (this.playArea.contains(balloon)) {
                // Balloon hit the floor! Delete and notify game logic.
                this.activeBalloons.delete(question.id);
                onMiss(question.id, balloon);
            }
        }, duration);

        // Catalog the balloon details
        this.activeBalloons.set(question.id, {
            element: balloon,
            timer: missTimer
        });
    }

    /**
     * Triggers the visual destruction sequence of a balloon upon answering or missing.
     * @param {string} questionId - ID referencing the mapped balloon.
     * @param {boolean} isCorrect - Governs which CSS animation sequence runs.
     * @param {number} points - Points earned for this interaction.
     */
    popBalloon(questionId, isCorrect = true, points = 0) {
        const balloonData = this.activeBalloons.get(questionId);
        if (balloonData) {
            // Cancel the 'miss' fallback since we are handling its destruction now
            clearTimeout(balloonData.timer);
            
            const el = balloonData.element;
            // Freeze the balloon mid-air by fetching its currently computed top translation
            const computedTop = window.getComputedStyle(el).top;
            el.style.transition = 'none'; // Halt all movement
            el.style.top = computedTop;   // Lock it in place
            
            if (isCorrect) {
                // Correct answer gives a satisfying star and green glow
                el.classList.add('pop-correct');
                el.innerHTML = '✨';
                el.style.backgroundColor = 'var(--color-correct)';
                
                // Fancy Rewards: Star explosion and floating text
                this.spawnStars(el);
                if (points > 0) {
                    this.spawnFloatingScore(el, points);
                }
                
                // Aitana Cheer
                const msg = this.dialogueCorrect[Math.floor(Math.random() * this.dialogueCorrect.length)];
                this.showAitanaMessage(msg, 'correct');
                
            } else {
                // Misses or wrong answers fall sadly greyscale with a funny bounce
                el.classList.add('pop-wrong');
                el.style.backgroundColor = 'var(--color-wrong)';
                
                // Aitana Encouragement
                const msg = this.dialogueWrong[Math.floor(Math.random() * this.dialogueWrong.length)];
                this.showAitanaMessage(msg, 'wrong');
            }
            
            // Clean up the DOM element entirely after the CSS scale/fade completes
            setTimeout(() => {
                if (this.playArea.contains(el)) {
                    this.playArea.removeChild(el);
                }
            }, 1000); // Wait 1s to allow full bounce/fade animation
            
            this.activeBalloons.delete(questionId);
        }
    }

    /**
     * Spawns a radial burst of CSS animated stars centered on the given element.
     * @param {HTMLElement} balloonElement - The reference element to burst from.
     */
    spawnStars(balloonElement) {
        const rect = balloonElement.getBoundingClientRect();
        const playAreaRect = this.playArea.getBoundingClientRect();
        
        // Calculate center of balloon relative to play-area
        const centerX = rect.left - playAreaRect.left + rect.width / 2;
        const centerY = rect.top - playAreaRect.top + rect.height / 2;
        
        const numStars = 6;
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star-particle';
            star.innerText = '⭐';
            star.style.left = `${centerX - 10}px`;
            star.style.top = `${centerY - 10}px`;
            
            // Send stars outwards in a circle
            const angle = (i * (360 / numStars)) * (Math.PI / 180);
            const distance = 80 + Math.random() * 40;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            star.style.setProperty('--tx', `${tx}px`);
            star.style.setProperty('--ty', `${ty}px`);
            
            this.playArea.appendChild(star);
            
            setTimeout(() => {
                if(this.playArea.contains(star)) this.playArea.removeChild(star);
            }, 800);
        }
    }

    /**
     * Creates ascending floating text to visualize earned score.
     */
    spawnFloatingScore(balloonElement, score) {
        const rect = balloonElement.getBoundingClientRect();
        const playAreaRect = this.playArea.getBoundingClientRect();
        
        const centerX = rect.left - playAreaRect.left + rect.width / 2;
        const centerY = rect.top - playAreaRect.top; // Spawn near the top of balloon
        
        const floatText = document.createElement('div');
        floatText.className = 'floating-score';
        floatText.innerText = `+${score}`;
        
        // Center text on the balloon
        floatText.style.left = `${centerX}px`;
        floatText.style.top = `${centerY - 20}px`;
        floatText.style.transform = `translateX(-50%)`;
        
        this.playArea.appendChild(floatText);
        
        setTimeout(() => {
            if(this.playArea.contains(floatText)) this.playArea.removeChild(floatText);
        }, 1000);
    }

    /**
     * Immediately destroys all balloons remaining on screen.
     * Used when the level ends abruptly or is won.
     */
    clearAllBalloons() {
        this.activeBalloons.forEach((data, id) => {
            clearTimeout(data.timer);
            if (this.playArea.contains(data.element)) {
                this.playArea.removeChild(data.element);
            }
        });
        this.activeBalloons.clear();
    }

    /**
     * Auto-focuses the text input field so the child doesn't need to manually click it repeatedly.
     */
    focusInput() {
        this.answerInput.value = '';
        this.answerInput.focus();
    }

    /**
     * Maps Final Grade details onto the Result Screen and displays it.
     * @param {Game} game - Game metadata for final stats.
     * @param {boolean} win - Modifies the language shown (Victory vs Try Again)
     */
    showResultScreen(game, win) {
        this.resultScoreEl.innerText = game.score;
        this.resultStarsEl.innerText = '⭐'.repeat(game.calculateStars());
        
        if (win) {
            this.resultTitleEl.innerText = `¡Nivel ${game.currentLevel} Completado!`;
            this.resultTitleEl.style.color = 'var(--color-correct)';
            this.resultMessageEl.innerText = "¡Excelente trabajo! ¡Sigue así!";
        } else {
            this.resultTitleEl.innerText = "¡Juego Terminado!";
            this.resultTitleEl.style.color = 'var(--color-wrong)';
            this.resultMessageEl.innerText = "¡No te rindas! La práctica hace al maestro.";
            this.resultStarsEl.innerText = "❌";
        }

        this.showScreen('result');
    }

    /**
     * Briefly displays a Spanish message in Aitana's speech bubble, speaks it aloud, and updates her animated GIF.
     * @param {string} text - The text to display and speak.
     * @param {string} type - 'correct' or 'wrong' for styling.
     */
    showAitanaMessage(text, type) {
        if(this.bubbleTimer) clearTimeout(this.bubbleTimer);
        
        this.aitanaBubble.innerText = text;
        this.aitanaBubble.style.color = type === 'correct' ? 'var(--color-correct)' : 'var(--color-wrong)';
        
        // Swap to the reaction GIF
        this.aitanaAvatar.src = type === 'correct' ? 'assets/aitana_happy.gif' : 'assets/aitana_sad.gif';
        
        // Show bubble
        this.aitanaBubble.classList.remove('hidden');
        
        // Hide after an interval and restore normal GIF
        this.bubbleTimer = setTimeout(() => {
            this.aitanaBubble.classList.add('hidden');
            this.aitanaAvatar.src = 'assets/aitana_normal.gif';
        }, 3000); // Increased slightly to let the GIF play out

        // Vocalize using Web Speech API TTS
        this.speak(text);
    }

    /**
     * Wrapper to trigger Web Speech API text-to-speech.
     * @param {string} text - Text to speak.
     */
    speak(text) {
        if (!('speechSynthesis' in window)) return;
        
        // Optional: Cut off any currently playing speech to keep it responsive and punchy
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.aitanaVoice) {
            utterance.voice = this.aitanaVoice;
        } else {
            utterance.lang = 'es-ES'; // Fallback
        }
        
        // Tweak voice characteristics for a cuter, friendlier presentation
        utterance.pitch = 1.3;
        utterance.rate = 1.1;
        
        window.speechSynthesis.speak(utterance);
    }

    /**
     * Overlays a brief semi-transparent tint over the whole application to provide
     * broad visual feedback (red flash for wrong, green flash for correct).
     * @param {string} type - 'correct' or 'wrong'
     */
    flashScreen(type) {
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.top = 0;
        flash.style.left = 0;
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.zIndex = 100;
        flash.style.pointerEvents = 'none'; // Important: do not block clicks
        flash.style.transition = 'background-color 0.3s ease';
        
        if (type === 'correct') {
            flash.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
        } else if (type === 'wrong') {
            flash.style.backgroundColor = 'rgba(244, 67, 54, 0.3)';
        }
        
        document.body.appendChild(flash);
        
        // Dissolve back out rapidly
        setTimeout(() => {
            flash.style.backgroundColor = 'transparent';
            setTimeout(() => {
                if(document.body.contains(flash)) document.body.removeChild(flash);
            }, 300);
        }, 100);
    }
}
