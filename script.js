// Financial Monitor - Main JavaScript

// Global data storage
let stationsData = {};
let cmFcmData = {};
let profitData = {};
let miniCharts = {};
let detailChart = null;
let currentPeriod = 'current';

// Data file paths (for GitHub Pages hosting)
const DATA_FILES = {
    cmFcm: 'data/2. Фінансовий результат УЗЕ поденно - CM_FCM.csv',
    profit: 'data/2. Фінансовий результат УЗЕ поденно - Прибуток день.csv'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initUploadHandlers();
    initPeriodSelector();
    initModalHandlers();
    
    // Auto-load data from data folder
    loadDataFromFiles();
});

// Auto-load data files
async function loadDataFromFiles() {
    showLoading(true);
    
    // Check if running from file:// protocol
    if (window.location.protocol === 'file:') {
        console.warn('Running from file:// protocol. Auto-load disabled. Please use upload button or run via web server.');
        showLoading(false);
        showUploadHint();
        return;
    }
    
    try {
        console.log('Loading data files...');
        console.log('CM_FCM path:', DATA_FILES.cmFcm);
        console.log('Profit path:', DATA_FILES.profit);
        
        // Load both files in parallel
        const [cmFcmResponse, profitResponse] = await Promise.all([
            fetch(DATA_FILES.cmFcm),
            fetch(DATA_FILES.profit)
        ]);
        
        console.log('CM_FCM response:', cmFcmResponse.status, cmFcmResponse.ok);
        console.log('Profit response:', profitResponse.status, profitResponse.ok);
        
        let hasData = false;
        
        if (cmFcmResponse.ok) {
            const cmFcmContent = await cmFcmResponse.text();
            console.log('CM_FCM content length:', cmFcmContent.length);
            cmFcmData = parseCSV(cmFcmContent, 'cmfcm');
            console.log('CM_FCM stations:', cmFcmData.stations);
            hasData = true;
        } else {
            console.error('Failed to load CM_FCM file:', cmFcmResponse.status);
        }
        
        if (profitResponse.ok) {
            const profitContent = await profitResponse.text();
            console.log('Profit content length:', profitContent.length);
            profitData = parseCSV(profitContent, 'profit');
            console.log('Profit stations:', profitData.stations);
            hasData = true;
        } else {
            console.error('Failed to load Profit file:', profitResponse.status);
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
        
        // Update charts with new theme
        updateAllCharts();
    });
}

// Upload Handlers (disabled - auto-load only)
function initUploadHandlers() {
    // Upload button removed - data loads automatically from data folder
}

function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    showLoading(true);
    
    const promises = [];
    
    for (const file of files) {
        promises.push(readCSVFile(file));
    }
    
    Promise.all(promises)
        .then(() => {
            processData();
            showLoading(false);
            updateLastUpdated();
        })
        .catch(error => {
            console.error('Error reading files:', error);
            showLoading(false);
            alert('Помилка при читанні файлів. Перевірте формат CSV.');
        });
    
    event.target.value = '';
}

function readCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            const fileName = file.name.toLowerCase();
            
            if (fileName.includes('cm_fcm') || fileName.includes('cm fcm')) {
                cmFcmData = parseCSV(content, 'cmfcm');
            } else if (fileName.includes('прибуток') || fileName.includes('profit') || fileName.includes('prybutok')) {
                profitData = parseCSV(content, 'profit');
            }
            
            resolve();
        };
        
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// CSV Parser
function parseCSV(content, type) {
    const lines = content.split('\n').filter(line => line.trim());
    const result = {
        stations: [],
        data: {}
    };
    
    if (lines.length < 3) return result;
    
    // Parse header to get station names
    const headerLine = lines[0].split(',');
    const stations = [];
    
    for (let i = 2; i < headerLine.length; i += 2) {
        let stationName = headerLine[i].replace(/"/g, '').trim();
        if (stationName && stationName !== '') {
            stations.push(stationName);
        }
    }
    
    result.stations = stations;
    
    // Initialize data structure
    stations.forEach(station => {
        result.data[station] = [];
    });
    
    // Parse data rows (skip header rows)
    for (let i = 2; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < 3) continue;
        
        const dateStr = row[0].trim();
        if (!dateStr || dateStr === '') continue;
        
        // Parse date (format: DD.MM.YYYY)
        const dateParts = dateStr.split('.');
        if (dateParts.length !== 3) continue;
        
        const date = new Date(
            parseInt(dateParts[2]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[0])
        );
        
        if (isNaN(date.getTime())) continue;
        
        // Parse values for each station
        stations.forEach((station, idx) => {
            const baseIdx = 2 + idx * 2;
            
            if (type === 'cmfcm') {
                const cm = parseNumber(row[baseIdx]);
                const fcm = parseNumber(row[baseIdx + 1]);
                
                if (cm !== null || fcm !== null) {
                    result.data[station].push({
                        date: date,
                        cm: cm,
                        fcm: fcm
                    });
                }
            } else if (type === 'profit') {
                const margin = parseNumber(row[baseIdx]);
                const marginPercent = parsePercent(row[baseIdx + 1]);
                
                if (margin !== null) {
                    result.data[station].push({
                        date: date,
                        margin: margin,
                        marginPercent: marginPercent
                    });
                }
            }
        });
    }
    
    return result;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function parseNumber(str) {
    if (!str || str.trim() === '' || str.includes('#DIV')) return null;
    
    // Handle Ukrainian number format (comma as decimal separator)
    let cleaned = str.replace(/"/g, '').replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? null : num;
}

function parsePercent(str) {
    if (!str || str.trim() === '' || str.includes('#DIV')) return null;
    
    let cleaned = str.replace(/"/g, '').replace('%', '').replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? null : num;
}

// Process and merge data
function processData() {
    stationsData = {};
    
    // Get all unique stations
    const allStations = new Set([
        ...(cmFcmData.stations || []),
        ...(profitData.stations || [])
    ]);
    
    allStations.forEach(station => {
        stationsData[station] = {
            name: station,
            daily: []
        };
        
        const cmfcmEntries = cmFcmData.data?.[station] || [];
        const profitEntries = profitData.data?.[station] || [];
        
        // Create a map for easy lookup
        const dataMap = new Map();
        
        cmfcmEntries.forEach(entry => {
            const key = entry.date.toISOString();
            dataMap.set(key, { ...entry });
        });
        
        profitEntries.forEach(entry => {
            const key = entry.date.toISOString();
            if (dataMap.has(key)) {
                const existing = dataMap.get(key);
                existing.margin = entry.margin;
                existing.marginPercent = entry.marginPercent;
            } else {
                dataMap.set(key, { ...entry });
            }
        });
        
        // Convert map to array and sort by date
        stationsData[station].daily = Array.from(dataMap.values())
            .sort((a, b) => a.date - b.date);
    });
    
    renderDashboard();
}

// Period selector
function initPeriodSelector() {
    const monthSelect = document.getElementById('monthSelect');
    
    monthSelect.addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        renderDashboard();
    });
}

// Get filtered data based on period
function getFilteredData(stationData) {
    const today = new Date();
    
    let startDate, endDate;
    
    if (currentPeriod === 'current') {
        // Current month: from 1st to last day with real data
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today; // Will be adjusted below
    } else {
        // Previous month
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    
    // Filter by date range first
    let filtered = stationData.filter(entry => {
        const d = entry.date;
        return d >= startDate && d <= endDate;
    });
    
    // For current period, find last day with real non-zero data
    if (currentPeriod === 'current' && filtered.length > 0) {
        // Sort by date descending to find last valid day
        const sorted = [...filtered].sort((a, b) => b.date - a.date);
        
        // Find the last day where we have non-zero margin data
        let lastValidDate = null;
        for (const entry of sorted) {
            if (entry.margin !== null && entry.margin !== 0) {
                lastValidDate = entry.date;
                break;
            }
        }
        
        // If found, filter to only include up to that date
        if (lastValidDate) {
            filtered = filtered.filter(entry => entry.date <= lastValidDate);
        }
    }
    
    return filtered;
}

// Render dashboard
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

function calculateStationSummary(data) {
    let totalMargin = 0;
    let totalPlan = 0;
    let totalFact = 0;
    let marginCount = 0;
    let marginPercentSum = 0;
    
    data.forEach(entry => {
        if (entry.margin !== null && entry.margin !== undefined) {
            totalMargin += entry.margin;
            marginCount++;
        }
        if (entry.marginPercent !== null && entry.marginPercent !== undefined) {
            marginPercentSum += entry.marginPercent;
        }
        if (entry.cm !== null && entry.cm !== undefined) {
            totalPlan += entry.cm;
        }
        if (entry.fcm !== null && entry.fcm !== undefined) {
            totalFact += entry.fcm;
        }
    });
    
    return {
        totalMargin: totalMargin,
        avgMarginPercent: marginCount > 0 ? marginPercentSum / marginCount : 0,
        totalPlan: totalPlan,
        totalFact: totalFact,
        daysCount: data.length
    };
}

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
    
    // Create safe ID for canvas
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
    
    // Store canvas ID in station for later use
    station.canvasId = canvasId;
    
    card.addEventListener('click', () => openDetailModal(station));
    
    return card;
}

function createMiniChart(stationKey, data, index) {
    const station = stationsData[stationKey];
    const canvasId = station.canvasId || `chart-${index}`;
    const canvas = document.getElementById(canvasId);
    
    if (!canvas) return;
    
    // Destroy existing chart
    if (miniCharts[canvasId]) {
        miniCharts[canvasId].destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const isLight = document.body.classList.contains('light-theme');
    
    const labels = data.map(d => d.date);
    const margins = data.map(d => d.margin || 0);
    
    // Create gradient that changes color at y=0
    const chartHeight = canvas.height || 150;
    const minVal = Math.min(...margins);
    const maxVal = Math.max(...margins);
    const range = maxVal - minVal || 1;
    const zeroPosition = maxVal / range; // Position of zero line (0 to 1 from top)
    
    const lineGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    if (minVal >= 0) {
        // All positive
        lineGradient.addColorStop(0, '#1dd1a1');
        lineGradient.addColorStop(1, '#1dd1a1');
    } else if (maxVal <= 0) {
        // All negative
        lineGradient.addColorStop(0, '#ff6b6b');
        lineGradient.addColorStop(1, '#ff6b6b');
    } else {
        // Mixed - green above 0, red below 0
        lineGradient.addColorStop(0, '#1dd1a1');
        lineGradient.addColorStop(Math.max(0, Math.min(1, zeroPosition - 0.01)), '#1dd1a1');
        lineGradient.addColorStop(Math.max(0, Math.min(1, zeroPosition + 0.01)), '#ff6b6b');
        lineGradient.addColorStop(1, '#ff6b6b');
    }
    
    miniCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    data: margins,
                    borderColor: lineGradient,
                    backgroundColor: 'transparent',
                    fill: {
                        target: 'origin',
                        above: 'rgba(29, 209, 161, 0.3)',
                        below: 'rgba(255, 107, 107, 0.3)'
                    },
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const date = items[0].label;
                            return formatDate(new Date(date));
                        },
                        label: (item) => `Прибуток: ${item.raw.toFixed(1)} тис. грн`
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Summary update
function updateSummary(stationSummaries) {
    const totalProfitEl = document.getElementById('totalProfit');
    const bestStationEl = document.getElementById('bestStation');
    
    if (stationSummaries.length === 0) {
        totalProfitEl.textContent = '0.0000';
        bestStationEl.textContent = '-';
        return;
    }
    
    const totalProfit = stationSummaries.reduce((sum, s) => sum + s.totalMargin, 0);
    
    // Convert to millions (from thousands) with 4 decimal places
    const profitInMillions = (totalProfit / 1000).toFixed(4);
    
    // Find best station
    const best = stationSummaries.reduce((prev, curr) => 
        curr.totalMargin > prev.totalMargin ? curr : prev
    );
    
    totalProfitEl.textContent = profitInMillions;
    bestStationEl.textContent = best.station.name;
}

// Detail Modal
function initModalHandlers() {
    const modal = document.getElementById('detailModal');
    const closeBtn = modal.querySelector('.close-modal');
    
    closeBtn.addEventListener('click', closeDetailModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDetailModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDetailModal();
    });
}

function openDetailModal(station) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('modalTitle');
    
    title.textContent = station.name;
    modal.style.display = 'flex';
    
    const filteredData = getFilteredData(station.daily);
    createDetailChart(filteredData, station);
    updateModalStats(filteredData);
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
    
    if (detailChart) {
        detailChart.destroy();
        detailChart = null;
    }
}

function createDetailChart(data, station) {
    const canvas = document.getElementById('detailChart');
    const ctx = canvas.getContext('2d');
    
    if (detailChart) {
        detailChart.destroy();
    }
    
    const isLight = document.body.classList.contains('light-theme');
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    const textColor = isLight ? '#2d3436' : '#e0e0e0';
    
    const labels = data.map(d => d.date);
    const planData = data.map(d => d.cm || null);
    const factData = data.map(d => d.fcm || null);
    const profitDataArr = data.map(d => d.margin || null);
    
    // Debug logging
    console.log('Station:', station.name);
    console.log('Data sample:', data[0]);
    console.log('Plan data (first 5):', planData.slice(0, 5));
    console.log('Fact data (first 5):', factData.slice(0, 5));
    console.log('Profit data (first 5):', profitDataArr.slice(0, 5));
    
    // Calculate min/max for Y axis to include all values
    const allValues = [...planData, ...factData, ...profitDataArr].filter(v => v !== null);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valuePadding = Math.abs(maxValue - minValue) * 0.1 || 10;
    
    // Create gradient for profit line that changes color at y=0
    const chartArea = canvas.getBoundingClientRect();
    const chartHeight = chartArea.height || 400;
    const profitValues = profitDataArr.filter(v => v !== null);
    const minProfit = Math.min(...profitValues);
    const maxProfit = Math.max(...profitValues);
    const profitRange = maxProfit - minProfit || 1;
    const zeroPosition = maxProfit / profitRange;
    
    const profitLineGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    if (minProfit >= 0) {
        profitLineGradient.addColorStop(0, '#1dd1a1');
        profitLineGradient.addColorStop(1, '#1dd1a1');
    } else if (maxProfit <= 0) {
        profitLineGradient.addColorStop(0, '#ff6b6b');
        profitLineGradient.addColorStop(1, '#ff6b6b');
    } else {
        profitLineGradient.addColorStop(0, '#1dd1a1');
        profitLineGradient.addColorStop(Math.max(0, Math.min(1, zeroPosition - 0.01)), '#1dd1a1');
        profitLineGradient.addColorStop(Math.max(0, Math.min(1, zeroPosition + 0.01)), '#ff6b6b');
        profitLineGradient.addColorStop(1, '#ff6b6b');
    }
    
    // Check if station is Solipower (no plan data)
    const isSolipower = station && station.name && station.name.includes('СОЛІПАУЕР');
    
    console.log('Is Solipower:', isSolipower);
    
    const datasets = [];
    
    // Always add plan FIRST (except for Solipower)
    if (!isSolipower) {
        datasets.push({
            label: 'План (CM)',
            data: planData,
            borderColor: '#54a0ff',
            backgroundColor: 'rgba(84, 160, 255, 0.1)',
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3
        });
    }
    
    // Add Fact
    datasets.push({
        label: 'Факт (FCM)',
        data: factData,
        borderColor: '#00d2d3',
        backgroundColor: 'rgba(0, 210, 211, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3
    });
    
    // Add Profit with gradient coloring
    datasets.push({
        label: 'Прибуток',
        data: profitDataArr,
        borderColor: profitLineGradient,
        backgroundColor: 'transparent',
        fill: {
            target: 'origin',
            above: 'rgba(29, 209, 161, 0.2)',
            below: 'rgba(255, 107, 107, 0.2)'
        },
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
    });
    
    console.log('Datasets count:', datasets.length);
    console.log('Datasets:', datasets.map(d => d.label));
    
    detailChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isLight ? '#ffffff' : '#27293d',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: isLight ? '#dfe6e9' : '#3c3f58',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        title: (items) => {
                            const date = items[0].label;
                            return formatDate(new Date(date));
                        },
                        label: (item) => {
                            const value = item.raw;
                            if (value === null) return '';
                            return `${item.dataset.label}: ${value.toFixed(1)}`;
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    },
                    pan: {
                        enabled: true,
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'dd.MM'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Дата',
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Значення (тис. грн)',
                        color: textColor
                    },
                    min: minValue - valuePadding,
                    max: maxValue + valuePadding,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                }
            }
        }
    });
}

function updateModalStats(data) {
    const statsContainer = document.getElementById('modalStats');
    const summary = calculateStationSummary(data);
    
    // Calculate additional stats
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
            <div class="modal-stat-value">${positiveDays}/${data.length}</div>
            <div class="modal-stat-label">Прибуткових днів</div>
        </div>
    `;
}

// UI Helpers
function showUploadHint() {
    const grid = document.getElementById('dashboardGrid');
    grid.innerHTML = `
        <div class="upload-hint" onclick="document.getElementById('csvFileInput').click()">
            <i class="fas fa-cloud-upload-alt"></i>
            <h3>Завантажте CSV файли</h3>
            <p>Перетягніть або натисніть, щоб завантажити файли з фінансовими даними</p>
            <p style="margin-top: 10px; font-size: 0.85rem;">
                Підтримувані файли: CM_FCM.csv, Прибуток день.csv
            </p>
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

function updateAllCharts() {
    // Re-render to apply theme changes
    if (Object.keys(stationsData).length > 0) {
        renderDashboard();
    }
}

// Drag and drop support
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        document.getElementById('csvFileInput').files = files;
        handleFileUpload({ target: { files: files, value: '' } });
    }
});
