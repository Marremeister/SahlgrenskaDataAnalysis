/**
 * analysis.js - Handles custom analysis functionality
 */

// Global variables to store current analysis state
let currentAnalysisType = null;
let currentAnalysisParams = {};
let availableAnalyses = [];
let currentResults = null;
let currentViewMode = 'chart';
let currentCharts = {};

/**
 * Initialize the analysis page
 */
function initAnalysis() {
    // Check if data is available
    checkDataAvailability()
        .then(dataAvailable => {
            if (dataAvailable) {
                document.getElementById('noDataAlert').style.display = 'none';
                document.getElementById('analysisContent').style.display = 'block';
                loadAvailableAnalyses();
            } else {
                document.getElementById('noDataAlert').style.display = 'block';
                document.getElementById('analysisContent').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error initializing analysis:', error);
            showErrorAlert('Failed to initialize analysis. Please try again.');
        });

    // Set up event listeners
    document.getElementById('runAllAnalysesBtn').addEventListener('click', runAllAnalyses);
    document.getElementById('runAnalysisBtn').addEventListener('click', runSelectedAnalysis);

    // Set up view mode buttons
    document.getElementById('viewChartBtn').addEventListener('click', () => switchViewMode('chart'));
    document.getElementById('viewTableBtn').addEventListener('click', () => switchViewMode('table'));
    document.getElementById('viewRawBtn').addEventListener('click', () => switchViewMode('raw'));
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
 * Load available analysis types
 */
function loadAvailableAnalyses() {
    fetch('/api/analysis/available')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                availableAnalyses = data.analyses;
                const analysisList = document.getElementById('analysisTypesList');

                // Clear existing list
                analysisList.innerHTML = '';

                // Add each analysis type
                availableAnalyses.forEach(analysisType => {
                    const item = document.createElement('a');
                    item.href = '#';
                    item.className = 'list-group-item list-group-item-action';
                    item.textContent = formatAnalysisName(analysisType);
                    item.dataset.analysisType = analysisType;

                    item.addEventListener('click', function(e) {
                        e.preventDefault();
                        selectAnalysisType(analysisType);
                    });

                    analysisList.appendChild(item);
                });
            } else if (data.error) {
                console.error('Error from server:', data.error);
                showErrorAlert('Failed to load available analyses: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error loading available analyses:', error);
            showErrorAlert('Failed to load available analyses.');
        });
}

/**
 * Format analysis name for display
 * @param {string} analysisType - Analysis type in snake_case
 * @returns {string} Formatted name in Title Case
 */
function formatAnalysisName(analysisType) {
    // Convert snake_case to Title Case with spaces
    return analysisType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Select an analysis type
 * @param {string} analysisType - Selected analysis type
 */
function selectAnalysisType(analysisType) {
    // Update active class in list
    document.querySelectorAll('#analysisTypesList a').forEach(item => {
        if (item.dataset.analysisType === analysisType) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update current analysis type
    currentAnalysisType = analysisType;
    currentAnalysisParams = {};

    // Show run button
    document.getElementById('runAnalysisBtn').style.display = 'block';

    // Load parameters for this analysis type
    loadAnalysisParameters(analysisType);

    // Update result title
    document.getElementById('resultTitle').textContent = `${formatAnalysisName(analysisType)} Results`;
}

/**
 * Load parameters for the selected analysis type
 * @param {string} analysisType - Selected analysis type
 */
function loadAnalysisParameters(analysisType) {
    const parametersContainer = document.getElementById('parametersContainer');

    // Clear existing parameters
    parametersContainer.innerHTML = '';

    // Create parameter form based on analysis type
    switch (analysisType) {
        case 'hourly_activity':
            // Date column selection
            createColumnSelector(parametersContainer, 'date_column', 'Date/Time Column', ['Starttid', 'Uppdrag Starttid']);
            break;

        case 'transport_types':
            // Type column selection
            createColumnSelector(parametersContainer, 'type_column', 'Transport Type Column', ['Transportmedel', 'Uppdragstyp']);
            break;

        case 'location_frequency':
            // Start and end location columns
            createColumnSelector(parametersContainer, 'start_location_column', 'Start Location Column', ['Startplats', 'Start Avdelning']);
            createColumnSelector(parametersContainer, 'end_location_column', 'End Location Column', ['Slutplats', 'Slutplats Avdelning']);
            break;

        case 'transport_duration':
            // Start and end time columns
            createColumnSelector(parametersContainer, 'start_time_column', 'Start Time Column', ['Uppdrag Starttid', 'Primär Servicepersonal Starttid']);
            createColumnSelector(parametersContainer, 'end_time_column', 'End Time Column', ['Uppdrag Sluttid', 'Primär Servicepersonal Sluttid']);
            break;

        case 'priority_analysis':
            // Priority column selection
            createColumnSelector(parametersContainer, 'priority_column', 'Priority Column', ['Prioritet']);
            break;

        default:
            parametersContainer.innerHTML = '<p class="text-muted">No parameters available for this analysis type.</p>';
    }
}

/**
 * Create a column selector input
 * @param {HTMLElement} container - Container to add the selector to
 * @param {string} paramName - Parameter name
 * @param {string} label - Input label
 * @param {string[]} suggestions - Column name suggestions
 */
function createColumnSelector(container, paramName, label, suggestions) {
    // Create a form group for column selection
    const formGroup = document.createElement('div');
    formGroup.className = 'mb-3';

    // Add label
    const formLabel = document.createElement('label');
    formLabel.htmlFor = paramName;
    formLabel.className = 'form-label';
    formLabel.textContent = label;

    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.id = paramName;
    input.setAttribute('list', `${paramName}_suggestions`);

    // Create datalist for suggestions
    const datalist = document.createElement('datalist');
    datalist.id = `${paramName}_suggestions`;

    // Add suggested columns
    suggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        datalist.appendChild(option);
    });

    // Also load actual columns from the data
    fetch('/api/data/columns')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.columns.forEach(column => {
                    if (!suggestions.includes(column)) {
                        const option = document.createElement('option');
                        option.value = column;
                        datalist.appendChild(option);
                    }
                });
            }
        })
        .catch(error => console.error('Error loading columns:', error));

    // Add input change event
    input.addEventListener('change', function() {
        currentAnalysisParams[paramName] = this.value;
    });

    // Assemble and append
    formGroup.appendChild(formLabel);
    formGroup.appendChild(input);
    formGroup.appendChild(datalist);
    container.appendChild(formGroup);
}

/**
 * Run the selected analysis
 */
function runSelectedAnalysis() {
    if (!currentAnalysisType) {
        alert('Please select an analysis type first');
        return;
    }

    // Show loading indicator
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Running analysis...</p>
        </div>
    `;

    // Clear insights
    document.getElementById('insightsContainer').innerHTML = '<p class="text-muted">Generating insights...</p>';

    // Run the analysis
    fetch(`/api/analysis/run/${currentAnalysisType}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            params: currentAnalysisParams
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentResults = data.result;
            // Display results
            displayResults(data.result, currentViewMode);
            // Generate insights
            generateInsights(currentAnalysisType, data.result);
        } else {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    <strong>Error:</strong> ${data.error}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error running analysis:', error);
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                <strong>Error:</strong> Failed to run analysis. Please try again.
            </div>
        `;
    });
}

/**
 * Run all available analyses
 */
function runAllAnalyses() {
    // Show loading indicator
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Running all analyses...</p>
        </div>
    `;

    // Clear insights
    document.getElementById('insightsContainer').innerHTML = '<p class="text-muted">Generating insights...</p>';

    // Run all analyses
    fetch('/api/analysis/run_all', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Create overview of all results
            displayAllResults(data.results);
            // Generate combined insights
            generateCombinedInsights(data.results);
        } else {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    <strong>Error:</strong> ${data.error}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error running all analyses:', error);
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                <strong>Error:</strong> Failed to run analyses. Please try again.
            </div>
        `;
    });
}

/**
 * Display results in the selected view mode
 * @param {Object} result - Analysis result data
 * @param {string} viewMode - View mode ('chart', 'table', or 'raw')
 */
function displayResults(result, viewMode) {
    const resultContainer = document.getElementById('resultContainer');

    // Clean up existing charts
    Object.values(currentCharts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    currentCharts = {};

    switch (viewMode) {
        case 'chart':
            displayChart(result, resultContainer);
            break;

        case 'table':
            displayTable(result, resultContainer);
            break;

        case 'raw':
            displayRawData(result, resultContainer);
            break;

        default:
            displayChart(result, resultContainer);
    }
}

/**
 * Display result as chart
 * @param {Object} result - Analysis result data
 * @param {HTMLElement} container - Container element
 */
function displayChart(result, container) {
    // Clear container
    container.innerHTML = '';

    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = 'resultChart';
    canvas.style.height = '400px';
    container.appendChild(canvas);

    // Determine chart type based on result structure
    if (currentAnalysisType === 'hourly_activity') {
        currentCharts.hourlyActivity = new Chart(canvas, {
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
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    } else if (currentAnalysisType === 'transport_types') {
        currentCharts.transportTypes = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: result.types,
                datasets: [{
                    data: result.percentages,
                    backgroundColor: generateColors(result.types.length, 0.5),
                    borderColor: generateColors(result.types.length, 1),
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
                                return `${context.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    } else if (currentAnalysisType === 'transport_duration') {
        currentCharts.transportDuration = new Chart(canvas, {
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
                }
            }
        });
    } else if (currentAnalysisType === 'priority_analysis') {
        currentCharts.priorityAnalysis = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: result.priorities,
                datasets: [{
                    label: 'Count',
                    data: result.counts,
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
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
                }
            }
        });
    } else if (currentAnalysisType === 'location_frequency') {
        // Create multiple canvases for different chart types
        canvas.remove();

        // Create start locations chart
        const startLocationsDiv = document.createElement('div');
        startLocationsDiv.className = 'mb-4';
        startLocationsDiv.innerHTML = '<h5>Top Start Locations</h5>';
        const startCanvas = document.createElement('canvas');
        startCanvas.id = 'startLocationsChart';
        startCanvas.style.height = '300px';
        startLocationsDiv.appendChild(startCanvas);
        container.appendChild(startLocationsDiv);

        // Create end locations chart
        const endLocationsDiv = document.createElement('div');
        endLocationsDiv.className = 'mb-4';
        endLocationsDiv.innerHTML = '<h5>Top End Locations</h5>';
        const endCanvas = document.createElement('canvas');
        endCanvas.id = 'endLocationsChart';
        endCanvas.style.height = '300px';
        endLocationsDiv.appendChild(endCanvas);
        container.appendChild(endLocationsDiv);

        // Create routes chart
        const routesDiv = document.createElement('div');
        routesDiv.innerHTML = '<h5>Top Routes</h5>';
        const routesCanvas = document.createElement('canvas');
        routesCanvas.id = 'routesChart';
        routesCanvas.style.height = '300px';
        routesDiv.appendChild(routesCanvas);
        container.appendChild(routesDiv);

        // Start locations chart
        currentCharts.startLocations = new Chart(startCanvas, {
            type: 'bar',
            data: {
                labels: result.start_locations.names,
                datasets: [{
                    label: 'Count',
                    data: result.start_locations.counts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });

        // End locations chart
        currentCharts.endLocations = new Chart(endCanvas, {
            type: 'bar',
            data: {
                labels: result.end_locations.names,
                datasets: [{
                    label: 'Count',
                    data: result.end_locations.counts,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Routes chart
        currentCharts.routes = new Chart(routesCanvas, {
            type: 'bar',
            data: {
                labels: result.routes.names,
                datasets: [{
                    label: 'Count',
                    data: result.routes.counts,
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        // Generic fallback for unknown result types
        container.innerHTML = '<div class="alert alert-warning">No chart visualization available for this result type.</div>';
    }
}

/**
 * Display result as table
 * @param {Object} result - Analysis result data
 * @param {HTMLElement} container - Container element
 */
function displayTable(result, container) {
    // Clear container
    container.innerHTML = '';

    // Create table element
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover';

    // Create table header and body
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    if (currentAnalysisType === 'hourly_activity') {
        // Header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Hour</th>
            <th>Count</th>
            <th>Percentage</th>
        `;
        thead.appendChild(headerRow);

        // Data rows
        for (let i = 0; i < result.hours.length; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.hours[i]}:00</td>
                <td>${result.counts[i]}</td>
                <td>${result.percentages[i].toFixed(1)}%</td>
            `;
            tbody.appendChild(row);
        }
    } else if (currentAnalysisType === 'transport_types') {
        // Header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Transport Type</th>
            <th>Count</th>
            <th>Percentage</th>
        `;
        thead.appendChild(headerRow);

        // Data rows
        for (let i = 0; i < result.types.length; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.types[i]}</td>
                <td>${result.counts[i]}</td>
                <td>${result.percentages[i].toFixed(1)}%</td>
            `;
            tbody.appendChild(row);
        }
    } else if (currentAnalysisType === 'transport_duration') {
        // Header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Duration Range (min)</th>
            <th>Count</th>
        `;
        thead.appendChild(headerRow);

        // Add statistics row
        const statsRow = document.createElement('tr');
        statsRow.className = 'table-info';
        statsRow.innerHTML = `
            <td colspan="2">
                <strong>Statistics:</strong>
                Min: ${result.min.toFixed(1)} min,
                Max: ${result.max.toFixed(1)} min,
                Mean: ${result.mean.toFixed(1)} min,
                Median: ${result.median.toFixed(1)} min
            </td>
        `;
        tbody.appendChild(statsRow);

        // Data rows for histogram
        for (let i = 0; i < result.histogram.bins.length; i++) {
            const bin = result.histogram.bins[i];
            const nextBin = i < result.histogram.bins.length - 1 ? result.histogram.bins[i + 1] : bin + 5;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bin}-${nextBin} min</td>
                <td>${result.histogram.values[i]}</td>
            `;
            tbody.appendChild(row);
        }
    } else if (currentAnalysisType === 'priority_analysis') {
        // Header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Priority</th>
            <th>Count</th>
            <th>Percentage</th>
        `;
        thead.appendChild(headerRow);

        // Data rows
        for (let i = 0; i < result.priorities.length; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.priorities[i]}</td>
                <td>${result.counts[i]}</td>
                <td>${result.percentages[i].toFixed(1)}%</td>
            `;
            tbody.appendChild(row);
        }

        // Add hourly distribution if available
        if (Object.keys(result.hourly_distribution).length > 0) {
            // Add separator row
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'table-secondary';
            separatorRow.innerHTML = `
                <td colspan="3" class="text-center"><strong>Hourly Priority Distribution</strong></td>
            `;
            tbody.appendChild(separatorRow);

            // Add hourly data
            for (const hour in result.hourly_distribution) {
                const hourData = result.hourly_distribution[hour];

                // Add hour header
                const hourHeaderRow = document.createElement('tr');
                hourHeaderRow.className = 'table-info';
                hourHeaderRow.innerHTML = `
                    <td colspan="3"><strong>Hour ${hour}:00</strong> (Total: ${hourData.total})</td>
                `;
                tbody.appendChild(hourHeaderRow);

                // Add priorities for this hour
                for (let i = 0; i < hourData.priorities.length; i++) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="ps-4">${hourData.priorities[i]}</td>
                        <td>${hourData.counts[i]}</td>
                        <td>${hourData.percentages[i].toFixed(1)}%</td>
                    `;
                    tbody.appendChild(row);
                }
            }
        }
    } else if (currentAnalysisType === 'location_frequency') {
        // Create tabs for different tables
        const tabsContainer = document.createElement('div');
        tabsContainer.innerHTML = `
            <ul class="nav nav-tabs mb-3" id="locationTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="start-locations-tab" data-bs-toggle="tab" data-bs-target="#start-locations" type="button" role="tab" aria-controls="start-locations" aria-selected="true">Start Locations</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="end-locations-tab" data-bs-toggle="tab" data-bs-target="#end-locations" type="button" role="tab" aria-controls="end-locations" aria-selected="false">End Locations</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="routes-tab" data-bs-toggle="tab" data-bs-target="#routes" type="button" role="tab" aria-controls="routes" aria-selected="false">Routes</button>
                </li>
            </ul>
            <div class="tab-content" id="locationTabsContent">
                <div class="tab-pane fade show active" id="start-locations" role="tabpanel" aria-labelledby="start-locations-tab">
                    <table class="table table-striped table-hover" id="startLocationsTable">
                        <thead>
                            <tr>
                                <th>Start Location</th>
                                <th>Count</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.start_locations.names.map((name, i) => `
                                <tr>
                                    <td>${name}</td>
                                    <td>${result.start_locations.counts[i]}</td>
                                    <td>${result.start_locations.percentages[i].toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="tab-pane fade" id="end-locations" role="tabpanel" aria-labelledby="end-locations-tab">
                    <table class="table table-striped table-hover" id="endLocationsTable">
                        <thead>
                            <tr>
                                <th>End Location</th>
                                <th>Count</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.end_locations.names.map((name, i) => `
                                <tr>
                                    <td>${name}</td>
                                    <td>${result.end_locations.counts[i]}</td>
                                    <td>${result.end_locations.percentages[i].toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="tab-pane fade" id="routes" role="tabpanel" aria-labelledby="routes-tab">
                    <table class="table table-striped table-hover" id="routesTable">
                        <thead>
                            <tr>
                                <th>Route</th>
                                <th>Count</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.routes.names.map((name, i) => `
                                <tr>
                                    <td>${name}</td>
                                    <td>${result.routes.counts[i]}</td>
                                    <td>${result.routes.percentages[i].toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.appendChild(tabsContainer);
        return;
    } else {
        // Generic fallback for unknown result types
        container.innerHTML = '<div class="alert alert-warning">No table visualization available for this result type.</div>';
        return;
    }

    // Assemble table and add to container
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
}

/**
 * Display raw JSON data
 * @param {Object} result - Analysis result data
 * @param {HTMLElement} container - Container element
 */
function displayRawData(result, container) {
    // Display raw JSON data
    container.innerHTML = `
        <pre class="bg-light p-3 border rounded">${JSON.stringify(result, null, 2)}</pre>
    `;
}

/**
 * Display all analysis results
 * @param {Object} results - All analysis results
 */
function displayAllResults(results) {
    const resultContainer = document.getElementById('resultContainer');

    // Update result title
    document.getElementById('resultTitle').textContent = 'All Analyses Results';

    // Create a summary of all results
    let html = '<div class="accordion" id="analysisAccordion">';

    Object.keys(results).forEach((analysisType, index) => {
        const result = results[analysisType];
        const analysisName = formatAnalysisName(analysisType);

        html += `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button"
                            data-bs-toggle="collapse" data-bs-target="#collapse${index}"
                            aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="collapse${index}">
                        ${analysisName}
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}"
                     aria-labelledby="heading${index}" data-bs-parent="#analysisAccordion">
                    <div class="accordion-body" id="result-${analysisType}">
                        <div class="text-center">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="ms-2">Loading visualization...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    resultContainer.innerHTML = html;

    // Now render each result
    Object.keys(results).forEach(analysisType => {
        const result = results[analysisType];
        const container = document.getElementById(`result-${analysisType}`);

        // Save current analysis type temporarily to use proper visualization
        const prevAnalysisType = currentAnalysisType;
        currentAnalysisType = analysisType;

        displayChart(result, container);

        // Restore previous analysis type
        currentAnalysisType = prevAnalysisType;
    });
}

/**
 * Generate insights for the current analysis
 * @param {string} analysisType - Analysis type
 * @param {Object} result - Analysis result
 */
function generateInsights(analysisType, result) {
    const insightsContainer = document.getElementById('insightsContainer');
    let insights = '';

    switch (analysisType) {
        case 'hourly_activity':
            insights = generateHourlyActivityInsights(result);
            break;

        case 'transport_types':
            insights = generateTransportTypesInsights(result);
            break;

        case 'location_frequency':
            insights = generateLocationFrequencyInsights(result);
            break;

        case 'transport_duration':
            insights = generateTransportDurationInsights(result);
            break;

        case 'priority_analysis':
            insights = generatePriorityAnalysisInsights(result);
            break;

        default:
            insights = '<p class="text-muted">No insights available for this analysis type.</p>';
    }

    insightsContainer.innerHTML = insights;
}

/**
 * Generate insights for hourly activity analysis
 * @param {Object} result - Analysis result
 * @returns {string} HTML for insights
 */
function generateHourlyActivityInsights(result) {
    const peakHour = result.peak_hour;
    const peakCount = result.counts[result.hours.indexOf(peakHour)];
    const peakPercentage = result.percentages[result.hours.indexOf(peakHour)];

    // Find slowest hour with activity
    let slowestHour = null;
    let slowestCount = Infinity;

    for (let i = 0; i < result.hours.length; i++) {
        if (result.counts[i] > 0 && result.counts[i] < slowestCount) {
            slowestHour = result.hours[i];
            slowestCount = result.counts[i];
        }
    }

    const slowestPercentage = slowestHour !== null ? result.percentages[result.hours.indexOf(slowestHour)] : 0;

    // Calculate morning, afternoon, evening, night distribution
    const morning = result.hours.slice(6, 12).reduce((sum, hour, index) => sum + result.counts[result.hours.indexOf(hour)], 0);
    const afternoon = result.hours.slice(12, 18).reduce((sum, hour, index) => sum + result.counts[result.hours.indexOf(hour)], 0);
    const evening = result.hours.slice(18, 22).reduce((sum, hour, index) => sum + result.counts[result.hours.indexOf(hour)], 0);
    const night = result.hours.filter(h => h >= 22 || h < 6).reduce((sum, hour) => sum + result.counts[result.hours.indexOf(hour)], 0);

    const total = result.counts.reduce((sum, count) => sum + count, 0);

    const morningPercentage = (morning / total * 100).toFixed(1);
    const afternoonPercentage = (afternoon / total * 100).toFixed(1);
    const eveningPercentage = (evening / total * 100).toFixed(1);
    const nightPercentage = (night / total * 100).toFixed(1);

    return `
        <div class="card-text">
            <p><strong>Peak activity hour:</strong> ${peakHour}:00 with ${peakCount} transports (${peakPercentage.toFixed(1)}% of total)</p>
            <p><strong>Slowest hour with activity:</strong> ${slowestHour !== null ? `${slowestHour}:00 with ${slowestCount} transports (${slowestPercentage.toFixed(1)}% of total)` : 'N/A'}</p>

            <h6 class="mt-3">Distribution by Time of Day</h6>
            <ul>
                <li><strong>Morning (6:00-11:59):</strong> ${morning} transports (${morningPercentage}%)</li>
                <li><strong>Afternoon (12:00-17:59):</strong> ${afternoon} transports (${afternoonPercentage}%)</li>
                <li><strong>Evening (18:00-21:59):</strong> ${evening} transports (${eveningPercentage}%)</li>
                <li><strong>Night (22:00-5:59):</strong> ${night} transports (${nightPercentage}%)</li>
            </ul>

            <h6 class="mt-3">Recommendations</h6>
            <ul>
                <li>Consider adjusting staffing levels to match peak hours around ${peakHour}:00</li>
                <li>If possible, shift non-urgent transports away from peak hours to balance workload</li>
                <li>Ensure adequate coverage during night hours (${nightPercentage}% of transports)</li>
            </ul>
        </div>
    `;
}

/**
 * Generate insights for transport types analysis
 * @param {Object} result - Analysis result
 * @returns {string} HTML for insights
 */
function generateTransportTypesInsights(result) {
    const mostCommon = result.most_common;
    const mostCommonCount = result.counts[result.types.indexOf(mostCommon)];
    const mostCommonPercentage = result.percentages[result.types.indexOf(mostCommon)];

    const leastCommon = result.least_common;
    const leastCommonCount = result.counts[result.types.indexOf(leastCommon)];
    const leastCommonPercentage = result.percentages[result.types.indexOf(leastCommon)];

    // Get top 3 types
    const topTypes = [];
    const tempCounts = [...result.counts];
    const tempTypes = [...result.types];
    const tempPercentages = [...result.percentages];

    for (let i = 0; i < Math.min(3, result.types.length); i++) {
        const maxIndex = tempCounts.indexOf(Math.max(...tempCounts));
        topTypes.push({
            type: tempTypes[maxIndex],
            count: tempCounts[maxIndex],
            percentage: tempPercentages[maxIndex]
        });

        // Set to -1 to exclude from next iteration
        tempCounts[maxIndex] = -1;
    }

    return `
        <div class="card-text">
            <p><strong>Most common transport type:</strong> ${mostCommon} with ${mostCommonCount} transports (${mostCommonPercentage.toFixed(1)}% of total)</p>
            <p><strong>Least common transport type:</strong> ${leastCommon} with ${leastCommonCount} transports (${leastCommonPercentage.toFixed(1)}% of total)</p>

            <h6 class="mt-3">Top Transport Types</h6>
            <ul>
                ${topTypes.map(item => `<li><strong>${item.type}:</strong> ${item.count} transports (${item.percentage.toFixed(1)}%)</li>`).join('')}
            </ul>

            <h6 class="mt-3">Recommendations</h6>
            <ul>
                <li>Ensure sufficient ${mostCommon} equipment is available, as it's the most commonly used</li>
                <li>Consider reviewing the need for ${leastCommon} transports, as they are rarely used</li>
                <li>Train staff to handle the top 3 transport types efficiently, as they account for a significant portion of all transports</li>
            </ul>
        </div>
    `;
}

/**
 * Generate insights for location frequency analysis
 * @param {Object} result - Analysis result
 * @returns {string} HTML for insights
 */
function generateLocationFrequencyInsights(result) {
    const topStartLocation = result.start_locations.names[0];
    const topStartCount = result.start_locations.counts[0];
    const topStartPercentage = result.start_locations.percentages[0];

    const topEndLocation = result.end_locations.names[0];
    const topEndCount = result.end_locations.counts[0];
    const topEndPercentage = result.end_locations.percentages[0];

    const topRoute = result.routes.names[0];
    const topRouteCount = result.routes.counts[0];
    const topRoutePercentage = result.routes.percentages[0];

    return `
        <div class="card-text">
            <p><strong>Most frequent start location:</strong> ${topStartLocation} with ${topStartCount} transports (${topStartPercentage.toFixed(1)}% of total)</p>
            <p><strong>Most frequent destination:</strong> ${topEndLocation} with ${topEndCount} transports (${topEndPercentage.toFixed(1)}% of total)</p>
            <p><strong>Most frequent route:</strong> ${topRoute} with ${topRouteCount} transports (${topRoutePercentage.toFixed(1)}% of total)</p>

            <h6 class="mt-3">Top Routes Analysis</h6>
            <ul>
                ${result.routes.names.slice(0, 3).map((route, i) =>
                    `<li><strong>${route}:</strong> ${result.routes.counts[i]} transports (${result.routes.percentages[i].toFixed(1)}%)</li>`
                ).join('')}
            </ul>

            <h6 class="mt-3">Recommendations</h6>
            <ul>
                <li>Consider dedicated transporters or equipment for the route ${topRoute}</li>
                <li>Optimize paths between ${topStartLocation} and frequently used destinations</li>
                <li>Review staffing around ${topEndLocation} to ensure efficient patient transfers</li>
                <li>Investigate creating a direct transport system between the top 3 most frequent routes</li>
            </ul>
        </div>
    `;
}

/**
 * Generate insights for transport duration analysis
 * @param {Object} result - Analysis result
 * @returns {string} HTML for insights
 */
function generateTransportDurationInsights(result) {
    // Find the most common duration range
    const maxIndex = result.histogram.values.indexOf(Math.max(...result.histogram.values));
    const commonMinDuration = result.histogram.bins[maxIndex];
    const commonMaxDuration = maxIndex < result.histogram.bins.length - 1 ? result.histogram.bins[maxIndex + 1] : commonMinDuration + 5;
    const commonCount = result.histogram.values[maxIndex];
    const commonPercentage = (commonCount / result.count * 100).toFixed(1);

    // Calculate percentage of transports longer than 30 minutes
    const longDurationsIndices = result.histogram.bins.map((bin, index) => bin >= 30 ? index : -1).filter(index => index !== -1);
    const longDurationsCount = longDurationsIndices.reduce((sum, index) => sum + result.histogram.values[index], 0);
    const longDurationsPercentage = (longDurationsCount / result.count * 100).toFixed(1);

    return `
        <div class="card-text">
            <p><strong>Average transport duration:</strong> ${result.mean.toFixed(1)} minutes</p>
            <p><strong>Median transport duration:</strong> ${result.median.toFixed(1)} minutes</p>
            <p><strong>Most common duration range:</strong> ${commonMinDuration}-${commonMaxDuration} minutes (${commonPercentage}% of transports)</p>
            <p><strong>Long transports (30+ minutes):</strong> ${longDurationsCount} transports (${longDurationsPercentage}% of total)</p>

            <h6 class="mt-3">Duration Distribution Analysis</h6>
            <p>The shortest transport took ${result.min.toFixed(1)} minutes while the longest took ${result.max.toFixed(1)} minutes.</p>
            <p>The standard deviation is ${result.std.toFixed(1)} minutes, indicating ${result.std > 10 ? 'high' : 'moderate'} variability in transport times.</p>

            <h6 class="mt-3">Recommendations</h6>
            <ul>
                <li>Schedule transporters based on average duration of ${result.mean.toFixed(1)} minutes per transport</li>
                <li>Investigate long transports (30+ minutes) to identify potential bottlenecks or optimization opportunities</li>
                <li>Consider setting a target maximum transport time of ${Math.ceil(result.mean + result.std)} minutes</li>
                <li>Review scheduling to allocate ${Math.ceil(result.mean)} minutes per standard transport task</li>
            </ul>
        </div>
    `;
}

/**
 * Generate insights for priority analysis
 * @param {Object} result - Analysis result
 * @returns {string} HTML for insights
 */
function generatePriorityAnalysisInsights(result) {
    // Calculate total counts
    const totalTransports = result.counts.reduce((sum, count) => sum + count, 0);

    // Find high priority percentage
    const highPriorityIndex = result.priorities.findIndex(p => p.toLowerCase().includes('hög') || p.toLowerCase().includes('high') || p.toLowerCase() === 'akut');
    const highPriorityPercentage = highPriorityIndex !== -1 ? (result.counts[highPriorityIndex] / totalTransports * 100).toFixed(1) : 'N/A';

    // Find normal priority percentage
    const normalPriorityIndex = result.priorities.findIndex(p => p.toLowerCase().includes('normal'));
    const normalPriorityPercentage = normalPriorityIndex !== -1 ? (result.counts[normalPriorityIndex] / totalTransports * 100).toFixed(1) : 'N/A';

    // Find low priority percentage
    const lowPriorityIndex = result.priorities.findIndex(p => p.toLowerCase().includes('låg') || p.toLowerCase().includes('low'));
    const lowPriorityPercentage = lowPriorityIndex !== -1 ? (result.counts[lowPriorityIndex] / totalTransports * 100).toFixed(1) : 'N/A';

    // Check for hourly variations
    let highestPriorityHour = null;
    let highestPriorityPercentage = 0;

    if (Object.keys(result.hourly_distribution).length > 0) {
        for (const hour in result.hourly_distribution) {
            const hourData = result.hourly_distribution[hour];
            if (highPriorityIndex !== -1 && hourData.priorities.includes(result.priorities[highPriorityIndex])) {
                const priorityIndex = hourData.priorities.indexOf(result.priorities[highPriorityIndex]);
                const percentage = hourData.percentages[priorityIndex];

                if (percentage > highestPriorityPercentage) {
                    highestPriorityPercentage = percentage;
                    highestPriorityHour = hour;
                }
            }
        }
    }

    return `
        <div class="card-text">
            <h6>Priority Distribution</h6>
            <ul>
                ${result.priorities.map((priority, i) =>
                    `<li><strong>${priority}:</strong> ${result.counts[i]} transports (${result.percentages[i].toFixed(1)}%)</li>`
                ).join('')}
            </ul>

            ${highPriorityIndex !== -1 ? `
            <p><strong>High priority transports:</strong> ${result.counts[highPriorityIndex]} (${highPriorityPercentage}% of total)</p>
            ` : ''}

            ${highestPriorityHour !== null ? `
            <p><strong>Hour with highest percentage of high priority transports:</strong> ${highestPriorityHour}:00 (${highestPriorityPercentage.toFixed(1)}% of transports during this hour)</p>
            ` : ''}

            <h6 class="mt-3">Recommendations</h6>
            <ul>
                <li>Ensure adequate staffing during hours with high percentages of high priority transports</li>
                <li>Consider dedicated transporter assignments for high priority transports</li>
                <li>Review low priority transports to identify if any could be scheduled during less busy periods</li>
                ${highestPriorityHour !== null ? `<li>Increase staffing during ${highestPriorityHour}:00 as this hour has the highest percentage of high priority transports</li>` : ''}
            </ul>
        </div>
    `;
}

/**
 * Generate combined insights from all analyses
 * @param {Object} results - All analysis results
 */
function generateCombinedInsights(results) {
    const insightsContainer = document.getElementById('insightsContainer');

    // Create combined insights from all analyses
    let combinedInsights = `
        <h5>Combined Key Insights</h5>
        <div class="alert alert-info">
            <i class="fas fa-lightbulb me-2"></i>
            <strong>Analysis Summary:</strong> The following insights are generated from a comprehensive analysis of all available data.
        </div>
    `;

    // Add key insights based on available analyses
    let insightPoints = [];

    // Hourly activity insights
    if (results.hourly_activity) {
        const peakHour = results.hourly_activity.peak_hour;
        insightPoints.push(`Peak transport activity occurs at ${peakHour}:00.`);
    }

    // Transport types insights
    if (results.transport_types && results.transport_types.most_common) {
        insightPoints.push(`The most common transport type is "${results.transport_types.most_common}" (${results.transport_types.percentages[results.transport_types.types.indexOf(results.transport_types.most_common)].toFixed(1)}% of transports).`);
    }

    // Transport duration insights
    if (results.transport_duration) {
        insightPoints.push(`Average transport duration is ${results.transport_duration.mean.toFixed(1)} minutes.`);

        // Calculate percentage of long transports
        const longDurationsIndices = results.transport_duration.histogram.bins.map((bin, index) => bin >= 30 ? index : -1).filter(index => index !== -1);
        const longDurationsCount = longDurationsIndices.reduce((sum, index) => sum + results.transport_duration.histogram.values[index], 0);
        const longDurationsPercentage = (longDurationsCount / results.transport_duration.count * 100).toFixed(1);

        if (longDurationsPercentage > 10) {
            insightPoints.push(`${longDurationsPercentage}% of transports take 30+ minutes, indicating potential for optimization.`);
        }
    }

    // Location frequency insights
    if (results.location_frequency && results.location_frequency.routes && results.location_frequency.routes.names.length > 0) {
        insightPoints.push(`The most frequent route is "${results.location_frequency.routes.names[0]}" (${results.location_frequency.routes.percentages[0].toFixed(1)}% of transports).`);
    }

    // Priority analysis insights
    if (results.priority_analysis && results.priority_analysis.priorities) {
        const highPriorityIndex = results.priority_analysis.priorities.findIndex(p =>
            p.toLowerCase().includes('hög') || p.toLowerCase().includes('high') || p.toLowerCase() === 'akut'
        );

        if (highPriorityIndex !== -1) {
            const highPriorityPercentage = results.priority_analysis.percentages[highPriorityIndex];
            insightPoints.push(`${highPriorityPercentage.toFixed(1)}% of transports are high priority.`);
        }
    }

    // Add insights list
    if (insightPoints.length > 0) {
        combinedInsights += `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">Key Findings</h6>
                </div>
                <div class="card-body">
                    <ul class="mb-0">
                        ${insightPoints.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // Add recommendations
    let recommendations = [];

    // Staffing recommendations
    if (results.hourly_activity && results.priority_analysis) {
        recommendations.push("Adjust transporter staffing to match peak hours and high priority transport times.");
    }

    // Equipment recommendations
    if (results.transport_types && results.transport_types.most_common) {
        recommendations.push(`Ensure adequate availability of equipment for ${results.transport_types.most_common} transports.`);
    }

    // Route optimization
    if (results.location_frequency && results.location_frequency.routes && results.location_frequency.routes.names.length > 0) {
        recommendations.push(`Optimize paths for the most frequent route: ${results.location_frequency.routes.names[0]}.`);
    }

    // Duration-based scheduling
    if (results.transport_duration) {
        recommendations.push(`Schedule transporters based on average duration of ${results.transport_duration.mean.toFixed(1)} minutes per transport.`);
    }

    // Add recommendations section
    if (recommendations.length > 0) {
        combinedInsights += `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">Recommendations</h6>
                </div>
                <div class="card-body">
                    <ul class="mb-0">
                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    insightsContainer.innerHTML = combinedInsights;
}

/**
 * Switch the view mode for results
 * @param {string} mode - View mode ('chart', 'table', or 'raw')
 */
function switchViewMode(mode) {
    // Update current view mode
    currentViewMode = mode;

    // Update active button
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`view${mode.charAt(0).toUpperCase() + mode.slice(1)}Btn`).classList.add('active');

    // Update view
    if (currentResults) {
        displayResults(currentResults, mode);
    }
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

// Initialize the analysis page when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initAnalysis();
});