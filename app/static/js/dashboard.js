/**
 * dashboard.js - Handles dashboard functionality for the Hospital Transport Analysis system
 */

// Global chart objects for updating
let hourlyActivityChart = null;
let inequalityChart = null;
let transportTypesChart = null;
let durationChart = null;

/**
 * Initialize the dashboard
 */
function initDashboard() {
    // Check if data is available
    checkDataAvailability()
        .then(dataAvailable => {
            if (dataAvailable) {
                loadDashboardData();
            } else {
                showNoDataAlert();
            }
        })
        .catch(error => {
            console.error('Error initializing dashboard:', error);
            showErrorAlert('Failed to initialize dashboard. Please try again.');
        });
}

/**
 * Check if data file is available
 * @returns {Promise<boolean>} True if data is available, false otherwise
 */
function checkDataAvailability() {
    return fetch('/api/get_current_file')
        .then(response => response.json())
        .then(data => {
            return data.success;
        })
        .catch(error => {
            console.error('Error checking data availability:', error);
            return false;
        });
}

/**
 * Show no data alert
 */
function showNoDataAlert() {
    document.getElementById('noDataAlert').style.display = 'block';
    document.getElementById('dashboardContent').style.display = 'none';
}

/**
 * Show error alert
 * @param {string} message - Error message to display
 */
function showErrorAlert(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

/**
 * Load all dashboard data
 */
function loadDashboardData() {
    // Show dashboard content
    document.getElementById('noDataAlert').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';

    // Load data summary
    loadDataSummary();

    // Load hourly activity
    loadHourlyActivity();

    // Load transporter workload inequality
    loadWorkloadInequality();

    // Load transport types
    loadTransportTypes();

    // Load transport duration
    loadTransportDuration();

    // Load transporter summary
    loadTransporterSummary();
}

/**
 * Load data summary metrics
 */
function loadDataSummary() {
    fetch('/api/data/summary')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('totalTransports').textContent = data.summary.row_count.toLocaleString();
            }
        })
        .catch(error => {
            console.error('Error loading data summary:', error);
            showErrorAlert('Failed to load summary data.');
        });
}

/**
 * Load hourly activity data and chart
 */
function loadHourlyActivity() {
    fetch('/api/analysis/run/hourly_activity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params: {} })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const result = data.result;

            // Update peak hour card
            if (result.peak_hour !== null) {
                document.getElementById('peakHour').textContent = `${result.peak_hour}:00`;
            }

            // Create or update chart
            const ctx = document.getElementById('hourlyActivityChart').getContext('2d');

            if (hourlyActivityChart) {
                hourlyActivityChart.destroy();
            }

            hourlyActivityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: result.hours.map(hour => `${hour}:00`),
                    datasets: [{
                        label: 'Transport Count',
                        data: result.counts,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const percentage = result.percentages[context.dataIndex];
                                    return `Count: ${value} (${percentage.toFixed(1)}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } else if (data.error) {
            console.error('Error from server:', data.error);
            showErrorAlert('Failed to load hourly activity data: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error loading hourly activity:', error);
        showErrorAlert('Failed to load hourly activity data.');
    });
}

/**
 * Load workload inequality data and chart
 */
function loadWorkloadInequality() {
    fetch('/api/transporters/workload')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const hourlyStats = data.hourly_stats;

                // Update transporters card
                const uniqueTransporters = new Set();
                data.workload_stats.forEach(stat => {
                    Object.keys(stat.workload_details).forEach(transporter => {
                        uniqueTransporters.add(transporter);
                    });
                });
                document.getElementById('totalTransporters').textContent = uniqueTransporters.size;

                // Create or update chart
                const ctx = document.getElementById('inequalityChart').getContext('2d');

                if (inequalityChart) {
                    inequalityChart.destroy();
                }

                inequalityChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: hourlyStats.map(stat => stat.hour_formatted),
                        datasets: [
                            {
                                label: 'Inequality (Std Dev)',
                                data: hourlyStats.map(stat => stat.avg_std_dev),
                                borderColor: 'rgba(255, 99, 132, 1)',
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                yAxisID: 'y',
                                tension: 0.1
                            },
                            {
                                label: 'Avg # of Transporters',
                                data: hourlyStats.map(stat => stat.avg_transporters),
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                yAxisID: 'y1',
                                tension: 0.1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Inequality (Std Dev)'
                                }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: {
                                    drawOnChartArea: false
                                },
                                title: {
                                    display: true,
                                    text: 'Avg # of Transporters'
                                }
                            }
                        }
                    }
                });
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load workload inequality data: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading workload inequality:', error);
            showErrorAlert('Failed to load workload inequality data.');
        });
}

/**
 * Load transport types data and chart
 */
function loadTransportTypes() {
    fetch('/api/analysis/run/transport_types', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params: {} })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const result = data.result;

            // Create or update chart
            const ctx = document.getElementById('transportTypesChart').getContext('2d');

            if (transportTypesChart) {
                transportTypesChart.destroy();
            }

            // Generate colors
            const backgroundColors = generateColors(result.types.length, 0.5);
            const borderColors = generateColors(result.types.length, 1);

            transportTypesChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: result.types,
                    datasets: [{
                        data: result.percentages,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const count = result.counts[context.dataIndex];
                                    return `${context.label}: ${value.toFixed(1)}% (${count})`;
                                }
                            }
                        }
                    }
                }
            });
        } else if (data.error) {
            console.error('Error from server:', data.error);
            showErrorAlert('Failed to load transport types data: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error loading transport types:', error);
        showErrorAlert('Failed to load transport types data.');
    });
}

/**
 * Load transport duration data and chart
 */
function loadTransportDuration() {
    fetch('/api/analysis/run/transport_duration', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params: {} })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const result = data.result;

            // Update avg transport time card
            document.getElementById('avgTransportTime').textContent = `${result.mean.toFixed(1)} min`;

            // Create or update chart
            const ctx = document.getElementById('durationChart').getContext('2d');

            if (durationChart) {
                durationChart.destroy();
            }

            durationChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: result.histogram.bins.map((bin, index) => {
                        const nextBin = index < result.histogram.bins.length - 1 ? result.histogram.bins[index + 1] : bin + 5;
                        return `${bin}-${nextBin} min`;
                    }),
                    datasets: [{
                        label: 'Number of Transports',
                        data: result.histogram.values,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Count: ${context.parsed.y}`;
                                }
                            }
                        }
                    }
                }
            });
        } else if (data.error) {
            console.error('Error from server:', data.error);
            showErrorAlert('Failed to load transport duration data: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error loading transport duration:', error);
        showErrorAlert('Failed to load transport duration data.');
    });
}

/**
 * Load transporter summary data and populate table
 */
function loadTransporterSummary() {
    fetch('/api/transporters/summary')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const summary = data.transporter_summary;
                const tableBody = document.getElementById('transporterTableBody');

                // Clear existing content
                tableBody.innerHTML = '';

                // Add rows for each transporter (limited to top 10)
                const topTransporters = summary.slice(0, 10);

                topTransporters.forEach(transporter => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${transporter.transporter_id}</td>
                        <td>${transporter.total_transports}</td>
                        <td>${transporter.total_minutes.toFixed(1)}</td>
                        <td>${transporter.avg_duration.toFixed(1)}</td>
                        <td>${transporter.busiest_hour !== null ? `${transporter.busiest_hour}:00` : 'N/A'}</td>
                    `;

                    tableBody.appendChild(row);
                });
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load transporter summary data: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading transporter summary:', error);
            showErrorAlert('Failed to load transporter summary data.');
        });
}

/**
 * Generate an array of colors with specified alpha
 * @param {number} count - Number of colors to generate
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string[]} Array of color strings
 */
function generateColors(count, alpha) {
    const baseColors = [
        `rgba(255, 99, 132, ${alpha})`,
        `rgba(54, 162, 235, ${alpha})`,
        `rgba(255, 206, 86, ${alpha})`,
        `rgba(75, 192, 192, ${alpha})`,
        `rgba(153, 102, 255, ${alpha})`,
        `rgba(255, 159, 64, ${alpha})`,
        `rgba(199, 199, 199, ${alpha})`,
        `rgba(83, 102, 255, ${alpha})`,
        `rgba(255, 99, 255, ${alpha})`,
        `rgba(99, 255, 132, ${alpha})`
    ];

    // If we need more colors than in our base set, generate them
    const colors = [];
    for (let i = 0; i < count; i++) {
        if (i < baseColors.length) {
            colors.push(baseColors[i]);
        } else {
            // Generate a random color if we ran out of base colors
            const r = Math.floor(Math.random() * 255);
            const g = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 255);
            colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
        }
    }

    return colors;
}

// Initialize the dashboard when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});