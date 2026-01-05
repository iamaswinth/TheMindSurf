"""
Quick Database Schema Setup Script

Run this after setting up your NeonDB connection to manually verify tables.
This is optional - tables are auto-created on backend startup.

Usage:
    python setup_database.py
"""

import asyncio
import asyncpg
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.db.schema import INIT_SCHEMA


async def setup_database():
    """Initialize database schema."""
    
    if not settings.DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not set in environment variables")
        print("   Please set it in your .env file")
        return False
    
    print("🔗 Connecting to NeonDB...")
    print(f"   URL: {settings.DATABASE_URL[:50]}...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(settings.DATABASE_URL)
        
        print("✅ Connected successfully!")
        print("\n📋 Creating tables...")
        
        # Execute each schema statement
        for i, statement in enumerate(INIT_SCHEMA, 1):
            try:
                await conn.execute(statement)
                print(f"   ✓ Statement {i}/{len(INIT_SCHEMA)} executed")
            except Exception as e:
                print(f"   ⚠️  Statement {i} warning: {e}")
        
        print("\n✅ Database schema initialized!")
        
        # Verify tables
        print("\n🔍 Verifying tables...")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"\n📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"   • {table['table_name']}")
        
        # Close connection
        await conn.close()
        
        print("\n✅ Setup complete! You can now start the backend.")
        return True
        
    except asyncpg.PostgresConnectionError as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check DATABASE_URL format: postgresql://user:pass@host/db?sslmode=require")
        print("   2. Verify NeonDB project is active")
        print("   3. Check firewall/network settings")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 70)
    print("RAG Comparator - Database Setup")
    print("=" * 70)
    print()
    
    success = asyncio.run(setup_database())
    
    print()
    print("=" * 70)
    
    if success:
        print("Next steps:")
        print("  1. Start backend: python main.py")
        print("  2. Upload a test document")
        print("  3. Check NeonDB for data")
    else:
        print("Setup failed. Please check errors above.")
    
    sys.exit(0 if success else 1)
