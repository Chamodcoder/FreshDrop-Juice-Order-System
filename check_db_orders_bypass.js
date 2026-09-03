import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jexnghxfczewhjkdaxif.supabase.co";
// Bypassing RLS with the secret key to see the actual database contents
const supabaseSecretKey = "sb_secret_TcRkJ2aKn1V_DSXZjBcWwA_wIhRAUSG";

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function checkOrdersBypass() {
  console.log("Fetching all orders in the database (bypassing RLS)...");
  const { data, error } = await supabase.from('orders').select('id, order_number, order_type, status, delivery_person_id, user_id');
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  console.log("Total orders in database:", data.length);
  data.forEach(order => {
    console.log(`- Order: ${order.order_number} | Type: ${order.order_type} | Status: ${order.status} | User ID: ${order.user_id} | Rider ID: ${order.delivery_person_id}`);
  });
}

checkOrdersBypass();
