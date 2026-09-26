import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

async def run_migration():
    # Read the migration file
    with open('supabase/migrations/20260927000000_create_scholarship_master_tables.sql', 'r') as f:
        sql = f.read()
    
    # Split into statements
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    
    base_url = 'https://mciwgsdthqjaadtzuthq.supabase.co'
    
    async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
        for i, stmt in enumerate(statements):
            if not stmt.strip():
                continue
            
            try:
                # Try to execute via PostgREST RPC if available
                # Try the pg_execute RPC endpoint
                response = await client.post(
                    'https://mciwgsdthqjaadtzuthq.supabase.co/rest/v1/rpc/pg_execute',
                    headers={
                        'apikey': os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
                        'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}',
                        'Content-Type': 'application/json',
                    },
                    json={'query': stmt},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    print(f'Statement {i+1}/{len(statements)} executed successfully')
                else:
                    print(f'Statement {i+1} failed: {response.status_code} - {response.text[:200]}')
                    
            except Exception as e:
                print(f'Error in statement {i+1}: {e}')
                print(f'Statement: {stmt[:100]}...')

if __name__ == '__main__':
    asyncio.run(run_migration())