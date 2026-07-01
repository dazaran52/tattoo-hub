import os, dotenv
dotenv.load_dotenv()
from supabase import create_client

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
try:
    res = supabase.table('master_clients').select('id').or_('phone.eq."+420 728 715 574",email.eq."mail@mail.com"').execute()
    print(res)
except Exception as e:
    import traceback
    traceback.print_exc()
