from flask import Blueprint, render_template, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename
from app.utils import safe_jsonify  # Add this import

main = Blueprint('main', __name__)


@main.route('/')
def index():
    """Render the main dashboard page"""
    return render_template('dashboard.html', title='Transport Analysis Dashboard')


@main.route('/transporters')
def transporters():
    """Render the transporters page"""
    return render_template('transporters.html', title='Transporter Analysis')


@main.route('/analysis')
def analysis():
    """Render the custom analysis page"""
    return render_template('analysis.html', title='Custom Analysis')


@main.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    if 'file' not in request.files:
        return safe_jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return safe_jsonify({'success': False, 'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        upload_folder = current_app.config['UPLOAD_FOLDER']

        # Create upload folder if it doesn't exist
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        # Store the file path in the session
        current_app.config['CURRENT_DATA_FILE'] = file_path

        return safe_jsonify({
            'success': True,
            'filename': filename,
            'file_path': file_path
        })

    return safe_jsonify({'success': False, 'error': 'Failed to upload file'}), 400


@main.route('/api/get_current_file')
def get_current_file():
    """Get the current data file path"""
    file_path = current_app.config.get('CURRENT_DATA_FILE')

    # If no file is currently set, check the uploads folder for any CSV files
    if not file_path or not os.path.exists(file_path):
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if os.path.exists(upload_folder):
            csv_files = [f for f in os.listdir(upload_folder) if f.lower().endswith('.csv')]
            if csv_files:
                # Use the most recently modified file
                newest_file = max(csv_files, key=lambda f: os.path.getmtime(os.path.join(upload_folder, f)))
                file_path = os.path.join(upload_folder, newest_file)
                # Update the current file in the config
                current_app.config['CURRENT_DATA_FILE'] = file_path

    if file_path and os.path.exists(file_path):
        return safe_jsonify({
            'success': True,
            'file_path': file_path,
            'filename': os.path.basename(file_path)
        })

    # Return success: False with a 200 status code instead of 404
    return safe_jsonify({
        'success': False,
        'error': 'No data file loaded'
    })