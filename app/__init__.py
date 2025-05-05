from flask import Flask
import os


def create_app(config=None):
    """Create and configure the Flask application"""
    app = Flask(__name__)

    # Default configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key_for_development_only'),
        UPLOAD_FOLDER=os.environ.get('UPLOAD_FOLDER', os.path.join(os.getcwd(), 'uploads')),
        CURRENT_DATA_FILE=None
    )

    # Apply additional configuration if provided
    if config:
        # Change this line to use from_object instead of from_mapping
        app.config.from_object(config)

    # Register blueprints
    from app.controllers.main_controller import main
    from app.controllers.data_controller import data
    from app.controllers.analysis_controller import analysis

    app.register_blueprint(main)
    app.register_blueprint(data)
    app.register_blueprint(analysis)

    # Create upload folder if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    return app