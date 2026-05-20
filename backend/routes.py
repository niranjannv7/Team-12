from flask import Blueprint, request, jsonify
from extensions import db
from sqlalchemy.exc import IntegrityError
from models import Faculty, Student, Session, Attendance, FaceData
from datetime import datetime
import uuid
import cv2
import face_recognition
import numpy as np
import base64
import json
import os

cached_encodings = []
cached_student_ids = []
cache_version = -1

def get_known_encodings():
    global cached_encodings, cached_student_ids, cache_version
    face_count = FaceData.query.count()
    if len(cached_encodings) == 0 or cache_version != face_count:
        all_face_data = FaceData.query.all()
        known_encodings = []
        known_ids = []
        for fd in all_face_data:
            if fd.encoding:
                known_encodings.append(np.array(json.loads(fd.encoding)))
                known_ids.append(fd.student_id)
        cached_encodings = known_encodings
        cached_student_ids = known_ids
        cache_version = face_count
    return cached_encodings, cached_student_ids

api_bp = Blueprint('api_bp', __name__)

# --- AUTH ---
@api_bp.route('/auth/faculty/login', methods=['POST'])
def faculty_login():
    data = request.json
    name_or_email = data.get('name')
    password = data.get('password')
    faculty = Faculty.query.filter(Faculty.name.ilike(name_or_email)).first()
    if not faculty:
        faculty = Faculty.query.filter(Faculty.email.ilike(name_or_email)).first()
    
    if faculty and faculty.password_hash == password: # Simple matching for now
        user_data = {
            'id': faculty.id,
            'name': faculty.name,
            'subject': faculty.subject,
            'dept': faculty.dept,
            'email': faculty.email,
            'avatar': faculty.avatar
        }
        return jsonify({'success': True, 'user': user_data, 'token': 'dummy_token_123'})
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 400

@api_bp.route('/auth/faculty/register', methods=['POST'])
def faculty_register():
    data = request.json
    fac_id = 'FAC' + str(uuid.uuid4())[:6].upper()
    avatar = ''.join([w[0] for w in data['name'].split()][:2]).upper()
    
    # Check if exists
    if Faculty.query.filter_by(name=data['name']).first():
        return jsonify({'success': False, 'message': 'Faculty name already exists'}), 400

    faculty = Faculty(
        id=fac_id,
        name=data['name'],
        dept=data['dept'],
        subject=data['subject'],
        email=data['email'],
        password_hash=data['password'],
        avatar=avatar
    )
    db.session.add(faculty)
    db.session.commit()
    return jsonify({'success': True, 'user': {'id': fac_id, 'name': faculty.name}})

@api_bp.route('/auth/student/login', methods=['POST'])
def student_login():
    data = request.json
    name = data.get('name')
    reg = data.get('reg_no')
    
    student = Student.query.filter(Student.name.ilike(name), Student.reg_no.ilike(reg)).first()
    
    if student:
        user_data = {
            'id': student.id,
            'name': student.name,
            'reg': student.reg_no,
            'dept': student.dept,
            'batch': student.batch,
            'email': student.email
        }
        return jsonify({'success': True, 'user': user_data, 'token': 'dummy_student_token'})
    
    return jsonify({'success': False, 'message': 'Student not found. Check your details.'}), 400



# --- STUDENTS ---
@api_bp.route('/students', methods=['GET', 'POST'])
def manage_students():
    if request.method == 'GET':
        students = Student.query.all()
        s_list = [{
            'id': s.id, 'name': s.name, 'reg': s.reg_no, 
            'dept': s.dept, 'batch': s.batch, 
            'class_name': s.class_name, 'section': s.section,
            'email': s.email,
            'phone': s.phone, 'face_count': s.face_count
        } for s in students]
        return jsonify({'students': s_list})
    
    if request.method == 'POST':
        data = request.json
        student = Student(
            name=data['name'],
            reg_no=data['reg'],
            dept=data['dept'],
            batch=data['batch'],
            class_name=data.get('class_name'),
            section=data.get('section'),
            email=data.get('email') or None,
            phone=data.get('phone') or None
        )
        try:
            db.session.add(student)
            db.session.commit()
            return jsonify({'success': True, 'student': {
                'id': student.id, 'name': student.name, 'reg': student.reg_no, 
                'dept': student.dept, 'batch': student.batch, 
                'class_name': student.class_name, 'section': student.section,
                'face_count': 0
            }})
        except IntegrityError:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Student with this register number or email already exists.'}), 400

@api_bp.route('/students/<int:id>', methods=['PUT', 'DELETE'])
def student_ops(id):
    student = Student.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(student)
        db.session.commit()
        return jsonify({'success': True})
    if request.method == 'PUT':
        data = request.json
        for key in ['name', 'reg', 'dept', 'batch', 'class_name', 'section', 'email', 'phone']:
            if key in data:
                val = data[key]
                if val == "": val = None
                db_key = 'reg_no' if key == 'reg' else key
                setattr(student, db_key, val)
        db.session.commit()
        return jsonify({'success': True})

@api_bp.route('/students/<int:id>/faces', methods=['POST'])
def upload_faces(id):
    student = Student.query.get_or_404(id)
    files = list(request.files.values())
    
    count = 0
    os.makedirs('uploads', exist_ok=True)
    
    for f in files:
        if f.filename == '': continue
        path = os.path.join('uploads', f"{student.id}_{uuid.uuid4().hex[:6]}.jpg")
        f.save(path)
        
        try:
            image = face_recognition.load_image_file(path)
            encodings = face_recognition.face_encodings(image)
            if len(encodings) > 0:
                encoding_str = json.dumps(encodings[0].tolist())
                face_data = FaceData(student_id=student.id, image_path=path, encoding=encoding_str)
                db.session.add(face_data)
                count += 1
        except Exception as e:
            print("Error processing image:", e)
            
    student.face_count += count
    db.session.commit()
    return jsonify({'success': True, 'message': f'{count} face encodings successfully saved.'})

# --- ATTENDANCE ---
@api_bp.route('/attendance/start', methods=['POST'])
def start_session():
    data = request.json
    sess_id = 'sess_' + str(uuid.uuid4())[:8]
    # Handle provided start_time (HH:MM string)
    start_time_val = data.get('start_time')
    if start_time_val:
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            start_dt = datetime.strptime(f"{today} {start_time_val}", "%Y-%m-%d %H:%M")
        except:
            start_dt = datetime.now()
    else:
        start_dt = datetime.now()

    session = Session(
        id=sess_id,
        faculty_id=data.get('faculty_id', 'FAC001'),
        subject=data['subject'],
        class_name=data.get('class_name'),
        section=data.get('section'),
        duration_minutes=data.get('duration_minutes', 60),
        start_time=start_dt,
        date=datetime.now().strftime("%Y-%m-%d"),
        status='active'
    )
    db.session.add(session)
    db.session.commit()
    return jsonify({'success': True, 'session_id': sess_id})

@api_bp.route('/attendance/mark', methods=['POST'])
def mark_attendance():
    data = request.json
    session_id = data.get('session_id')
    student_reg = data.get('student_reg')
    
    sess = Session.query.get(session_id)
    if not sess or sess.status == 'completed':
        return jsonify({'success': False, 'message': 'Session already completed.'}), 400
    
    student = Student.query.filter_by(reg_no=student_reg).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    # Check if already marked
    existing = Attendance.query.filter_by(session_id=session_id, student_id=student.id).first()
    if not existing:
        att = Attendance(
            session_id=session_id,
            student_id=student.id,
            status='present'
        )
        db.session.add(att)
        db.session.commit()
        
    return jsonify({'success': True})

@api_bp.route('/attendance/end/<sess_id>', methods=['POST'])
def end_session(sess_id):
    sess = Session.query.get_or_404(sess_id)
    sess.status = 'completed'
    db.session.commit()
    
    # Mark everyone else in the same class/section absent
    present_students = [a.student_id for a in Attendance.query.filter_by(session_id=sess_id, status='present').all()]
    all_students_query = Student.query
    if sess.class_name:
        all_students_query = all_students_query.filter_by(class_name=sess.class_name)
    if sess.section:
        all_students_query = all_students_query.filter_by(section=sess.section)
        
    all_students = all_students_query.all()
    for student in all_students:
        if student.id not in present_students:
            existing = Attendance.query.filter_by(session_id=sess_id, student_id=student.id).first()
            if not existing:
                absent = Attendance(session_id=sess_id, student_id=student.id, status='absent')
                db.session.add(absent)
    
    db.session.commit()
    return jsonify({'success': True})

@api_bp.route('/attendance/absentees', methods=['GET'])
def get_absentees():
    date = request.args.get('date', datetime.now().strftime("%Y-%m-%d"))
    sessions = Session.query.filter_by(date=date).all()
    sess_ids = [s.id for s in sessions]
    
    absentees = Attendance.query.filter(Attendance.session_id.in_(sess_ids), Attendance.status == 'absent').all()
    absentee_list = []
    for a in absentees:
        s = Student.query.get(a.student_id)
        sess = Session.query.get(a.session_id)
        absentee_list.append({
            'reg': s.reg_no,
            'name': s.name,
            'subject': sess.subject,
            'time': sess.start_time.strftime("%I:%M %p"),
            'contact': s.phone,
            'email': s.email
        })
    return jsonify({'absentees': absentee_list})

@api_bp.route('/attendance/presentees', methods=['GET'])
def get_presentees():
    date = request.args.get('date', datetime.now().strftime("%Y-%m-%d"))
    sessions = Session.query.filter_by(date=date).all()
    sess_ids = [s.id for s in sessions]
    
    presentees = Attendance.query.filter(Attendance.session_id.in_(sess_ids), Attendance.status == 'present').all()
    presentee_list = []
    for p in presentees:
        s = Student.query.get(p.student_id)
        if not s: continue
        sess = Session.query.get(p.session_id)
        presentee_list.append({
            'reg': s.reg_no,
            'name': s.name,
            'subject': sess.subject,
            'time': sess.start_time.strftime("%I:%M %p"),
            'contact': s.phone,
            'email': s.email
        })
    return jsonify({'presentees': presentee_list})

@api_bp.route('/attendance/student', methods=['GET'])
def student_attendance():
    reg = request.args.get('reg')
    faculty_id = request.args.get('faculty_id')
    
    student = Student.query.filter_by(reg_no=reg).first()
    if not student:
        return jsonify({'total':0, 'present':0, 'absent':0, 'sessions':[]})
        
    sessions = Session.query.filter_by(faculty_id=faculty_id).all()
    sess_ids = [s.id for s in sessions]
    
    attendance = Attendance.query.filter(Attendance.student_id == student.id, Attendance.session_id.in_(sess_ids)).all()
    
    total = len(sessions)
    pres = len([a for a in attendance if a.status == 'present'])
    
    session_details = []
    for a in attendance:
        sess = Session.query.get(a.session_id)
        session_details.append({
            'date': sess.date,
            'time': sess.start_time.strftime("%I:%M %p"),
            'subject': sess.subject,
            'duration': f"{sess.duration_minutes} mins",
            'status': a.status
        })
        
    return jsonify({'total': total, 'present': pres, 'absent': total-pres, 'sessions': session_details})

# --- DASHBOARD & RECOGNITION ---
@api_bp.route('/faculty', methods=['GET'])
def get_faculty_list():
    faculties = Faculty.query.all()
    f_list = [{'id': f.id, 'name': f.name, 'subject': f.subject, 'dept': f.dept, 'avatar': f.avatar} for f in faculties]
    return jsonify({'faculty': f_list})

@api_bp.route('/reports', methods=['GET'])
def get_reports():
    subject = request.args.get('subject')
    query = Session.query
    if subject:
        query = query.filter(Session.subject.ilike(f"%{subject}%"))
        
    sessions = query.all()
    sess_ids = [s.id for s in sessions]
    
    students = Student.query.all()
    rows = []
    
    total_sessions = len(sessions)
    if total_sessions > 0:
        for s in students:
            # Count present for this student in these sessions
            present_count = Attendance.query.filter(
                Attendance.student_id == s.id,
                Attendance.session_id.in_(sess_ids),
                Attendance.status == 'present'
            ).count()
            
            percent = round((present_count / total_sessions) * 100)
            rows.append({
                'name': s.name,
                'reg': s.reg_no,
                'total': total_sessions,
                'present': present_count,
                'absent': total_sessions - present_count,
                'percent': percent
            })
            
    defaulters = len([r for r in rows if r['percent'] < 75])
    avg = sum([r['percent'] for r in rows]) / len(rows) if rows else 0

    return jsonify({
        'stats': {'total': len(students), 'avg_percent': round(avg), 'defaulters': defaulters, 'sessions': total_sessions},
        'rows': rows
    })

@api_bp.route('/recognition/identify', methods=['POST'])
def recognize():
    data = request.json
    image_b64 = data.get('image')
    
    if not image_b64:
        return jsonify({'recognized': False})
        
    try:
        # Decode base64
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # Needs to be RGB for face_recognition
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Find encodings in the webcam frame
        live_encodings = face_recognition.face_encodings(rgb_image)
        if not live_encodings:
            return jsonify({'recognized': False})
            
        live_encoding = live_encodings[0]
        
        # Compare with DB
        known_encodings, known_student_ids = get_known_encodings()
        
        if not known_encodings:
            return jsonify({'recognized': False})
            
        matches = face_recognition.compare_faces(known_encodings, live_encoding, tolerance=0.55)
        
        if True in matches:
            first_match_index = matches.index(True)
            matched_student_id = known_student_ids[first_match_index]
            student = Student.query.get(matched_student_id)
            return jsonify({
                'recognized': True,
                'name': student.name,
                'reg': student.reg_no,
                'confidence': 'High'
            })
    except Exception as e:
        print("Recognition error:", e)
        
    return jsonify({'recognized': False})

@api_bp.route('/attendance/sessions/summary', methods=['GET'])
def session_summary():
    faculty_id = request.args.get('faculty_id')
    # All 10 pre-defined subjects
    all_subjects = [
        'Mathematics', 'Computer Science', 'Physics', 'Chemistry',
        'Biology', 'English', 'History', 'Geography',
        'Economics', 'Business Studies'
    ]
    summary = []
    for subj in all_subjects:
        query = Session.query.filter_by(subject=subj)
        if faculty_id:
            query = query.filter_by(faculty_id=faculty_id)
        sessions = query.all()
        count = len(sessions)
        last_date = None
        if sessions:
            last_date = max(s.date for s in sessions)
        summary.append({
            'subject': subj,
            'sessions': count,
            'last_date': last_date
        })
    return jsonify({'summary': summary})

@api_bp.route('/auth/forgot-password/verify', methods=['POST'])
def forgot_pw_verify():
    return jsonify({'success': True})

@api_bp.route('/auth/forgot-password/reset', methods=['POST'])
def forgot_pw_reset():
    return jsonify({'success': True})

@api_bp.route('/auth/reset-password', methods=['POST'])
def reset_pw():
    return jsonify({'success': True})
