#!/usr/bin/env python3
"""
Password reset utility for OnionTravel

Usage:
    python reset_password.py <email> <new_password>

Example:
    python reset_password.py agata@guc.net.pl MyNewPassword123
"""

import sys
import sqlite3
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.utils.security import get_password_hash


def reset_password(email: str, new_password: str) -> bool:
    """Reset password for a user"""
    try:
        # Hash the new password
        hashed_password = get_password_hash(new_password)

        # Connect to database
        db_path = Path(__file__).parent / "oniontravel.db"
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT id, username FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        if not user:
            print(f"❌ Error: User with email '{email}' not found")
            conn.close()
            return False

        user_id, username = user

        # Update password
        cursor.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (hashed_password, email)
        )
        conn.commit()
        conn.close()

        print(f"✅ Password successfully reset!")
        print(f"   Email: {email}")
        print(f"   Username: {username}")
        print(f"   New password: {new_password}")
        print(f"\n⚠️  Remember to keep your password secure!")

        return True

    except Exception as e:
        print(f"❌ Error resetting password: {e}")
        return False


def main():
    if len(sys.argv) != 3:
        print("Usage: python reset_password.py <email> <new_password>")
        print("\nExample:")
        print("  python reset_password.py agata@guc.net.pl MyNewPassword123")
        sys.exit(1)

    email = sys.argv[1]
    new_password = sys.argv[2]

    # Validate password length
    if len(new_password) < 8:
        print("❌ Error: Password must be at least 8 characters long")
        sys.exit(1)

    print(f"\n🔐 Resetting password for: {email}\n")

    success = reset_password(email, new_password)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
