import os
import sys
import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from Backend.app.db.database import SessionLocal
from Backend.app.models.invoice import Invoice
from Backend.app.models.fx_rate_snapshot import FXRateSnapshot
from Backend.app.models.auth import User

# --- Environment Guards ---
if os.getenv("ALLOW_SYNTHETIC_DATA", "false").strip().lower() != "true":
    print("ERROR: Refusing to seed. ALLOW_SYNTHETIC_DATA is not set to 'true'.")
    sys.exit(1)

# Ensure this is explicitly run in a development environment
if os.getenv("ENVIRONMENT", "production").strip().lower() != "development":
    print("ERROR: Refusing to seed. ENVIRONMENT must be explicitly set to 'development'.")
    sys.exit(1)


def seed_fx_rates(db: Session, now: datetime):
    """Seed synthetic FX rates relative to today."""
    print("Seeding FX Rate Snapshots...")
    
    # We use source names that spread_service expects when ALLOW_SYNTHETIC_DATA is true
    official_source = "synthetic_official"
    parallel_source = "synthetic_parallel"
    
    # Generate daily rates for the last 30 days
    base_official_rate = 1400.0
    base_parallel_rate = 1600.0
    
    records = []
    for days_ago in range(30, -1, -1):
        target_date = now - timedelta(days=days_ago)
        
        # Add some random variance
        off_rate = base_official_rate + random.uniform(-10, 10)
        par_rate = base_parallel_rate + random.uniform(-15, 15)
        
        # Official Rate
        records.append(FXRateSnapshot(
            id=str(uuid.uuid4()),
            base_currency="USD",
            quote_currency="NGN",
            rate=off_rate,
            source=official_source,
            rate_type="official",
            recorded_at=target_date,
            created_at=target_date,
            is_stale=False
        ))
        
        # Parallel Rate
        records.append(FXRateSnapshot(
            id=str(uuid.uuid4()),
            base_currency="USD",
            quote_currency="NGN",
            rate=par_rate,
            source=parallel_source,
            rate_type="parallel",
            recorded_at=target_date,
            created_at=target_date,
            is_stale=False
        ))

    db.bulk_save_objects(records)
    print(f"  -> Inserted {len(records)} FX rate snapshots.")


def seed_invoices(db: Session, now: datetime):
    """Seed synthetic invoices relative to today."""
    print("Seeding Invoices...")
    
    # Check if we have at least one user to assign invoices to
    user = db.query(User).first()
    user_id = user.id if user else str(uuid.uuid4())
    
    offsets = [0, 1, 3, 7, 14, 30] # days ago
    
    records = []
    for days_ago in offsets:
        target_date = now - timedelta(days=days_ago)
        due_date = target_date + timedelta(days=30)
        
        amount = round(random.uniform(1000.0, 50000.0), 2)
        
        records.append(Invoice(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            currency="USD",
            status="PENDING",
            due_date=due_date,
            created_at=target_date,
            updated_at=target_date,
            is_seeded=True  # Explicitly flagging as synthetic
        ))

    db.bulk_save_objects(records)
    print(f"  -> Inserted {len(records)} seeded invoices.")


def main():
    print("Starting synthetic data generation...")
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    
    try:
        # Clear existing seeded data first to be idempotent
        print("Cleaning up old synthetic data...")
        deleted_fx = db.query(FXRateSnapshot).filter(
            FXRateSnapshot.source.in_(["synthetic_official", "synthetic_parallel", "synthetic_bdc"])
        ).delete()
        
        deleted_inv = db.query(Invoice).filter(Invoice.is_seeded == True).delete()
        print(f"  -> Deleted {deleted_fx} FX rates and {deleted_inv} invoices.")
        
        seed_fx_rates(db, now)
        seed_invoices(db, now)
        
        db.commit()
        print("Done! Seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
