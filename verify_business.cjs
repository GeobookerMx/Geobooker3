require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusiness() {
    const id = '6b7785b2-b5eb-4eb3-8f7c-cc12a54d9d22';
    console.log(`Checking business with ID: ${id}`);

    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching business:', error);
    } else if (!data) {
        console.log('Business NOT found.');
    } else {
        console.log('Business FOUND:', data);
        console.log('Status:', data.status);
        console.log('Is Claimed:', data.is_claimed);
    }
}

checkBusiness();
