/**
 * shared.js - Common functionality shared across all pages
 */

/**
 * Global variables
 */
const appState = {
    currentFile: null,
    isFileLoaded: false,
    lastError: null
};

/**
 * Initialize the application
 */
function initApp() {
    // Check for current file
    checkCurrentFile();

    // Set up event listeners
    setupEventListeners();
}

/**
 * Check if a data file is currently loaded
 */
function checkCurrentFile() {
    fetch('/api/get_current_file')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                appState.currentFile = data.filename;
                appState.isFileLoaded = true;

                // Update UI to show current file
                updateFileInfoDisplay(data.filename);
            } else {
                appState.isFileLoaded = false;
                appState.currentFile = null;
            }
        })
        .catch(error => {
            console.error('Error checking current file:', error);
            appState.isFileLoaded = false;
            appState.currentFile = null;
            appState.lastError = 'Failed to check if a file is loaded.';
        });
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Set up file upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
            uploadModal.show();
        });
    }

    // Set up file upload form
    const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');
    if (uploadSubmitBtn) {
        uploadSubmitBtn.addEventListener('click', uploadFile);
    }
}

/**
 * Update the file info display
 * @param {string} filename - Name of the loaded file
 */
function updateFileInfoDisplay(filename) {
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    const currentFileName = document.getElementById('currentFileName');

    if (fileInfoContainer && currentFileName) {
        fileInfoContainer.style.display = 'block';
        currentFileName.textContent = filename;
    }
}

/**
 * Upload a file to the server
 */
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showUploadError('Please select a file');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const progressBar = document.querySelector('.progress');
    const progressBarInner = document.querySelector('.progress-bar');

    progressBar.style.display = 'block';
    document.getElementById('uploadError').style.display = 'none';

    // Show progress (simulated since fetch doesn't have progress events)
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 90) {
            progress += 10;
            progressBarInner.style.width = `${progress}%`;
            progressBarInner.textContent = `${progress}%`;
        }
    }, 300);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);

        if (data.success) {
            // Set progress to 100%
            progressBarInner.style.width = '100%';
            progressBarInner.textContent = '100%';

            // Update app state
            appState.currentFile = data.filename;
            appState.isFileLoaded = true;

            // Update UI
            updateFileInfoDisplay(data.filename);

            // Close modal
            const uploadModal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            uploadModal.hide();

            // Reload the page to reflect the new data
            window.location.reload();
        } else {
            showUploadError(data.error || 'Failed to upload file');
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        showUploadError('An error occurred during upload');
        console.error('Error uploading file:', error);
    })
    .finally(() => {
        clearInterval(progressInterval);
    });
}

/**
 * Show an error message in the upload modal
 * @param {string} message - Error message to display
 */
function showUploadError(message) {
    const errorElement = document.getElementById('uploadError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // Hide progress bar
    const progressBar = document.querySelector('.progress');
    if (progressBar) {
        progressBar.style.display = 'none';
    }
}

/**
 * Handle API errors
 * @param {Response} response - Fetch API response
 * @returns {Promise} Promise that resolves with JSON or rejects with error
 */
function handleApiResponse(response) {
    if (!response.ok) {
        return response.json()
            .then(data => {
                throw new Error(data.error || `HTTP error ${response.status}`);
            })
            .catch(error => {
                throw new Error(`HTTP error ${response.status}: ${error.message}`);
            });
    }
    return response.json();
}

/**
 * Show a toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Map type to Bootstrap classes
    const typeClasses = {
        success: 'bg-success text-white',
        error: 'bg-danger text-white',
        info: 'bg-info text-dark',
        warning: 'bg-warning text-dark'
    };

    // Create toast element
    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div id="${toastId}" class="toast ${typeClasses[type] || typeClasses.info}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    // Add toast to container
    toastContainer.innerHTML += toastHtml;

    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: duration
    });

    toast.show();

    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

/**
 * Load and render a simple chart
 * @param {string} elementId - Canvas element ID
 * @param {string} type - Chart type ('bar', 'line', 'pie', etc.)
 * @param {Object} data - Chart data
 * @param {Object} options - Chart options
 * @returns {Chart} Chart instance
 */
function renderChart(elementId, type, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
        console.error(`Canvas element with ID '${elementId}' not found`);
        return null;
    }

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    // Create new chart
    return new Chart(canvas, {
        type: type,
        data: data,
        options: options
    });
}

/**
 * Export CSV data
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Filename for the downloaded file
 */
function exportToCsv(data, filename = 'export.csv') {
    if (!data || !data.length) {
        showNotification('No data to export', 'error');
        return;
    }

    // Get headers from the first row
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        // Headers row
        headers.join(','),
        // Data rows
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Quote strings that contain commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';

    // Add to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported to ${filename}`, 'success');
}

/**
 * Export chart as an image
 * @param {string} chartId - ID of the chart canvas
 * @param {string} filename - Filename for the downloaded image
 */
function exportChartAsImage(chartId, filename = 'chart.png') {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        showNotification('Chart not found', 'error');
        return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();

    showNotification(`Exported to ${filename}`, 'success');
}

/**
 * Print the current page
 * @param {string} title - Optional title for the printed page
 */
function printPage(title = null) {
    // Set print title if provided
    if (title) {
        document.title = title;
    }

    // Print the page
    window.print();

    // Restore original title after printing
    if (title) {
        setTimeout(() => {
            document.title = document.title.replace(title, '');
        }, 100);
    }
}

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', initApp);