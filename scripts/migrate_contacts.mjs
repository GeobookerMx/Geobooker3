import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase Service Role Key or URL in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Starting migration from crm_contacts to marketing_contacts...");
    
    const PAGE_SIZE = 1000;
    let offset = 0;
    let totalMigrated = 0;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching from offset ${offset}...`);
        const { data, error } = await supabase
            .from('crm_contacts')
            .select('*')
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error("Fetch Error:", error.message);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`Processing ${data.length} records...`);

        // Map to new schema
        const mappedData = data.map(c => {
            // Validar correo
            const email = (c.email || '').trim().toLowerCase();
            return {
                company_name: c.company || '',
                contact_name: c.name || '',
                contact_title: c.position || '',
                email: email && email.includes('@') ? email : null,
                phone: c.phone || '',
                website: c.website || '',
                address: c.neighborhood || '',
                city: c.city || '',
                state: c.state || '',
                tier: normalizeTier(c.tier),
                source: c.source_file || 'Migracion CSV',
                notes: c.notes || '',
                industry: c.company_type || '',
                country: 'México'
            };
        }).filter(c => c.email !== null); // Solo importar con correos válidos para marketing


        if (mappedData.length > 0) {
            // Upsert based on email
            const { error: upsertError } = await supabase
                .from('marketing_contacts')
                .upsert(mappedData, { onConflict: 'email' });
            
            if (upsertError) {
                console.error("Upsert Error:", upsertError.message);
                // Si falla por chunk demasiado grande (payload limits), iteramos de 100 en 100
                console.log("Retrying in smaller chunks of 100...");
                for(let i=0; i<mappedData.length; i+=100) {
                    const chunk = mappedData.slice(i, i+100);
                    const { error: retryError } = await supabase
                        .from('marketing_contacts')
                        .upsert(chunk, { onConflict: 'email' });
                    if (retryError) console.error("Chunk Error:", retryError.message);
                    else totalMigrated += chunk.length;
                }
            } else {
                totalMigrated += mappedData.length;
                console.log(`Successfully upserted ${mappedData.length} records.`);
            }
        }

        offset += PAGE_SIZE;
        
        // Anti-rate-limit delay
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`Migration Complete. Total migrated valid emails: ${totalMigrated}`);
}

function normalizeTier(value) {
    if (!value) return 'B';
    const v = String(value).toUpperCase().trim();
    if (v === 'AAA' || v === '3') return 'AAA';
    if (v === 'AA' || v === '2') return 'AA';
    if (v === 'A' || v === '1') return 'A';
    return v || 'B';
}

migrate().catch(console.error);
