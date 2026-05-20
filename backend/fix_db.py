import sqlite3
conn = sqlite3.connect('instance/smart_attendance.db')
conn.execute("UPDATE student SET name='Niranjan Kumar NV' WHERE id=7")
conn.commit()
print("Updated successfully")
