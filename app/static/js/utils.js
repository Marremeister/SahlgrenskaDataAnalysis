/**
 * utils.js - Common utility functions for the Hospital Transport Analysis system
 */

/**
 * Date and Time Utilities
 */

/**
 * Parse a datetime string in various formats
 * @param {string} dateTimeStr - Date/time string to parse
 * @returns {Date|null} Parsed Date object or null if parsing failed
 */
function parseDateTime(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
        return null;
    }

    // Try multiple date formats
    const formats = [
        { regex: /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/, fn: (m) => new Date(m[3], m[2] - 1, m[1], m[4], m[5], m[6]) }, // DD-MM-YYYY HH:MM:SS
        { regex: /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/, fn: (m) => new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) }, // YYYY-MM-DD HH:MM:SS
        { regex: /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/, fn: (m) => new Date(m[3], m[1] - 1, m[2], m[4], m[5], m[6]) }, // MM/DD/YYYY HH:MM:SS
        { regex: /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/, fn: (m) => new Date(m[3], m[1] - 1, m[2], m[4], m[5], 0) },           // MM/DD/YYYY HH:MM
        { regex: /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/, fn: (m) => new Date(m[3], m[2] - 1, m[1], m[4], m[5], m[6]) } // DD.MM.YYYY HH:MM:SS
    ];

    for (const format of formats) {
        const match = dateTimeStr.match(format.regex);
        if (match) {
            try {
                const date = format.fn(match);
                // Check if date is valid
                if (!isNaN(date.getTime())) {
                    return date;
                }
            } catch (e) {
                console.error('Error parsing date:', e);
            }
        }
    }

    // Try native Date parsing as a last resort
    try {
        const date = new Date(dateTimeStr);
        if (!isNaN(date.getTime())) {
            return date;
        }
    } catch (e) {
        console.error('Native date parsing failed:', e);
    }

    console.warn(`Could not parse datetime string: ${dateTimeStr}`);
    return null;
}

/**
 * Format a Date object to string
 * @param {Date} date - Date to format
 * @param {string} format - Format string ('YYYY-MM-DD', 'DD/MM/YYYY', etc.)
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    const pad = (num) => String(num).padStart(2, '0');

    const replacements = {
        YYYY: date.getFullYear(),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        HH: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds())
    };

    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => replacements[match]);
}

/**
 * Calculate duration in minutes between two datetime strings
 * @param {string} startTimeStr - Start time string
 * @param {string} endTimeStr - End time string
 * @returns {number} Duration in minutes (0 if invalid)
 */
function calculateDurationMinutes(startTimeStr, endTimeStr) {
    const startTime = parseDateTime(startTimeStr);
    const endTime = parseDateTime(endTimeStr);

    if (!startTime || !endTime) {
        return 0;
    }

    const durationMs = endTime - startTime;

    // Check for negative durations (which would indicate data errors)
    if (durationMs < 0) {
        console.warn(`Negative duration calculated: ${durationMs / 60000} minutes`);
        console.warn(`Start time: ${startTimeStr}, End time: ${endTimeStr}`);
        return 0;
    }

    return durationMs / 60000; // Convert ms to minutes
}

/**
 * Get the hour from a datetime string
 * @param {string} dateTimeStr - Datetime string
 * @returns {number|null} Hour (0-23) or null if parsing failed
 */
function getHourFromDateTimeString(dateTimeStr) {
    const date = parseDateTime(dateTimeStr);
    return date ? date.getHours() : null;
}

/**
 * Statistical Utilities
 */

/**
 * Calculate mean of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number} Mean value (0 if empty array)
 */
function calculateMean(values) {
    if (!values || values.length === 0) {
        return 0;
    }

    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate median of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number} Median value (0 if empty array)
 */
function calculateMedian(values) {
    if (!values || values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const midIndex = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[midIndex - 1] + sorted[midIndex]) / 2;
    } else {
        return sorted[midIndex];
    }
}

/**
 * Calculate standard deviation of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number} Standard deviation (0 if empty array)
 */
function calculateStandardDeviation(values) {
    if (!values || values.length <= 1) {
        return 0;
    }

    const mean = calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(variance);
}

/**
 * Calculate Gini coefficient (measure of inequality)
 * @param {number[]} values - Array of numeric values
 * @returns {number} Gini coefficient (0-1 range, 0 if empty array)
 */
function calculateGini(values) {
    if (!values || values.length <= 1) {
        return 0;
    }

    // Sort values in ascending order
    const sortedValues = [...values].sort((a, b) => a - b);

    let sumOfDifferences = 0;
    for (let i = 0; i < sortedValues.length; i++) {
        for (let j = 0; j < sortedValues.length; j++) {
            sumOfDifferences += Math.abs(sortedValues[i] - sortedValues[j]);
        }
    }

    const sumOfValues = sortedValues.reduce((sum, val) => sum + val, 0);

    // Avoid division by zero
    if (sumOfValues === 0) {
        return 0;
    }

    return sumOfDifferences / (2 * sortedValues.length * sumOfValues);
}

/**
 * Create a histogram from values
 * @param {number[]} values - Array of numeric values
 * @param {number[]} bins - Array of bin edges
 * @returns {number[]} Counts for each bin
 */
function createHistogram(values, bins) {
    if (!values || !bins || values.length === 0 || bins.length === 0) {
        return [];
    }

    const counts = new Array(bins.length).fill(0);

    values.forEach(val => {
        for (let i = 0; i < bins.length; i++) {
            const currentBin = bins[i];
            const nextBin = i < bins.length - 1 ? bins[i + 1] : Infinity;

            if (val >= currentBin && val < nextBin) {
                counts[i]++;
                break;
            }
        }
    });

    return counts;
}

/**
 * Data Processing Utilities
 */

/**
 * Group data by a specific field
 * @param {Object[]} data - Array of data objects
 * @param {string|Function} keyField - Field name or function to extract key
 * @returns {Object} Grouped data as {key: [items]}
 */
function groupBy(data, keyField) {
    if (!data || !Array.isArray(data)) {
        return {};
    }

    const result = {};

    data.forEach(item => {
        const key = typeof keyField === 'function' ? keyField(item) : item[keyField];

        if (key === undefined || key === null) {
            return;
        }

        if (!result[key]) {
            result[key] = [];
        }

        result[key].push(item);
    });

    return result;
}

/**
 * Filter data by multiple criteria
 * @param {Object[]} data - Array of data objects
 * @param {Object} filters - Object with field-value pairs for filtering
 * @returns {Object[]} Filtered data
 */
function filterData(data, filters) {
    if (!data || !Array.isArray(data) || !filters || typeof filters !== 'object') {
        return data;
    }

    return data.filter(item => {
        for (const [field, value] of Object.entries(filters)) {
            if (item[field] !== value) {
                return false;
            }
        }
        return true;
    });
}

/**
 * Get unique values for a field
 * @param {Object[]} data - Array of data objects
 * @param {string} field - Field name
 * @returns {any[]} Array of unique values
 */
function getUniqueValues(data, field) {
    if (!data || !Array.isArray(data) || !field) {
        return [];
    }

    const values = data.map(item => item[field]);
    return [...new Set(values)].filter(val => val !== undefined && val !== null);
}

/**
 * Count occurrences of values for a field
 * @param {Object[]} data - Array of data objects
 * @param {string} field - Field name
 * @returns {Object} Counts object {value: count}
 */
function countValues(data, field) {
    if (!data || !Array.isArray(data) || !field) {
        return {};
    }

    const counts = {};

    data.forEach(item => {
        const value = item[field];

        if (value === undefined || value === null) {
            return;
        }

        counts[value] = (counts[value] || 0) + 1;
    });

    return counts;
}

/**
 * Visualization Utilities
 */

/**
 * Generate an array of colors with specified alpha
 * @param {number} count - Number of colors to generate
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string[]} Array of color strings
 */
function generateColors(count, alpha = 0.5) {
    const baseColors = [
        `rgba(255, 99, 132, ${alpha})`,   // Red
        `rgba(54, 162, 235, ${alpha})`,   // Blue
        `rgba(255, 206, 86, ${alpha})`,   // Yellow
        `rgba(75, 192, 192, ${alpha})`,   // Teal
        `rgba(153, 102, 255, ${alpha})`,  // Purple
        `rgba(255, 159, 64, ${alpha})`,   // Orange
        `rgba(199, 199, 199, ${alpha})`,  // Gray
        `rgba(83, 102, 255, ${alpha})`,   // Indigo
        `rgba(255, 99, 255, ${alpha})`,   // Pink
        `rgba(99, 255, 132, ${alpha})`    // Green
    ];

    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }

    // Generate additional colors if needed
    const colors = [...baseColors];

    for (let i = baseColors.length; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
    }

    return colors;
}

/**
 * Format a number with specified decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumber(value, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '-';
    }

    return value.toFixed(decimals);
}

/**
 * Format a percentage value
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
function formatPercent(value, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '-';
    }

    return `${value.toFixed(decimals)}%`;
}

/**
 * Format a duration in minutes to a readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
function formatDuration(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes)) {
        return '-';
    }

    if (minutes < 60) {
        return `${minutes.toFixed(1)} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes.toFixed(0)}m`;
}

/**
 * DOM Utilities
 */

/**
 * Create an element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {string|Node|Array} content - Element content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attrs = {}, content = null) {
    const element = document.createElement(tag);

    // Set attributes
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else {
            element.setAttribute(key, value);
        }
    }

    // Add content
    if (content !== null) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (typeof item === 'string') {
                    element.appendChild(document.createTextNode(item));
                } else if (item instanceof Node) {
                    element.appendChild(item);
                }
            });
        }
    }

    return element;
}

/**
 * Show a loading spinner
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 * @returns {HTMLElement} Created spinner element
 */
function showLoadingSpinner(container, message = 'Loading...') {
    // Clear container
    container.innerHTML = '';

    const spinner = createElement('div', { className: 'text-center py-4' }, [
        createElement('div', { className: 'spinner-border text-primary', role: 'status' }, [
            createElement('span', { className: 'visually-hidden' }, 'Loading...')
        ]),
        createElement('p', { className: 'mt-2' }, message)
    ]);

    container.appendChild(spinner);
    return spinner;
}

/**
 * Show an error message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 * @returns {HTMLElement} Created error element
 */
function showError(container, message) {
    // Clear container
    container.innerHTML = '';

    const error = createElement('div', { className: 'alert alert-danger' }, [
        createElement('i', { className: 'fas fa-exclamation-circle me-2' }),
        message
    ]);

    container.appendChild(error);
    return error;
}

/**
 * Export utilities
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Date and Time
        parseDateTime,
        formatDate,
        calculateDurationMinutes,
        getHourFromDateTimeString,

        // Statistics
        calculateMean,
        calculateMedian,
        calculateStandardDeviation,
        calculateGini,
        createHistogram,

        // Data Processing
        groupBy,
        filterData,
        getUniqueValues,
        countValues,

        // Visualization
        generateColors,
        formatNumber,
        formatPercent,
        formatDuration,

        // DOM
        createElement,
        showLoadingSpinner,
        showError
    };
}