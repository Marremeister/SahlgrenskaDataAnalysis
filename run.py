import os
from app import create_app
from config import config

# Get environment from system environment variable or use default
env = os.environ.get('FLASK_ENV', 'development')
app_config = config.get(env, config['default'])

# Create the app
app = create_app(app_config)

# Print all registered routes to debug
with app.app_context():
    print("\n==== Registered Routes ====")
    for rule in app.url_map.iter_rules():
        print(f"{rule} - {rule.endpoint}")
    print("==========================\n")

if __name__ == '__main__':
    # Run the app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)