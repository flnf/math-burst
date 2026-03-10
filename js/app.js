/**
 * Main Application Bootstrapper
 * Binds everything together: instantiates classes, sets up DOM event listeners,
 * and maintains the overarching timer cycles of the gameplay loop.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main operational Singletons
    const game = new Game();
    const levelManager = new LevelManager(game);
    const audio = new AudioManager();
    const ui = new UI();

    // Context tracking for the async balloon spawner loops
    let spawnTimer;
    let spawnRate = 3500; // Time in milliseconds between balloon drops

    /* ============================================================
       Event Listeners Setup
       ============================================================ */
    
    // Main Menu -> Play Button
    document.getElementById('btn-start').addEventListener('click', () => {
        // Prepare the level grid with locked/unlocked statuses
        ui.generateLevelButtons(game.unlockedLevels, startGame);
        ui.showScreen('levelSelect');
        audio.playPop();
        
        // iOS/Safari demand audio contexts securely resume via direct user intervention
        if(audio.audioCtx.state === 'suspended') {
            audio.audioCtx.resume();
        }
    });

/* ============================================================
   PWA Service Worker and Installation Logic
   ============================================================ */

let deferredPrompt;
const installBtn = document.getElementById('btn-install');

// Detects if device is on iOS 
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};
// Detects if device is in standalone mode
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

// Register the Service Worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

if (isIos() && !isInStandaloneMode()) {
    // Reveal the button specifically for iOS Users, but change functionality to an explanatory alert.
    if(installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', () => {
            alert("Para instalar en iOS/iPadOS: toca el icono de 'Compartir' (el cuadrado con la flecha) y luego selecciona 'Añadir a la pantalla de inicio'.");
        });
    }
} else {
    // Handle the standard Chrome/Android install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        if(installBtn) {
            installBtn.classList.remove('hidden');
        }
    });

    if(installBtn) {
        installBtn.addEventListener('click', async () => {
            // Hide the app provided install promotion
            installBtn.classList.add('hidden');
            // Show the install prompt
            if (deferredPrompt) {
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
            }
            // For Desktop Safari or unexpected states that bypassed the iOS check
            else {
                alert("Si la instalación no se inicia automáticamente, abre el menú de tu navegador y busca la opción 'Instalar' o 'Añadir a la pantalla de inicio'.");
                installBtn.classList.remove('hidden');
            }
        });
    }
}

    // Level Select -> Back Button
    document.getElementById('btn-back-menu').addEventListener('click', () => {
        ui.showScreen('menu');
        audio.playPop();
    });

    // Gameplay -> Submitting an Answer (Triggers when Player types an answer and hits enter/pop)
    ui.answerForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Stop page reload
        
        const inputVal = ui.answerInput.value.trim();
        if (inputVal === '') return; // Ignore blank submissions

        // Let the level manager assess the player's hypothesis against floating balloons
        const result = levelManager.checkAnswer(inputVal);
        
        if (result.correct) {
            // Evaluate scoring logic and progression
            const scoreUpdate = game.addScore();
            
            // Output positive multifaceted feedback
            audio.playCorrect();
            ui.popBalloon(result.question.id, true, scoreUpdate.pointsAdded);
            ui.flashScreen('correct');
            ui.updateHUD(game);
            
            // Check win scenarios
            if (scoreUpdate.levelComplete) {
                endGame(true);
            }
        } else {
            // Negative Feedback: Reset combos, sound buzzer, shake the input UI to imply 'try again'
            game.resetCombo();
            audio.playWrong();
            ui.flashScreen('wrong');
            ui.updateHUD(game);
            
            // Inject minor CSS shake animation on the text component
            ui.answerInput.classList.add('shake');
            setTimeout(() => ui.answerInput.classList.remove('shake'), 400);
        }
        
        ui.focusInput(); // Always place cursor back in the text field immediately post-guess
    });

    // Result Screen -> Try pattern again
    document.getElementById('btn-retry').addEventListener('click', () => {
        startGame(game.currentLevel);
        audio.playPop();
    });

    // Result Screen -> Continue to next iteration
    document.getElementById('btn-next-level').addEventListener('click', () => {
        let next = game.currentLevel + 1;
        if (next > 10) next = 10; // Enforce maximum bounds limits
        startGame(next);
        audio.playPop();
    });

    // Result Screen -> Back out to selection modal
    document.getElementById('btn-menu-from-result').addEventListener('click', () => {
        ui.generateLevelButtons(game.unlockedLevels, startGame);
        ui.showScreen('levelSelect');
        audio.playPop();
    });


    /* ============================================================
       Game Flow Orchestration Loops
       ============================================================ */

    /**
     * Engages initialization resets preparing memory and UI buffers for a level attempt.
     * @param {number} levelNumber - The numerical scope (1-10) defining parameter limits.
     */
    function startGame(levelNumber) {
        audio.playPop();
        
        // Zero-out and refresh internal states
        game.startLevel(levelNumber);
        levelManager.activeQuestions = [];
        ui.clearAllBalloons(); // Flush any stale artifact balloons from older rounds
        
        // Push fresh data directly onto UI canvas
        ui.updateHUD(game);
        ui.showScreen('gameplay');
        ui.focusInput();
        
        // Reboot cyclical spawn behavior with baseline timings
        spawnRate = 3500; 
        if(spawnTimer) clearTimeout(spawnTimer);
        
        // Buffer 1 full second before launching the initial assault so kid is ready
        setTimeout(spawnCycle, 1000);
    }

    /**
     * Recursive delayed-loop managing periodic balloon generation.
     */
    function spawnCycle() {
        if (!game.isPlaying) return; // Break loop if level concluded
        
        // Assemble and draw entirely fresh question
        const question = levelManager.generateQuestion();
        ui.spawnBalloon(question, handleMiss); // Provide fail callback if untouched
        
        // Accelerate cadence incrementally to escalate gameplay tension
        spawnRate = Math.max(1500, spawnRate - 100); 
        
        // Decide if we should queue up the NEXT drop, assuming limit not reached
        if (game.questionsCompleted < game.questionsPerLevel && game.isPlaying) {
            spawnTimer = setTimeout(spawnCycle, spawnRate);
        }
    }

    /**
     * Dispatched exactly when an un-answered balloon reaches screen bottom.
     * @param {string} questionId - Hash of dropping payload.
     * @param {HTMLElement} balloonElement - Attached DOM entity.
     */
    function handleMiss(questionId, balloonElement) {
        // Purge backend record 
        levelManager.removeQuestion(questionId);
        
        // Process visual/audio destruction
        ui.popBalloon(questionId, false);
        audio.playWrong();
        ui.flashScreen('wrong');
        
        // Deduct lives, and react immediately if this penalty causes game over
        const isGameOver = game.loseLife();
        ui.updateHUD(game);
        
        if (isGameOver) {
            endGame(false);
        }
    }

    /**
     * Terminates all active gameplay states and pivots app logic over to final-result summaries.
     * @param {boolean} win - Modifies the language shown (Victory vs Try Again)
     */
    function endGame(win) {
        game.endLevel(win);
        clearTimeout(spawnTimer); // Halts generation loops intrinsically
        ui.clearAllBalloons();
        
        if (win) {
            audio.playWin();
        } else {
            audio.playGameOver();
        }
        
        // Allow brief visual digestion interval before completely yanking user out of the space
        setTimeout(() => {
            ui.showResultScreen(game, win);
            
            // Logically toggle the 'Next Level' action visibility based on performance capabilities
            const btnNext = document.getElementById('btn-next-level');
            if(win && game.currentLevel < 10) {
                btnNext.style.display = 'inline-block';
            } else {
                btnNext.style.display = 'none';
            }
        }, 1000);
    }

});
