// Financial Monitor - Configuration

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
