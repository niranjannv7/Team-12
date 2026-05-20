from extensions import db
from datetime import datetime

class Faculty(db.Model):
    id = db.Column(db.String(20), primary_key=True)  # custom string IDs like FAC001 based on frontend
    name = db.Column(db.String(100), nullable=False)
    dept = db.Column(db.String(50))
    subject = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    avatar = db.Column(db.String(10))

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    reg_no = db.Column(db.String(20), unique=True, nullable=False)
    dept = db.Column(db.String(50))
    batch = db.Column(db.String(20))
    class_name = db.Column(db.String(50)) # e.g. 1st Year, 2nd Year
    section = db.Column(db.String(10))    # e.g. A, B, C
    email = db.Column(db.String(120), unique=True)
    phone = db.Column(db.String(20))
    face_count = db.Column(db.Integer, default=0)

class Session(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    faculty_id = db.Column(db.String(20), db.ForeignKey('faculty.id'), nullable=False)
    subject = db.Column(db.String(100))
    class_name = db.Column(db.String(50))
    section = db.Column(db.String(10))
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    duration_minutes = db.Column(db.Integer)
    date = db.Column(db.String(20)) # Storing as YYYY-MM-DD
    status = db.Column(db.String(20), default="active")

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(50), db.ForeignKey('session.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False) # present, absent
    time = db.Column(db.DateTime, default=datetime.utcnow)

class FaceData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    encoding = db.Column(db.Text)
