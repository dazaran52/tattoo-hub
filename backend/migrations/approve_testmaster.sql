UPDATE users 
SET status = 'approved', is_verified_master = true 
WHERE email = 'testmaster@test.com';
