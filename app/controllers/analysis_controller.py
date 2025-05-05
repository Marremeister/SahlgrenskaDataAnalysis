from flask import Blueprint, jsonify, request, current_app
from app.models.transporter_model import TransporterModel
from app.models.analysis_model import AnalysisModel
import os

analysis = Blueprint('analysis', __name__)


@analysis.route('/api/analysis/available')
def get_available_analyses():
    """Get list of available analysis types"""
    try:
        model = AnalysisModel()
        analyses = model.get_available_analyses()

        return jsonify({
            'success': True,
            'analyses': analyses
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analysis.route('/api/analysis/run/<analysis_type>', methods=['POST'])
def run_analysis(analysis_type):
    """Run a specific analysis"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        # Get parameters from request
        params = request.json.get('params', {})

        model = AnalysisModel(file_path)
        model.load_data()

        # Run the analysis
        result = model.run_analysis(analysis_type, **params)

        return jsonify({
            'success': True,
            'analysis_type': analysis_type,
            'result': result
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analysis.route('/api/analysis/run_all', methods=['POST'])
def run_all_analyses():
    """Run all available analyses"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        model = AnalysisModel(file_path)
        model.load_data()

        # Run all analyses
        results = model.run_all_analyses()

        return jsonify({
            'success': True,
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analysis.route('/api/transporters/workload')
def analyze_transporter_workload():
    """Analyze transporter workload distribution"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        model = TransporterModel(file_path)
        model.load_data()
        model.preprocess_data()

        workload_stats, hourly_stats = model.analyze_workload()

        return jsonify({
            'success': True,
            'workload_stats': workload_stats,
            'hourly_stats': hourly_stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analysis.route('/api/transporters/highest_inequality')
def get_highest_inequality_periods():
    """Get periods with highest inequality"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        # Get limit from query parameters
        limit = request.args.get('limit', 5, type=int)

        model = TransporterModel(file_path)
        model.load_data()
        model.preprocess_data()
        model.analyze_workload()

        highest_inequality = model.get_highest_inequality_periods(limit)

        return jsonify({
            'success': True,
            'highest_inequality': highest_inequality
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analysis.route('/api/transporters/lowest_inequality')
def get_lowest_inequality_periods():
    """Get periods with lowest inequality"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        # Get limit from query parameters
        limit = request.args.get('limit', 5, type=int)

        model = TransporterModel(file_path)
        model.load_data()
        model.preprocess_data()
        model.analyze_workload()

        lowest_inequality = model.get_lowest_inequality_periods(limit)

        return jsonify({
            'success': True,
            'lowest_inequality': lowest_inequality
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analysis.route('/api/transporters/summary')
def get_transporter_summary():
    """Get summary statistics for each transporter"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        model = TransporterModel(file_path)
        model.load_data()
        model.preprocess_data()

        transporter_summary = model.get_transporter_summary()

        return jsonify({
            'success': True,
            'transporter_summary': transporter_summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500