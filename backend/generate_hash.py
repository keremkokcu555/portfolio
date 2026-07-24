import sys
from werkzeug.security import generate_password_hash

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_hash.py <your_password>")
        sys.exit(1)
    
    password = sys.argv[1]
    hashed = generate_password_hash(password)
    print("Your password hash:")
    print(hashed)
