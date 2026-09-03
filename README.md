# FreshDrop Juice Order System

FreshDrop is a premium, real-time juice ordering and delivery system tailored for university campus environments. Designed with high-performance frameworks and clean UI transitions, it bridges the gap between campus juice counters, delivery riders, and students/staff.

---

## 🚀 Key Features

* **Interactive Location Mapping**: Includes a Leaflet-based campus map picker during checkout. Students can select their delivery coordinates or search for campus building landmarks (e.g. Hostels, Faculties) with automatic OpenStreetMap Nominatim geocoding and city/raw fallbacks.
* **Real-time Synchronization**: Powered by Supabase Postgres Realtime replication. The Admin Orders board and Overview Dashboards update instantly as customers place, update, or claim orders.
* **Multi-Role Flow**: Full lifecycle support for three user roles:
  * **Customer**: Browses catalog, places pickup/delivery orders, and tracks progress with live status updates.
  * **Admin Staff**: Oversees sales reports, catalog availability, and prepares/dispatches pending orders.
  * **Delivery Rider**: Interactive queue to claim ready orders, view the delivery address pinned on a mini-map, and complete runs.

---

## 🛠️ Tech Stack

* **Frontend**: React, TanStack Start (SSR), TanStack Router & Query, Leaflet Maps
* **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime channels)
* **Styling**: Tailwind CSS & Material symbols

---

## 💻 Local Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd juice-order-system
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-anon-publishable-key"
```
> [!IMPORTANT]
> Always use your project's **Anon/Publishable Key** in the browser. Using the `service_role` or `secret` key directly in client-side code will expose admin credentials to public users and trigger Auth rate-limits/violations.

### 3. Run Development Server
```bash
npm run dev
```
The application will run locally at **`http://localhost:8080`**.

---

## 🗄️ Database Configuration & Security (Supabase)

To make the multi-role system work, you must apply the following SQL configurations inside your **Supabase SQL Editor**:

### 1. Update Row Level Security (RLS) Policies
By default, standard templates restrict users from reading/updating rows that aren't owned by them. We must update the `orders` table policies to allow **delivery riders** to view and claim unclaimed orders:

```sql
-- A. Fix SELECT Policy (Allows riders to view "Ready" unclaimed deliveries)
DROP POLICY IF EXISTS "read own orders" ON public.orders;

CREATE POLICY "read own orders" ON public.orders FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    OR (
      public.has_role(auth.uid(), 'delivery') 
      AND (
        delivery_person_id = auth.uid() 
        OR (order_type = 'delivery' AND status = 'ready' AND delivery_person_id IS NULL)
      )
    )
  );

-- B. Fix UPDATE Policy (Allows riders to claim and start deliveries)
DROP POLICY IF EXISTS "update own orders" ON public.orders;

CREATE POLICY "update own orders" ON public.orders FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    OR (
      public.has_role(auth.uid(), 'delivery') 
      AND (
        delivery_person_id = auth.uid() 
        OR (order_type = 'delivery' AND status = 'ready' AND delivery_person_id IS NULL)
      )
    )
  );
```

### 2. Promoting Accounts to Admin / Rider Roles
New users default to the `'customer'` role. Run this SQL to promote your registered email address to **Admin** or **Delivery Rider**:

* **Promote to Admin:**
  ```sql
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'your-email@gmail.com' LIMIT 1),
    'admin'
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  ```

* **Promote to Delivery Rider:**
  ```sql
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'your-email@gmail.com' LIMIT 1),
    'delivery'
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  ```

---

## 🔄 End-to-End Testing Flow

Follow these steps to test the entire lifecycle:

1. **Place Order**: Log in as a customer, select a juice, and checkout choosing **Delivery**. Toggle the map open, type in your hostel or building (e.g., `Hostel Block C`), select the pin location, and place the order.
2. **Prepare & Ready**: Log in as an **Admin** and open `/admin/orders`. The new order will show up immediately. Click **Confirm** ➜ **Prepare** ➜ **Mark Ready**.
3. **Claim & Route**: Log in as a **Rider** and open `/delivery`. The ready order instantly pops up in the Active deliveries list. Click **View destination on map** to review the customer's pinned coordinates, then click **Start delivery**.
4. **Complete Run**: Click **Mark delivered** upon arrival. The order will move to the Completed list, and the customer's order tracking screen will update to "Delivered".
