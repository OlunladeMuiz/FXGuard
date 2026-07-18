# FXGuard Backend - Setup Guide

This guide provides step-by-step instructions for setting up the FXGuard Backend project on your local machine and managing code changes through Git.

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/OlunladeMuiz/FXGuard
cd FXGuard/Backend
```

### 2. Create and Activate Virtual Environment

Use Python 3.14 in this workspace. The existing virtual environment here was created with Python 3.14, and the backend now starts locally on that runtime.

#### For Windows (PowerShell):
```powershell
# Create virtual environment
python -3.14 -m venv .venv

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

Install the dependencies listed in [Backend/requirements.txt](Backend/requirements.txt):

Install all dependencies:

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
For local development, the backend now starts without a manual `.env` file. If you want to override defaults, create a `.env` file in the project root with the following variables:

```env
# Database connection
DATABASE_URL=sqlite:///./test.db

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

If you are starting locally in this workspace, the backend is designed to run without manually setting `SECRET_KEY` or `DATABASE_URL`. `SECRET_KEY` is generated for the process when missing, and `DATABASE_URL` falls back to SQLite.

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