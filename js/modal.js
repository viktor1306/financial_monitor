// Financial Monitor - Modal Handler

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
