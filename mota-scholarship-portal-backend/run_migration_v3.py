import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

async def run_migration():
    supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    with open('supabase/migrations/20260927000000_create_scholarship_master_tables.sql', 'r') as f:
        sql = f.read()
    
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    print(f"Attempting to create temporary function to execute SQL...")
    
    # First, try to create a temporary function that can execute dynamic SQL
    create_func_sql = """
    CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
    BEGIN
        EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """
    
    try:
        result = supabase.rpc('pg_execute', {'query': create_func_sql}).execute()
        print("Created exec_sql function:", result)
    except Exception as e:
        print(f"Could not create exec_sql function: {e}")
    
    # Try to use the function
    with open('supabase/migrations/20260927000000_create_scholarship_master_tables.sql', 'r') as f:
        sql = f.read()
    
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    for i, stmt in enumerate(statements):
        if not stmt.strip():
            continue
        
        try:
            result = supabase.rpc('exec_sql', {'sql': stmt}).execute()
            print(f'Statement {i+1}/{len(statements)} executed successfully')
        except Exception as e:
            print(f'Statement {i+1} failed: {e}')
            print(f'Statement: {stmt[:100]}...')

if __name__ == '__main__':
    import asyncio
    asyncio.run(run_migration())