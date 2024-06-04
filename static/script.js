function showHomePage() {
    document.getElementById('home').classList.remove('hidden');
    document.getElementById('prediction').classList.add('hidden');
    document.getElementById('tables').classList.add('hidden');
}

function showPredictionPage() {
    document.getElementById('home').classList.add('hidden');
    document.getElementById('prediction').classList.remove('hidden');
    document.getElementById('tables').classList.add('hidden');
}

function showTablesPage() {
    document.getElementById('home').classList.add('hidden');
    document.getElementById('prediction').classList.add('hidden');
    document.getElementById('tables').classList.remove('hidden');
}

document.getElementById('prediction-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const day = document.getElementById('day').value;
    const cost = document.getElementById('cost').value;

    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ day: day, cost: cost })
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('prediction-result').classList.remove('hidden');
            document.getElementById('predicted-revenue').innerHTML = '<h3>Tahmini Gelir: ' + data.prediction + ' TL</h3>';
            // Gerçek ve tahmin edilen değeri karşılaştır
            fetch('/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ day: day, cost: cost })
            })
                .then(response => response.json())
                .then(compareData => {
                    // Yeni gerçek ve tahmin edilen değerlerle grafikleri güncelle
                    updateComparisonChart(compareData.real_revenue, compareData.predicted_revenue);
                })
                .catch(error => console.error('Error:', error));
        })
        .catch(error => console.error('Error:', error));
});


fetch('/chart-data')
    .then(response => response.json())
    .then(data => {
        const scatterCtx = document.getElementById('scatter-chart').getContext('2d');
        const scatterChart = new Chart(scatterCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Reklam Harcaması vs Gelir',
                    data: data.cost.map((cost, index) => ({ x: cost, y: data.revenue[index] })),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Reklam Harcaması (TL)' } },
                    y: { title: { display: true, text: 'Reklamdan Kazanç (TL)' } }
                }
            }
        });

        const costHistCtx = document.getElementById('cost-histogram').getContext('2d');
        const costHistChart = new Chart(costHistCtx, {
            type: 'bar',
            data: {
                labels: data.cost,
                datasets: [{
                    label: 'Reklam Harcaması',
                    data: data.cost,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Veri Noktaları' } },
                    y: { title: { display: true, text: 'Reklam Harcaması (TL)' } }
                }
            }
        });

        const revenueHistCtx = document.getElementById('revenue-histogram').getContext('2d');
        const revenueHistChart = new Chart(revenueHistCtx, {
            type: 'bar',
            data: {
                labels: data.revenue,
                datasets: [{
                    label: 'Reklamdan Kazanç',
                    data: data.revenue,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Veri Noktaları' } },
                    y: { title: { display: true, text: 'Reklamdan Kazanç (TL)' } }
                }
            }
        });
    })
    .catch(error => console.error('Error:', error));

const rowsPerPage = 10;
let currentPage = 1;

function renderTablePage(page) {
    const table = document.getElementById('data-table');
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = tbody.getElementsByTagName('tr');
    const totalPages = Math.ceil(rows.length / rowsPerPage);

    for (let i = 0; i < rows.length; i++) {
        rows[i].style.display = 'none';
    }

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    for (let i = start; i < end && i < rows.length; i++) {
        rows[i].style.display = '';
    }

    document.getElementById('prevPage').disabled = page === 1;
    document.getElementById('nextPage').disabled = page === totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage(currentPage);
    }
}

function nextPage() {
    const table = document.getElementById('data-table');
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = tbody.getElementsByTagName('tr');
    const totalPages = Math.ceil(rows.length / rowsPerPage);

    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage(currentPage);
    }
}
document.addEventListener('DOMContentLoaded', function () {
    renderTablePage(currentPage);
});

function showPerformanceMetrics() {
    fetch('/performance-metrics')
        .then(response => response.json())
        .then(data => {
            const gaugeChart = echarts.init(document.getElementById('performance-metrics'));
            const option = {
                tooltip: {
                    formatter: '{a} <br/>{b} : {c}%'
                },
                series: [
                    {
                        name: 'Model Performansı',
                        type: 'gauge',
                        detail: {
                            formatter: '{value}%',
                            textStyle: {
                                fontSize: 12 // Yazı tipi boyutunu ayarla
                            }
                        },
                        data: [{ value: data.R2 * 100, name: 'R2 Skoru' }], // Doğru anahtar ismi kullanıldı
                        axisLine: {
                            lineStyle: {
                                width: 10
                            }
                        },
                        pointer: {
                            width: 5
                        }
                    }
                ]
            };
            gaugeChart.setOption(option);
        })
        .catch(error => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', function () {
    showPerformanceMetrics();
});


function updateComparisonChart(realRevenue, predictedRevenue) {
    const comparisonCtx = document.getElementById('comparison-chart').getContext('2d');
    if (!window.comparisonChart) {
        window.comparisonChart = new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: ['Gerçek Veya En Yakın Gelir', 'Tahmin Edilen Gelir'],
                datasets: [{
                    label: 'Gelir Karşılaştırması',
                    data: [realRevenue, predictedRevenue],
                    backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)']
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Gelir (TL)'
                        }
                    }
                }
            }
        });
    } else {
        window.comparisonChart.data.datasets[0].data = [realRevenue, predictedRevenue];
        window.comparisonChart.update();
    }
}