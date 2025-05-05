from flask import Blueprint, jsonify, request, current_app
from app.models.data_model import DataModel
import os

data = Blueprint('data', __name__)


@data.route('/api/data/summary')
def get_data_summary():
    """Get summary of the loaded data"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        model = DataModel(file_path)
        model.load_data()
        summary = model.get_data_summary()

        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@data.route('/api/data/columns')
def get_columns():
    """Get column names from the loaded data"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        model = DataModel(file_path)
        model.load_data()
        columns = model.get_column_names()

        return jsonify({
            'success': True,
            'columns': columns
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@data.route('/api/data/unique_values/<column>')
def get_unique_values(column):
    """Get unique values for a specific column"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        model = DataModel(file_path)
        model.load_data()

        # Check if column exists
        if column not in model.data.columns:
            return jsonify({
                'success': False,
                'error': f'Column not found: {column}'
            }), 404

        values = model.get_unique_values(column)

        return jsonify({
            'success': True,
            'column': column,
            'values': values
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@data.route('/api/data/filter', methods=['POST'])
def filter_data():
    """Filter data based on criteria"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        # Get filters from request
        filters = request.json.get('filters', {})

        if not filters:
            return jsonify({
                'success': False,
                'error': 'No filters provided'
            }), 400

        model = DataModel(file_path)
        model.load_data()

        filtered_data = model.filter_data(filters)

        # Convert to a format suitable for JSON
        result = filtered_data.head(100).to_dict(orient='records')

        return jsonify({
            'success': True,
            'data': result,
            'total_rows': len(filtered_data),
            'returned_rows': min(100, len(filtered_data))
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@data.route('/api/data/sample')
def get_data_sample():
    """Get a sample of the data"""
    try:
        file_path = current_app.config.get('CURRENT_DATA_FILE')

        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'No data file loaded'
            }), 404

        # Get sample size from query parameters
        sample_size = request.args.get('size', 10, type=int)

        model = DataModel(file_path)
        model.load_data()

        # Get sample data
        sample_data = model.data.head(sample_size).to_dict(orient='records')

        return jsonify({
            'success': True,
            'data': sample_data,
            'total_rows': len(model.data),
            'sample_size': min(sample_size, len(model.data))
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500