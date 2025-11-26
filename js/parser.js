// Financial Monitor - CSV Parser

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
