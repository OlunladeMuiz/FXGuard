# Contributing to FXGuard Backend

Thank you for your interest in contributing to FXGuard Backend! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Read** the [SETUP.md](SETUP.md) file for initial setup instructions
2. **Fork** the repository (if not a team member)
3. **Clone** your fork or the main repo
4. **Create** a new branch for your work

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/brief-feature-description

# Examples:
# feature/add-invoice-export
# feature/improve-auth-validation
# fix/correct-otp-expiration-bug
```

### 2. Make Your Changes

- Write clean, readable code
- Follow PEP 8 style guidelines
- Add comments for complex logic
- Update relevant models, services, and schemas

### 3. Test Your Changes

```bash
# Manual testing
uvicorn app.main:app --reload

# Test with Swagger UI: http://localhost:8000/docs
```

### 4. Commit and Push

```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat(auth): add OTP expiration validation"

# Push to your branch
git push origin feature/your-feature-name
```

### 5. Create a Pull Request

- Go to GitHub and create a PR from your branch to `main`
- Fill in the PR template with:
  - What changed
  - Why it changed
  - How to test it
  - Any breaking changes

## Code Style Guidelines

### Python Code
- Follow PEP 8
- Use type hints
- Keep functions small and focused
- Use meaningful variable names

### Commit Messages
Format: `type(scope): description`

Examples:
```
feat(auth): add OTP expiration validation
fix(invoice): correct currency conversion
docs(readme): update setup instructions
refactor(email): improve template rendering
test(auth): add OTP verification tests
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build, dependencies, etc.

### Code Standards

```python
# ✅ Good
def register_user(db: Session, payload: RegisterRequest) -> User:
    """Register a new user with email and password validation."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return user

# ❌ Avoid
def register_user(db, payload):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return user
```

## Making Database Changes

If you modify any SQLAlchemy models:

1. Update the model in `app/models/`
2. Create a migration:
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```
3. Review the generated migration file
4. Update the migration version if needed
5. Document the migration in your PR

## Testing

- Test all new features manually
- Use the Swagger UI at `http://localhost:8000/docs`
- Document test cases in your PR description

## Handling Conflicts

If you have merge conflicts when pulling:

```bash
# Option 1: Merge
git pull origin main
# Resolve conflicts in your editor
git add .
git commit -m "Resolve merge conflicts"
git push origin your-branch

# Option 2: Rebase
git rebase origin/main
# Resolve conflicts
git add .
git rebase --continue
```

## Code Review Checklist

Before submitting a PR, ensure:
- [ ] Code follows style guidelines
- [ ] Commit messages are descriptive
- [ ] No hardcoded values or credentials
- [ ] Database models are properly updated
- [ ] API endpoints are documented
- [ ] Sensitive data is in `.env` (not committed)
- [ ] `requirements.txt` is updated if dependencies changed

## Common Issues

### Issue: Can't push to main
**Solution**: Always work on a feature branch, not main

### Issue: Merge conflicts in migrations
**Solution**: Create a new migration or manually resolve the conflict

### Issue: .env file committed
**Solution**: Use `git rm --cached .env` and add to `.gitignore`

## Questions?

- Check the [SETUP.md](SETUP.md) troubleshooting section
- Review existing GitHub Issues
- Contact the team

---

**Thank you for contributing!** 🎉
