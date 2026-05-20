import os
from flask import Flask
from extensions import db
from models import Faculty, Student, Session, Attendance, FaceData

def check_db():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///smart_attendance.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        print("Faculty count:", Faculty.query.count())
        print("Student count:", Student.query.count())
        print("Session count:", Session.query.count())
        print("Attendance count:", Attendance.query.count())
        print("FaceData count:", FaceData.query.count())

if __name__ == "__main__":
    check_db()
