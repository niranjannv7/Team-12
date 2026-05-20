from app import create_app
from extensions import db
from models import Faculty

def add_user():
    app = create_app()
    with app.app_context():
        # Check if user already exists
        user = Faculty.query.filter_by(name='Niranjan Kumar NV').first()
        if not user:
            new_user = Faculty(
                id='FAC_USER_1',
                name='Niranjan Kumar NV',
                dept='CSE',
                subject='Management',
                email='niranjan@college.edu',
                password_hash='NV7102005',
                avatar='NN'
            )
            db.session.add(new_user)
            db.session.commit()
            print("User 'Niranjan Kumar NV' added successfully!")
        else:
            # Update password if it was different
            user.password_hash = 'NV7102005'
            db.session.commit()
            print("User updated with new password.")

if __name__ == "__main__":
    add_user()
