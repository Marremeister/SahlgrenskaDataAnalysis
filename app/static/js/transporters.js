/**
 * transporters.js - Handles transporters analysis functionality
 */

// Global chart objects for updating
let hourlyInequalityChart = null;
let giniCoefficientChart = null;
let workloadDetailsChart = null;

// Global variables
let currentWorkloadData = null;

/**
 * Initialize the transporters analysis
 */
function initTransporterAnalysis() {
    // Check if data is available
    checkDataAvailability()
        .then(dataAvailable => {
            if (dataAvailable) {
                loadTransporterData();
            } else {
                showNoDataAlert();
            }
        })
        .catch(error => {
            console.error('Error initializing transporter analysis:', error);
            showErrorAlert('Failed to initialize transporter analysis. Please try again.');
        });

    // Add event listener for workload details modal
    const workloadDetailsModal = document.getElementById('workloadDetailsModal');
    if (workloadDetailsModal) {
        workloadDetailsModal.addEventListener('hidden.bs.modal', function () {
            // Clean up chart when modal is closed
            if (workloadDetailsChart) {
                workloadDetailsChart.destroy();
                workloadDetailsChart = null;
            }
        });
    }
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
    document.getElementById('transporterContent').style.display = 'none';
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
    } else {
        console.error(message);
    }
}

/**
 * Load all transporter data
 */
function loadTransporterData() {
    // Show content
    document.getElementById('noDataAlert').style.display = 'none';
    document.getElementById('transporterContent').style.display = 'block';

    // Load workload inequality data
    loadWorkloadInequality();

    // Load highest and lowest inequality periods
    loadHighestInequalityPeriods();
    loadMedianInequalityPeriods(); // ADD THIS LINE
    loadLowestInequalityPeriods();

    // Load all transporters summary
    loadAllTransportersSummary();
}

/**
 * Load workload inequality data and charts
 */
function loadWorkloadInequality() {
    fetch('/api/transporters/workload')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Store the workload data for later use
                currentWorkloadData = data;

                const hourlyStats = data.hourly_stats;

                // Create hourly inequality chart
                createHourlyInequalityChart(hourlyStats);

                // Create Gini coefficient chart
                createGiniCoefficientChart(hourlyStats);
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
 * Create hourly inequality chart
 * @param {Object[]} hourlyStats - Hourly statistics data
 */
function createHourlyInequalityChart(hourlyStats) {
    const inequalityCtx = document.getElementById('hourlyInequalityChart').getContext('2d');

    if (hourlyInequalityChart) {
        hourlyInequalityChart.destroy();
    }

    hourlyInequalityChart = new Chart(inequalityCtx, {
        type: 'line',
        data: {
            labels: hourlyStats.map(stat => stat.hour_formatted),
            datasets: [
                {
                    label: 'Relative Inequality Index',
                    data: hourlyStats.map(stat => stat.avg_relative_inequality),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Relative Inequality Index'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const transporters = hourlyStats[context.dataIndex].avg_transporters;
                            const stdDev = hourlyStats[context.dataIndex].avg_std_dev;
                            return [
                                `Relative Inequality: ${value.toFixed(2)}`,
                                `Std Dev: ${stdDev.toFixed(2)}%`,
                                `Avg Transporters: ${transporters.toFixed(1)}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create Gini coefficient chart
 * @param {Object[]} hourlyStats - Hourly statistics data
 */
function createGiniCoefficientChart(hourlyStats) {
    const giniCtx = document.getElementById('giniCoefficientChart').getContext('2d');

    if (giniCoefficientChart) {
        giniCoefficientChart.destroy();
    }

    giniCoefficientChart = new Chart(giniCtx, {
        type: 'bar',
        data: {
            labels: hourlyStats.map(stat => stat.hour_formatted),
            datasets: [
                {
                    label: 'Gini Coefficient',
                    data: hourlyStats.map(stat => stat.avg_gini),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true, // Change to true
            aspectRatio: 2, // Add this line to control the aspect ratio
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 0.5,  // Ensure the max value is appropriate
                    suggestedMax: 0.5, // Add this as a backup
                    ticks: {
                        stepSize: 0.1 // Control tick spacing
                    },
                    title: {
                        display: true,
                        text: 'Gini Coefficient'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Gini: ${value.toFixed(4)}`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 0.2,
                            yMax: 0.2,
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: 'Moderate Inequality (0.2)',
                                enabled: true,
                                position: 'start'
                            }
                        }
                    }
                }
            }
        }
    });
}

/**
 * Load highest inequality periods
 */
function loadHighestInequalityPeriods() {
    fetch('/api/transporters/highest_inequality?limit=5')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const highestInequality = data.highest_inequality;
                const tableBody = document.getElementById('highestInequalityTableBody');

                // Clear existing content
                tableBody.innerHTML = '';

                highestInequality.forEach(period => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${period.date_hour}</td>
                        <td>${period.num_transporters}</td>
                        <td>${period.std_dev.toFixed(2)}% (${period.relative_inequality.toFixed(2)})</td>
                        <td>${period.gini.toFixed(4)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-details"
                                    data-bs-toggle="modal"
                                    data-bs-target="#workloadDetailsModal"
                                    data-period='${JSON.stringify(period)}'>
                                View Details
                            </button>
                        </td>
                    `;

                    tableBody.appendChild(row);
                });

                // Add event listeners to view details buttons
                addWorkloadDetailsEventListeners();
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load highest inequality periods: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading highest inequality periods:', error);
            showErrorAlert('Failed to load highest inequality periods.');
        });
}

/**
 * Load median inequality periods
 */
function loadMedianInequalityPeriods() {
    fetch('/api/transporters/median_inequality?limit=5')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const medianInequality = data.median_inequality;
                const tableBody = document.getElementById('medianInequalityTableBody');

                // Clear existing content
                tableBody.innerHTML = '';

                medianInequality.forEach(period => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${period.date_hour}</td>
                        <td>${period.num_transporters}</td>
                        <td>${period.std_dev.toFixed(2)}% (${period.relative_inequality.toFixed(2)})</td>
                        <td>${period.gini.toFixed(4)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-details"
                                    data-bs-toggle="modal"
                                    data-bs-target="#workloadDetailsModal"
                                    data-period='${JSON.stringify(period)}'>
                                View Details
                            </button>
                        </td>
                    `;

                    tableBody.appendChild(row);
                });

                // Add event listeners to view details buttons
                addWorkloadDetailsEventListeners();
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load median inequality periods: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading median inequality periods:', error);
            showErrorAlert('Failed to load median inequality periods.');
        });
}

/**
 * Load lowest inequality periods
 */
function loadLowestInequalityPeriods() {
    fetch('/api/transporters/lowest_inequality?limit=5')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const lowestInequality = data.lowest_inequality;
                const tableBody = document.getElementById('lowestInequalityTableBody');

                // Clear existing content
                tableBody.innerHTML = '';

                lowestInequality.forEach(period => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${period.date_hour}</td>
                        <td>${period.num_transporters}</td>
                        <td>${period.std_dev.toFixed(2)}% (${period.relative_inequality.toFixed(2)})</td>
                        <td>${period.gini.toFixed(4)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-details"
                                    data-bs-toggle="modal"
                                    data-bs-target="#workloadDetailsModal"
                                    data-period='${JSON.stringify(period)}'>
                                View Details
                            </button>
                        </td>
                    `;

                    tableBody.appendChild(row);
                });

                // Add event listeners to view details buttons
                addWorkloadDetailsEventListeners();
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load lowest inequality periods: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading lowest inequality periods:', error);
            showErrorAlert('Failed to load lowest inequality periods.');
        });
}

/**
 * Load all transporters summary
 */
function loadAllTransportersSummary() {
    fetch('/api/transporters/summary')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const summary = data.transporter_summary;
                const tableBody = document.getElementById('allTransportersTableBody');

                // Clear existing content
                tableBody.innerHTML = '';

                summary.forEach(transporter => {
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

                // Initialize DataTable if available
                if ($.fn.DataTable) {
                    $('#transporterTable').DataTable({
                        paging: true,
                        searching: true,
                        ordering: true,
                        info: true,
                        lengthMenu: [10, 25, 50, 100],
                        order: [[1, 'desc']] // Sort by total transports descending
                    });
                }
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load transporter summary: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading transporter summary:', error);
            showErrorAlert('Failed to load transporter summary.');
        });
}

/**
 * Add event listeners to workload details buttons
 */
function addWorkloadDetailsEventListeners() {
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const periodData = JSON.parse(this.getAttribute('data-period'));
            showWorkloadDetails(periodData);
        });
    });
}

/**
 * Show workload details in modal
 * @param {Object} periodData - Data for the selected period
 */
function showWorkloadDetails(periodData) {
    // Set modal title
    document.getElementById('workloadDetailsTitle').textContent =
        `Workload Distribution for ${periodData.date_hour} (${periodData.num_transporters} transporters)`;

    // Add relative inequality info to the title
    const relativeInequalityInfo = document.createElement('small');
    relativeInequalityInfo.className = 'ms-2 text-muted';
    relativeInequalityInfo.textContent =
        `Relative Inequality: ${periodData.relative_inequality.toFixed(2)}, Std Dev: ${periodData.std_dev.toFixed(2)}%`;
    document.getElementById('workloadDetailsTitle').appendChild(relativeInequalityInfo);

    // Get workload details
    const workloadDetails = periodData.workload_details;
    const expectedWorkload = periodData.expected_workload_percent;

    // Convert to array for chart
    const transporters = Object.keys(workloadDetails);
    const workloadPercentages = Object.values(workloadDetails);

    // Create chart
    const chartContainer = document.getElementById('workloadDetailsChart');

    // Clear previous chart if exists
    while (chartContainer.firstChild) {
        chartContainer.removeChild(chartContainer.firstChild);
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'detailsChartCanvas';
    chartContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    if (workloadDetailsChart) {
        workloadDetailsChart.destroy();
    }

    workloadDetailsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: transporters,
            datasets: [
                {
                    label: 'Actual Workload %',
                    data: workloadPercentages,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Expected Equal Workload %',
                    data: transporters.map(() => expectedWorkload),
                    type: 'line',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    pointStyle: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Workload %'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Actual Workload %') {
                                const value = context.parsed.y;
                                const difference = value - expectedWorkload;
                                return [
                                    `Actual: ${value.toFixed(1)}%`,
                                    `Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(1)}%`
                                ];
                            } else {
                                return `Expected: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        }
    });

    // Populate details table
    const tableBody = document.getElementById('workloadDetailsTableBody');
    tableBody.innerHTML = '';

    // Calculate total duration
    const totalDuration = periodData.total_duration_minutes;

    // Add row for each transporter
    transporters.forEach(transporter => {
        const workloadPercent = workloadDetails[transporter];
        const duration = (workloadPercent * totalDuration) / 100;
        const difference = workloadPercent - expectedWorkload;

        const row = document.createElement('tr');

        // Add class for highlighting overloaded/underloaded transporters
        if (difference > 10) {
            row.classList.add('table-danger');
        } else if (difference < -10) {
            row.classList.add('table-warning');
        }

        row.innerHTML = `
            <td>${transporter}</td>
            <td>${duration.toFixed(1)}</td>
            <td>${workloadPercent.toFixed(1)}%</td>
            <td>${expectedWorkload.toFixed(1)}%</td>
            <td>${difference > 0 ? '+' : ''}${difference.toFixed(1)}%</td>
        `;

        tableBody.appendChild(row);
    });
}

// Initialize the transporter analysis when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initTransporterAnalysis();
});