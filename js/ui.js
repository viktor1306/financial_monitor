// Financial Monitor - UI Components

// Render dashboard with station cards
function renderDashboard() {
    const grid = document.getElementById('dashboardGrid');
    grid.innerHTML = '';
    
    const stations = Object.keys(stationsData);
    
    if (stations.length === 0) {
        showUploadHint();
        updateSummary([]);
        return;
    }
    
    // Calculate and render cards
    const stationSummaries = [];
    
    stations.forEach((stationKey, index) => {
        const station = stationsData[stationKey];
        const filteredData = getFilteredData(station.daily);
        
        if (filteredData.length === 0) return;
        
        const summary = calculateStationSummary(filteredData);
        summary.station = station;
        summary.key = stationKey;
        stationSummaries.push(summary);
        
        const card = createStationCard(station, summary, index);
        grid.appendChild(card);
    });
    
    updateSummary(stationSummaries);
    
    // Initialize mini charts after cards are in DOM
    setTimeout(() => {
        stationSummaries.forEach((summary, index) => {
            createMiniChart(summary.key, getFilteredData(summary.station.daily), index);
        });
    }, 100);
}

// Create station card element
function createStationCard(station, summary, index) {
    const card = document.createElement('div');
    card.className = `card ${summary.totalMargin >= 0 ? 'positive' : 'negative'}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    const profitClass = summary.totalMargin >= 0 ? 'positive' : 'negative';
    const profitSign = summary.totalMargin >= 0 ? '+' : '';
    
    // Check if station is Solipower (no plan data)
    const isSolipower = station.name.includes('СОЛІПАУЕР');
    const planHtml = isSolipower ? '' : `
            <div class="stat-item">
                <span class="stat-label">План (CM)</span>
                <span class="stat-value plan">${summary.totalPlan.toFixed(0)}</span>
            </div>`;
    
    const canvasId = 'chart-' + index;
    
    card.innerHTML = `
        <div class="card-header">
            <span class="card-title">${station.name}</span>
            <span class="card-profit ${profitClass}">${profitSign}${summary.totalMargin.toFixed(1)} тис. грн</span>
        </div>
        <div class="mini-chart-box">
            <canvas id="${canvasId}"></canvas>
        </div>
        <div class="card-stats">${planHtml}
            <div class="stat-item">
                <span class="stat-label">Факт (FCM)</span>
                <span class="stat-value fact">${summary.totalFact.toFixed(0)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Прибуток</span>
                <span class="stat-value margin">${summary.totalMargin.toFixed(1)}</span>
            </div>
        </div>
    `;
    
    station.canvasId = canvasId;
    card.addEventListener('click', () => openDetailModal(station));
    
    return card;
}

// Update summary section
function updateSummary(stationSummaries) {
    const totalProfitEl = document.getElementById('totalProfit');
    const bestStationEl = document.getElementById('bestStation');
    
    if (stationSummaries.length === 0) {
        totalProfitEl.textContent = '0.0000';
        bestStationEl.textContent = '-';
        return;
    }
    
    const totalProfit = stationSummaries.reduce((sum, s) => sum + s.totalMargin, 0);
    const profitInMillions = (totalProfit / 1000).toFixed(4);
    
    const best = stationSummaries.reduce((prev, curr) => 
        curr.totalMargin > prev.totalMargin ? curr : prev
    );
    
    totalProfitEl.textContent = profitInMillions;
    bestStationEl.textContent = best.station.name;
}

// Update modal statistics
function updateModalStats(data) {
    const statsContainer = document.getElementById('modalStats');
    const summary = calculateStationSummary(data);
    
    const profits = data.map(d => d.margin).filter(m => m !== null && m !== undefined);
    const maxProfit = Math.max(...profits);
    const minProfit = Math.min(...profits);
    const positiveDays = profits.filter(p => p > 0).length;
    
    statsContainer.innerHTML = `
        <div class="modal-stat-card">
            <div class="modal-stat-value">${summary.totalMargin.toFixed(1)}</div>
            <div class="modal-stat-label">Загальний прибуток (тис. грн)</div>
        </div>
        <div class="modal-stat-card">
            <div class="modal-stat-value" style="color: #1dd1a1;">${maxProfit.toFixed(1)}</div>
            <div class="modal-stat-label">Макс. прибуток за день (тис. грн)</div>
        </div>
        <div class="modal-stat-card">
            <div class="modal-stat-value" style="color: #ff6b6b;">${minProfit.toFixed(1)}</div>
            <div class="modal-stat-label">Мін. прибуток за день (тис. грн)</div>
        </div>
        <div class="modal-stat-card">
            <div class="modal-stat-value">${positiveDays} з ${data.length}</div>
            <div class="modal-stat-label">Прибуткових днів</div>
        </div>
    `;
}

// UI Helpers
function showUploadHint() {
    const grid = document.getElementById('dashboardGrid');
    grid.innerHTML = `
        <div class="upload-hint">
            <i class="fas fa-cloud-upload-alt"></i>
            <h3>Дані не завантажені</h3>
            <p>Перевірте наявність файлів у папці data/</p>
        </div>
    `;
}

function showLoading(show) {
    const loader = document.getElementById('loadingStatus');
    loader.style.display = show ? 'block' : 'none';
}

function updateLastUpdated() {
    const badge = document.getElementById('lastUpdated');
    const timeSpan = document.getElementById('lastUpdatedTime');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    timeSpan.textContent = formatDate(yesterday);
    badge.style.display = 'flex';
}

function formatDate(date) {
    if (!(date instanceof Date)) return '';
    return date.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Update period selector with available months
function updatePeriodSelector(months) {
    const select = document.getElementById('monthSelect');
    
    select.innerHTML = '';
    
    // Add month options
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.id; // "YYYY-MM"
        option.textContent = month.label; // "Month YYYY"
        select.appendChild(option);
    });

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Весь час';
    select.appendChild(allOption);
    
    // Determine which value to select
    let valueToSelect = '';
    
    if (months.length > 0) {
        // If currentPeriod is 'current' or 'previous', map it to the actual month
        if (currentPeriod === 'current') {
            valueToSelect = months[0].id;
        } else if (currentPeriod === 'previous' && months.length > 1) {
            valueToSelect = months[1].id;
        } else if (currentPeriod === 'all') {
            valueToSelect = 'all';
        } else {
            // It's already a specific month or invalid
            valueToSelect = currentPeriod;
        }
        
        // Verify if valueToSelect exists in options
        const exists = Array.from(select.options).some(opt => opt.value === valueToSelect);
        if (!exists) {
            valueToSelect = months[0].id; // Default to latest
        }
    } else {
        valueToSelect = 'all';
    }
    
    select.value = valueToSelect;
    currentPeriod = valueToSelect;
}
