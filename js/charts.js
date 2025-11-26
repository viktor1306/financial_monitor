// Financial Monitor - Charts

// Create mini chart for station card
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
    const zeroPosition = maxVal / range;
    
    const lineGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    if (minVal >= 0) {
        lineGradient.addColorStop(0, '#1dd1a1');
        lineGradient.addColorStop(1, '#1dd1a1');
    } else if (maxVal <= 0) {
        lineGradient.addColorStop(0, '#ff6b6b');
        lineGradient.addColorStop(1, '#ff6b6b');
    } else {
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
                x: { display: false },
                y: { display: false }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Create detailed chart for modal
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
    
    // Check if station is Solipower (no plan data)
    const isSolipower = station && station.name && station.name.includes('СОЛІПАУЕР');
    
    const datasets = [];
    
    // Add plan (except for Solipower)
    if (!isSolipower) {
        datasets.push({
            label: 'План (CM)',
            data: planData,
            borderColor: '#54a0ff',
            backgroundColor: '#54a0ff',
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            pointStyle: 'rectRounded',
            yAxisID: 'y'
        });
    }
    
    // Add Fact
    datasets.push({
        label: 'Факт (FCM)',
        data: factData,
        borderColor: '#a55eea',
        backgroundColor: '#a55eea',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
        pointStyle: 'rectRounded',
        yAxisID: 'y'
    });
    
    // Add Profit on secondary axis
    datasets.push({
        label: 'Прибуток',
        data: profitDataArr,
        borderColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea, scales} = chart;
            if (!chartArea) return '#1dd1a1';
            
            const yAxis = scales.y1;
            if (!yAxis) return '#1dd1a1';
            
            const zeroPixel = yAxis.getPixelForValue(0);
            const top = chartArea.top;
            const bottom = chartArea.bottom;
            const height = bottom - top;
            
            // Calculate 0 position as ratio (0 to 1) from top
            let zeroRatio = (zeroPixel - top) / height;
            zeroRatio = Math.max(0, Math.min(1, zeroRatio));
            
            const gradient = ctx.createLinearGradient(0, top, 0, bottom);
            gradient.addColorStop(0, '#1dd1a1');
            gradient.addColorStop(zeroRatio, '#1dd1a1');
            gradient.addColorStop(zeroRatio, '#ff6b6b');
            gradient.addColorStop(1, '#ff6b6b');
            
            return gradient;
        },
        backgroundColor: '#1dd1a1',
        pointBackgroundColor: (context) => {
            const val = context.raw;
            return (val !== null && val < 0) ? '#ff6b6b' : '#1dd1a1';
        },
        pointBorderColor: (context) => {
            const val = context.raw;
            return (val !== null && val < 0) ? '#ff6b6b' : '#1dd1a1';
        },
        fill: {
            target: 'origin',
            above: 'rgba(29, 209, 161, 0.2)',
            below: 'rgba(255, 107, 107, 0.2)'
        },
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        pointStyle: 'rectRounded',
        yAxisID: 'y1'
    });
    
    detailChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [{
            id: 'legendMargin',
            beforeInit: function(chart) {
                const originalFit = chart.legend.fit;
                chart.legend.fit = function fit() {
                    originalFit.bind(chart.legend)();
                    this.height += 20;
                };
            }
        }],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'start',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isLight ? '#ffffff' : '#27293d',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: isLight ? '#dfe6e9' : '#3c3f58',
                    borderWidth: 1,
                    padding: 12,
                    usePointStyle: true,
                    callbacks: {
                        title: (items) => {
                            const dateVal = items[0].parsed.x;
                            if (dateVal) {
                                const date = new Date(dateVal);
                                return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            }
                            return '';
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
                        displayFormats: { day: 'dd.MM' }
                    },
                    title: {
                        display: true,
                        text: 'Дата',
                        color: textColor
                    },
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Дохід / План (тис. грн)',
                        color: textColor
                    },
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Прибуток (тис. грн)',
                        color: textColor
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// Update all charts (for theme change)
function updateAllCharts() {
    if (Object.keys(stationsData).length > 0) {
        renderDashboard();
    }
}
