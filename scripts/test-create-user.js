const supabase = require('../src/config/supabase');

async function testCreateUser() {
  const user = {
    email: `test.user.${Date.now()}@example.com`,
    phone: `04${Math.floor(Math.random() * 100000000)}`, // Random phone number
    password: 'password123', // In a real app, this should be hashed
    address: '123 Test St, Test City',
    birthday: '1990-01-01'
  };

  console.log('Attempting to create user:', user);

  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select();

  if (error) {
    console.error('Error creating user:', error);
  } else {
    console.log('User created successfully:', data);
  }
}

testCreateUser();
