import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jexnghxfczewhjkdaxif.supabase.co";
const supabaseSecretKey = "sb_secret_TcRkJ2aKn1V_DSXZjBcWwA_wIhRAUSG";

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function checkPolicies() {
  console.log("Fetching database policies on 'orders' table...");
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'orders' });
  
  // Fallback: run a raw query on pg_policies
  if (error || !data) {
    const { data: pgData, error: pgError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'orders');
      
    if (pgError) {
      // If we don't have direct table access to pg_policies, let's try a direct SQL query via RPC if available, 
      // or we can select from pg_catalog.pg_policies using a general query.
      console.log("Trying custom SQL select from pg_policies...");
      const { data: sqlData, error: sqlError } = await supabase.from('pg_policies').select('*');
      if (sqlError) {
        console.error("Could not read policies directly. Error:", sqlError);
        return;
      }
      console.log("Policies:", sqlData);
      return;
    }
    console.log("Policies on 'orders':", pgData);
    return;
  }
  console.log("Policies on 'orders':", data);
}

// Let's try executing a custom query block
async function checkWithSQL() {
  // We can query pg_policies by calling pg_catalog view
  const { data, error } = await supabase.from('orders').select('id').limit(1); // just a check
  
  // Since we can't run arbitrary SQL queries without a custom RPC function, 
  // let's test if the RLS policy is blocking the rider by simulating the query *as* a delivery user!
  console.log("Simulating query as a delivery user...");
  // Let's find the delivery user's ID
  // In the orders list, we saw user 151793d5-7ca2-4100-ab79-2a1466613cd4 or 03d659dc-850c-4200-81f6-eace276f012b.
  // Let's check who the users are in user_roles:
  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
  if (rolesError) {
    console.error("Error reading user_roles:", rolesError);
  } else {
    console.log("Active user roles in database:", roles);
  }
}

checkWithSQL();
