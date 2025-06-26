const display = document.getElementById('display');
const buttons = document.querySelectorAll('.buttons button');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const historyToggle = document.getElementById('history-toggle');
const mobileHistoryOverlay = document.getElementById('mobile-history-overlay');
const mobileHistoryList = document.getElementById('mobile-history-list');
const closeHistory = document.getElementById('close-history');
const mobileClearHistory = document.getElementById('mobile-clear-history');
const loginSection = document.getElementById('login-section');
const calculatorContainer = document.getElementById('calculator-container');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const historyUsername = document.querySelector('.history-username');
const historyCount = document.querySelector('.history-count');
const historyLoading = document.getElementById('history-loading');
const mobileCurrentUser = document.getElementById('mobile-current-user');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
const mobileHistoryUsername = document.querySelector('.mobile-history-username');
const mobileHistoryCount = document.querySelector('.mobile-history-count');
const mobileHistoryLoading = document.getElementById('mobile-history-loading');

let currentInput = '';
let calculationHistory = [];
let currentUsername = '';
let justCalculated = false;

function setRandomBackground() {
    const randomId = Math.floor(Math.random() * 1000) + 1;
    const imageUrl = `https://picsum.photos/1920/1080?random=${randomId}`;
    document.body.style.background = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${imageUrl}') no-repeat center center fixed`;
    document.body.style.backgroundSize = 'cover';
}

setRandomBackground();

function checkLoginStatus() {
    const savedUsername = localStorage.getItem('currentUsername');
    if (savedUsername) {
        currentUsername = savedUsername;
        showCalculator();
        loadHistoryFromFirebase();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginSection.style.display = 'flex';
    calculatorContainer.style.display = 'none';
}

function showCalculator() {
    loginSection.style.display = 'none';
    calculatorContainer.style.display = 'flex';
    currentUserSpan.textContent = `Welcome, ${currentUsername}!`;
    if (mobileCurrentUser) {
        mobileCurrentUser.textContent = `Welcome, ${currentUsername}!`;
    }
    updateHistoryUserInfo();
}

function login() {
    const username = usernameInput.value.trim().toLowerCase();
    if (username.length < 3) {
        alert('Username must be at least 3 characters long');
        return;
    }
    
    currentUsername = username;
    localStorage.setItem('currentUsername', username);
    showCalculator();
    loadHistoryFromFirebase();
    usernameInput.value = '';
}

function logout() {
    currentUsername = '';
    calculationHistory = [];
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('calculatorHistory');
    
    // Hide mobile history overlay if it's open
    if (mobileHistoryOverlay) {
        mobileHistoryOverlay.style.display = 'none';
    }
    
    showLogin();
    updateHistoryDisplay();
}

function showHistoryLoading() {
    if (historyLoading) {
        historyLoading.classList.remove('hidden');
    }
    if (mobileHistoryLoading) {
        mobileHistoryLoading.classList.remove('hidden');
    }
}

function hideHistoryLoading() {
    if (historyLoading) {
        historyLoading.classList.add('hidden');
    }
    if (mobileHistoryLoading) {
        mobileHistoryLoading.classList.add('hidden');
    }
}

async function saveHistoryToFirebase() {
    if (!currentUsername) return;
    
    try {
        await db.collection('calculator_history').doc(currentUsername).set({
            history: calculationHistory,
            lastUpdated: new Date(),
            username: currentUsername
        });
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }
}

async function loadHistoryFromFirebase() {
    if (!currentUsername) return;
    
    showHistoryLoading();
    
    try {
        const doc = await db.collection('calculator_history').doc(currentUsername).get();
        if (doc.exists) {
            const data = doc.data();
            calculationHistory = data.history || [];
            updateHistoryDisplay();
        } else {
            calculationHistory = [];
            updateHistoryDisplay();
        }
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        loadFromLocalStorage();
    } finally {
        hideHistoryLoading();
    }
}

function loadFromLocalStorage() {
    if (localStorage.getItem('calculatorHistory')) {
        calculationHistory = JSON.parse(localStorage.getItem('calculatorHistory'));
        updateHistoryDisplay();
    }
}

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

// Ensure mobile logout button is properly set up
function setupMobileLogout() {
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        // Remove any existing event listeners to prevent duplicates
        mobileLogoutBtn.removeEventListener('click', logout);
        mobileLogoutBtn.addEventListener('click', logout);
        console.log('Mobile logout button event listener attached');
    } else {
        console.log('Mobile logout button not found');
    }
}

// Set up mobile logout when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileLogout);
} else {
    setupMobileLogout();
}

// Also set up mobile logout when history overlay is shown
historyToggle.addEventListener('click', () => {
    mobileHistoryOverlay.style.display = 'flex';
    // Ensure mobile logout is set up when overlay is shown
    setTimeout(setupMobileLogout, 100);
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

checkLoginStatus();

buttons.forEach(button => {
    button.addEventListener('click', () => {
        let value = '';
        
        if (button.querySelector('i')) {
            const icon = button.querySelector('i');
            if (icon.classList.contains('fa-backspace')) value = '⌫';
            else if (icon.classList.contains('fa-percentage')) value = '%';
            else if (icon.classList.contains('fa-divide')) value = '/';
            else if (icon.classList.contains('fa-times')) value = '*';
            else if (icon.classList.contains('fa-minus')) value = '-';
            else if (icon.classList.contains('fa-plus')) value = '+';
            else if (icon.classList.contains('fa-equals')) value = '=';
        } else {
            value = button.textContent;
        }
        
        if (value === 'C') {
            currentInput = '';
            display.value = '';
            justCalculated = false;
        } else if (value === '⌫') {
            currentInput = currentInput.slice(0, -1);
            display.value = currentInput;
            justCalculated = false;
        } else if (value === '=') {
            try {
                // Check for division by zero before calculating
                if (currentInput.includes('/0') && !currentInput.includes('/0.')) {
                    // Check if it's actually division by zero (not just a number containing 0)
                    const parts = currentInput.split(/([+\-*/])/);
                    for (let i = 0; i < parts.length - 2; i++) {
                        if (parts[i + 1] === '/' && parts[i + 2] === '0') {
                            display.value = "Can't divide by zero";
                            
                            // Add to history
                            const calculation = `${currentInput} = Can't divide by zero`;
                            const now = new Date();
                            const datetime = now.toLocaleString();
                            const historyEntry = {
                                calculation: calculation,
                                datetime: datetime
                            };
                            
                            calculationHistory.unshift(historyEntry);
                            localStorage.setItem('calculatorHistory', JSON.stringify(calculationHistory));
                            saveHistoryToFirebase();
                            updateHistoryDisplay();
                            
                            // Keep the original input for reference
                            const originalInput = currentInput;
                            currentInput = originalInput;
                            justCalculated = false;
                            return;
                        }
                    }
                }
                
                const result = eval(currentInput);
                const calculation = `${currentInput} = ${result}`;
                const now = new Date();
                const datetime = now.toLocaleString();
                const historyEntry = {
                    calculation: calculation,
                    datetime: datetime
                };
                
                calculationHistory.unshift(historyEntry);
                localStorage.setItem('calculatorHistory', JSON.stringify(calculationHistory));
                saveHistoryToFirebase();
                updateHistoryDisplay();
                
                currentInput = result.toString();
                display.value = currentInput;
                justCalculated = true;
            } catch {
                display.value = 'Error';
                currentInput = '';
                justCalculated = false;
            }
        } else if (value === '.') {
            if (justCalculated) {
                currentInput = '0.';
                justCalculated = false;
            } else {
                const parts = currentInput.split(/[-+*/]/);
                const lastPart = parts[parts.length - 1];
                if (!lastPart.includes('.')) {
                    currentInput += value;
                }
            }
            display.value = currentInput;
        } else if (value === '%') {
            const parts = currentInput.split(/([-+*/])/);
            for (let i = parts.length - 1; i >= 0; i--) {
                if (!isNaN(parts[i]) && parts[i] !== '') {
                    parts[i] = (parseFloat(parts[i]) / 100).toString();
                    break;
                }
            }
            currentInput = parts.join('');
            display.value = currentInput;
            justCalculated = false;
        } else if (['+', '-', '*', '/'].includes(value)) {
            if (justCalculated) {
                currentInput += value;
                justCalculated = false;
            } else {
                currentInput += value;
            }
            display.value = currentInput;
        } else {
            if (justCalculated) {
                currentInput = value;
                justCalculated = false;
            } else {
                currentInput += value;
            }
            display.value = currentInput;
        }
    });
});

clearHistoryBtn.addEventListener('click', async () => {
    calculationHistory = [];
    localStorage.removeItem('calculatorHistory');
    try {
        await db.collection('calculator_history').doc(currentUsername).delete();
    } catch (error) {
        console.error('Error clearing Firebase history:', error);
    }
    updateHistoryDisplay();
});

closeHistory.addEventListener('click', () => {
    mobileHistoryOverlay.style.display = 'none';
});

mobileClearHistory.addEventListener('click', async () => {
    calculationHistory = [];
    localStorage.removeItem('calculatorHistory');
    try {
        await db.collection('calculator_history').doc(currentUsername).delete();
    } catch (error) {
        console.error('Error clearing Firebase history:', error);
    }
    updateHistoryDisplay();
    mobileHistoryOverlay.style.display = 'none';
});

mobileHistoryOverlay.addEventListener('click', (e) => {
    if (e.target === mobileHistoryOverlay) {
        mobileHistoryOverlay.style.display = 'none';
    }
});

function updateHistoryUserInfo() {
    if (historyUsername && historyCount) {
        historyUsername.textContent = currentUsername;
        historyCount.textContent = calculationHistory.length;
    }
    if (mobileHistoryUsername && mobileHistoryCount) {
        mobileHistoryUsername.textContent = currentUsername;
        mobileHistoryCount.textContent = calculationHistory.length;
    }
}

function updateHistoryDisplay() {
    historyList.innerHTML = '';
    mobileHistoryList.innerHTML = '';
    
    calculationHistory.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.innerHTML = `<div class="calculation">${entry.calculation}</div><div class="datetime">${entry.datetime}</div>`;
        historyItem.style.cursor = 'pointer';
        historyItem.addEventListener('click', () => {
            const result = entry.calculation.split(' = ')[1];
            currentInput = result;
            display.value = currentInput;
        });
        historyList.appendChild(historyItem);
        
        const mobileHistoryItem = document.createElement('div');
        mobileHistoryItem.innerHTML = `<div class="calculation">${entry.calculation}</div><div class="datetime">${entry.datetime}</div>`;
        mobileHistoryItem.addEventListener('click', () => {
            const result = entry.calculation.split(' = ')[1];
            currentInput = result;
            display.value = currentInput;
            mobileHistoryOverlay.style.display = 'none';
        });
        mobileHistoryList.appendChild(mobileHistoryItem);
    });
    
    updateHistoryUserInfo();
} 