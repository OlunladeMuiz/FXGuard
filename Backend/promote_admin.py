import sys
from app.db.database import SessionLocal
from app.models.auth import User

def promote_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: No user found with email {email}")
            return
        
        if user.is_admin:
            print(f"User {email} is already an admin.")
            return

        user.is_admin = True
        db.commit()
        print(f"Success: {email} has been elevated to Admin status.")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <user_email>")
    else:
        promote_user(sys.argv[1])
