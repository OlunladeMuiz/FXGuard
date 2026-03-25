# FXGuard Backend - Setup Guide

This guide provides step-by-step instructions for setting up the FXGuard Backend project on your local machine and managing code changes through Git.

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/OlunladeMuiz/FXGuard
cd FXGuard/backend
```

### 2. Create and Activate Virtual Environment

#### For Windows (PowerShell):
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1
```

#### For macOS/Linux:
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate
```

## Configure Environment Variables

Generate a secure secret key before filling in the .env file:
python -c "import secrets; print(secrets.token_hex(32))"
Copy the output and use it as your SECRET_KEY value.

DATABASE_URL=postgresql://username:password@host:5432/dbname?sslmode=require

### 3. Install Dependencies

First, create a `requirements.txt` file in the project root if it doesn't exist:

```txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
python-dotenv==1.0.0
bcrypt==4.1.1
PyJWT==2.8.1
pydantic==2.5.0
pydantic-settings==2.1.0
psycopg2-binary==2.9.9
alembic==1.12.1
```

Install all dependencies:

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Generate a secure secret key before filling in the .env file:
python -c "import secrets; print(secrets.token_hex(32))"
Copy the output and use it as your SECRET_KEY value.

Create a `.env` file in the project root with the following variables:

```env
# Database connection
DATABASE_URL=postgresql://username:password@host:port/dbname?sslmode=require

# Email service
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

```

**Important**: Never commit `.env` to version control. Add it to `.gitignore`.

## Running the Application

### Start Development Server

```bash
# Activate virtual environment first
# Windows: .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate

# Run with uvicorn
uvicorn app.main:app --reload

# Or specify a specific host and port
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at: `http://localhost:8000`

### View API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Available Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/resend-otp` - Resend OTP
- `POST /auth/login` - User login
- `GET /invoices` - Get all invoices
- `POST /invoices` - Create new invoice
- `GET /invoices/{id}` - Get invoice by ID
- `PUT /invoices/{id}` - Update invoice
- `DELETE /invoices/{id}` - Delete invoice

---