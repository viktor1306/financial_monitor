// Financial Monitor - Data Processing

// Process and merge data from CSV files
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

    // Extract available months
    const uniqueMonths = new Set();
    Object.values(stationsData).forEach(station => {
        station.daily.forEach(entry => {
            if (entry.date) {
                const monthKey = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, '0')}`;
                uniqueMonths.add(monthKey);
            }
        });
    });
    
    const sortedMonths = Array.from(uniqueMonths).sort().reverse().map(key => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = date.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });
        return {
            id: key,
            label: label.charAt(0).toUpperCase() + label.slice(1)
        };
    });
    
    updatePeriodSelector(sortedMonths);
    
    renderDashboard();
}

// Get filtered data based on period
function getFilteredData(stationData) {
    const today = new Date();
    
    let startDate, endDate;
    
    if (currentPeriod === 'all') {
        // All time
        startDate = new Date(2020, 0, 1); // Start from 2020
        endDate = today;
    } else {
        // Parse YYYY-MM
        const [year, month] = currentPeriod.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month)) {
             startDate = new Date(year, month - 1, 1);
             endDate = new Date(year, month, 0);
        } else {
             // Fallback to current month if parsing fails
             startDate = new Date(today.getFullYear(), today.getMonth(), 1);
             endDate = today;
        }
    }
    
    // Filter by date range first
    let filtered = stationData.filter(entry => {
        const d = entry.date;
        return d >= startDate && d <= endDate;
    });
    
    // For current month (if selected), find last day with real non-zero data
    // Check if selected period matches current month
    const isCurrentMonth = currentPeriod === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    if (isCurrentMonth && filtered.length > 0) {
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

// Calculate station summary statistics
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
