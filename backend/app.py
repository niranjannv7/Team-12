import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from extensions import db

def create_app():
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
    app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///smart_attendance.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    CORS(app)
    db.init_app(app)

    with app.app_context():
        from routes import api_bp
        app.register_blueprint(api_bp, url_prefix='/api')
        
        # Import models so they are registered with SQLAlchemy
        import models
        # Create all tables
        db.create_all()

    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001)
