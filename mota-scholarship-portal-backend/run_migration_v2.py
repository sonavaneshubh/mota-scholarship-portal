import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
PROJECT_REF = 'mciwgsdthqjaadtzuthq'

async def run_migration():
    # Read the migration file
    with open('supabase/migrations/20260927000000_create_scholarship_master_tables.sql', 'r') as f:
        sql = f.read()
    
    # Split into statements
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    headers = {
        'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}',
        'Content-Type': 'application/json',
    }
    
    # Try the Supabase Management API - database/query endpoint
    # This endpoint allows running SQL queries
    mgmt_url = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for i, stmt in enumerate(statements):
            if not stmt.strip():
                continue
            
            try:
                response = await client.post(
                    f'https://api.supabase.com/v1/projects/mciwgsdthqjaadtzuthq/database/query',
                    headers={
                        'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}',
                        'Content-Type': 'application/json',
                    },
                    json={'query': stmt},
                    timeout=60.0
                )
                
                if response.status_code in (200, 201):
                    print(f'Statement {i+1}/{len(statements)} executed successfully')
                else:
                    print(f'Statement {i+1} failed: {response.status_code} - {response.text[:200]}')
                    
            except Exception as e:
                print(f'Error in statement {i+1}: {e}')
                print(f'Statement: {stmt[:100]}...')

if __name__ == '__main__':
    import os
    import asyncio
    import httpx
    from dotenv import load_dotenv
    
    load_dotenv()
    asyncio.run(run_migration())