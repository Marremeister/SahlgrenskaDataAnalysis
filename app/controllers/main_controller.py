from flask import Blueprint, render_template, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename

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
        return jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

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

        return jsonify({
            'success': True,
            'filename': filename,
            'file_path': file_path
        })

    return jsonify({'success': False, 'error': 'Failed to upload file'}), 400


@main.route('/api/get_current_file')
def get_current_file():
    """Get the current data file path"""
    file_path = current_app.config.get('CURRENT_DATA_FILE')

    if file_path and os.path.exists(file_path):
        return jsonify({
            'success': True,
            'file_path': file_path,
            'filename': os.path.basename(file_path)
        })

    return jsonify({
        'success': False,
        'error': 'No data file loaded'
    }), 404