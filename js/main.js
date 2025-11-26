// Financial Monitor - Main Entry Point

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initPeriodSelector();
    initModalHandlers();
    initPasswordProtection();
});

function initPasswordProtection() {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('passwordSubmit');
    const errorMsg = document.getElementById('passwordError');
    const appContainer = document.getElementById('appContainer');
    
    let correctPassword = '1111'; // Default fallback

    // Try to load password from secrets.json
    fetch('secrets.json')
        .then(response => {
            if (response.ok) return response.json();
            throw new Error('No secrets file');
        })
        .then(data => {
            if (data.password) correctPassword = data.password;
        })
        .catch(err => {
            console.log('Using default password configuration');
        });
    
    // Check if already authenticated in this session
    if (sessionStorage.getItem('auth_token') === 'nexus_secure') {
        unlockApp();
        return;
    }
    
    function checkPassword() {
        const password = input.value;
        if (password === correctPassword) {
            sessionStorage.setItem('auth_token', 'nexus_secure');
            unlockApp();
        } else {
            errorMsg.style.display = 'block';
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        }
    }
    
    function unlockApp() {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            appContainer.classList.remove('app-blur');
            appContainer.classList.add('app-visible');
            // Load data only after unlock
            loadDataFromFiles();
        }, 300);
    }
    
    submitBtn.addEventListener('click', checkPassword);
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });
}

// Auto-load data files
async function loadDataFromFiles() {
    showLoading(true);
    
    // Check if running from file:// protocol
    if (window.location.protocol === 'file:') {
        console.warn('Running from file:// protocol. Auto-load disabled. Please run via web server.');
        showLoading(false);
        showUploadHint();
        return;
    }
    
    try {
        console.log('Loading data files...');
        
        const [cmFcmResponse, profitResponse] = await Promise.all([
            fetch(DATA_FILES.cmFcm),
            fetch(DATA_FILES.profit)
        ]);
        
        let hasData = false;
        
        if (cmFcmResponse.ok) {
            const cmFcmContent = await cmFcmResponse.text();
            cmFcmData = parseCSV(cmFcmContent, 'cmfcm');
            hasData = true;
        }
        
        if (profitResponse.ok) {
            const profitContent = await profitResponse.text();
            profitData = parseCSV(profitContent, 'profit');
            hasData = true;
        }
        
        if (hasData) {
            processData();
            updateLastUpdated();
        } else {
            showUploadHint();
        }
    } catch (error) {
        console.error('Error loading data files:', error);
        showUploadHint();
    }
    
    showLoading(false);
}

// Theme Toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('financialTheme');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('financialTheme', isLight ? 'light' : 'dark');
        updateAllCharts();
    });
}

// Period selector
function initPeriodSelector() {
    const monthSelect = document.getElementById('monthSelect');
    
    // Set month names
    const now = new Date();
    const currentMonth = now.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });
    
    // Capitalize first letter
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    
    const options = monthSelect.options;
    if (options.length >= 2) {
        options[0].text = capitalize(currentMonth);
        options[1].text = capitalize(prevMonth);
    }
    
    monthSelect.addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        renderDashboard();
    });
}

// Drag and drop support
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
});
