import os
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from models import Faculty, Student, Session, Attendance, FaceData

def seed_database():
    app = create_app()
    with app.app_context():
        # Step 1: Clear existing data
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables...")
        db.create_all()

        # Step 2: Seed Faculty
        faculties = [
            Faculty(id='FAC001', name='Dr. Ramesh Kumar', dept='CSE', subject='Data Structures', email='ramesh@college.edu', password_hash='password123', avatar='RK'),
            Faculty(id='FAC002', name='Prof. Anitha Selvi', dept='CSE', subject='Database Management', email='anitha@college.edu', password_hash='password123', avatar='AS'),
            Faculty(id='FAC003', name='Dr. Vijay Mohan', dept='CSE', subject='Computer Networks', email='vijay@college.edu', password_hash='password123', avatar='VM'),
            Faculty(id='FAC004', name='Prof. Kavitha Rajan', dept='CSE', subject='Operating Systems', email='kavitha@college.edu', password_hash='password123', avatar='KR'),
            Faculty(id='FAC005', name='Dr. Suresh Babu', dept='CSE', subject='Machine Learning', email='suresh@college.edu', password_hash='password123', avatar='SB'),
            Faculty(id='FAC006', name='Niranjan Kumar NV', dept='CSE', subject='Mathematics', email='niranjan@college.edu', password_hash='NV7102005', avatar='NK')
        ]
        db.session.add_all(faculties)
        print(f"Seeded {len(faculties)} faculty members.")

        # Step 3: Seed Students
        students = [
            Student(name='Aravind Kumar', reg_no='22CS001', dept='CSE', batch='2022-26', class_name='1st Year', section='A', email='aravind@college.edu', phone='9876543210'),
            Student(name='Priya Nair', reg_no='22CS002', dept='CSE', batch='2022-26', class_name='1st Year', section='A', email='priya@college.edu', phone='9876543211'),
            Student(name='Karthick Raja', reg_no='22CS003', dept='CSE', batch='2022-26', class_name='1st Year', section='A', email='karthick@college.edu', phone='9876543212'),
            Student(name='Meena Sundaram', reg_no='22CS004', dept='CSE', batch='2022-26', class_name='1st Year', section='A', email='meena@college.edu', phone='9876543213'),
            Student(name='Balaji Krishnan', reg_no='22CS005', dept='CSE', batch='2022-26', class_name='1st Year', section='B', email='balaji@college.edu', phone='9876543214'),
            Student(name='Deepa Ramachandran', reg_no='22CS006', dept='CSE', batch='2022-26', class_name='1st Year', section='B', email='deepa@college.edu', phone='9876543215')
        ]
        db.session.add_all(students)
        db.session.flush() # To get student IDs
        print(f"Seeded {len(students)} students.")

        # Step 4: Seed historical sessions and attendance
        today = datetime.now()
        subjects = ['Data Structures', 'Database Management', 'Computer Networks', 'Operating Systems', 'Machine Learning']
        
        session_count = 0
        attendance_count = 0

        for i in range(1, 11): # 10 historical sessions
            date_obj = today - timedelta(days=i)
            date_str = date_obj.strftime("%Y-%m-%d")
            
            # Create a session for each subject
            for faculty in faculties:
                sess_id = f"sess_hist_{faculty.id}_{i}"
                sess = Session(
                    id=sess_id,
                    faculty_id=faculty.id,
                    subject=faculty.subject,
                    class_name='1st Year',
                    section='A',
                    start_time=date_obj.replace(hour=9, minute=0, second=0),
                    duration_minutes=60,
                    date=date_str,
                    status='completed'
                )
                db.session.add(sess)
                session_count += 1
                
                # Mark attendance for each student
                for student in students:
                    # Randomly mark some as absent to make it realistic (80% attendance rate)
                    import random
                    status = 'present' if random.random() > 0.2 else 'absent'
                    att = Attendance(
                        session_id=sess_id,
                        student_id=student.id,
                        status=status,
                        time=sess.start_time
                    )
                    db.session.add(att)
                    attendance_count += 1

        db.session.commit()
        print(f"Seeded {session_count} sessions and {attendance_count} attendance records.")
        print("Database seeding complete!")

if __name__ == "__main__":
    seed_database()
