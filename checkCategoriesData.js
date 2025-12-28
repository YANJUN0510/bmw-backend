const supabase = require('./src/config/supabase');

async function checkCategories() {
  const { data, error } = await supabase
    .from('building_material_category')
    .select('*');
  
  if (error) {
    console.error(error);
  } else {
    console.log('Categories:', data);
  }
}

checkCategories();
