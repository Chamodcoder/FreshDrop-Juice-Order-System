-- ROLES
CREATE TYPE public.app_role AS ENUM ('customer','admin','delivery');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','preparing','ready','out_for_delivery','delivered','picked_up','cancelled');
CREATE TYPE public.order_type AS ENUM ('delivery','pickup');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATALOG
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "admin write categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  is_available BOOLEAN NOT NULL DEFAULT true,
  preparation_time INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "admin write products" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_sizes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sizes" ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY "admin write sizes" ON public.product_sizes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.product_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_flavors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_flavors TO authenticated;
GRANT ALL ON public.product_flavors TO service_role;
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read flavors" ON public.product_flavors FOR SELECT USING (true);
CREATE POLICY "admin write flavors" ON public.product_flavors FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ADDRESSES
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Belihuloya',
  phone TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1240;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE DEFAULT ('FD-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  order_type public.order_type NOT NULL DEFAULT 'delivery',
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  delivery_person_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  delivery_address TEXT,
  pickup_time TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "read own orders" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR (public.has_role(auth.uid(),'delivery') AND delivery_person_id = auth.uid()));
CREATE POLICY "create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(),'delivery') AND delivery_person_id = auth.uid()))
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(),'delivery') AND delivery_person_id = auth.uid()));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  image_url TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  size TEXT,
  flavor TEXT,
  customization TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin() OR (public.has_role(auth.uid(),'delivery') AND o.delivery_person_id = auth.uid())))
);
CREATE POLICY "insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read status history" ON public.order_status_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin() OR (public.has_role(auth.uid(),'delivery') AND o.delivery_person_id = auth.uid())))
);
CREATE POLICY "insert status history" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() OR public.has_role(auth.uid(),'delivery') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.log_order_status() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by) VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_status_log AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_status();

-- COUPONS
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active coupons" ON public.coupons FOR SELECT USING (is_active);
CREATE POLICY "admin write coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- REALTIME
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;

-- SEED
INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
 ('Fresh Juices','fresh-juices','Pressed to order, nothing added','local_drink',1),
 ('Fruit Juices','fruit-juices','Seasonal tropical fruit blends','nutrition',2),
 ('Smoothies','smoothies','Thick, creamy and filling','blender',3),
 ('Milkshakes','milkshakes','Chilled milk based treats','icecream',4),
 ('Specials','specials','Campus favourites of the week','star',5);

INSERT INTO public.products (category_id, name, description, base_price, image_url, rating, preparation_time) VALUES
 ((SELECT id FROM public.categories WHERE slug='fruit-juices'),'Mango Blast','Ripe Sri Lankan mangoes blended with a squeeze of lime.',300,'/images/mango-blast.jpg',4.8,8),
 ((SELECT id FROM public.categories WHERE slug='fresh-juices'),'Watermelon Fresh','Chilled watermelon pressed with mint. Pure hydration.',250,'/images/watermelon-fresh.jpg',4.6,6),
 ((SELECT id FROM public.categories WHERE slug='fruit-juices'),'Pineapple Punch','Tangy pineapple with a pinch of pink salt.',280,'/images/pineapple-punch.jpg',4.5,7),
 ((SELECT id FROM public.categories WHERE slug='specials'),'Mixed Fruit','Five fruits in one glass — our best seller.',350,'/images/mixed-fruit.jpg',4.9,10),
 ((SELECT id FROM public.categories WHERE slug='fresh-juices'),'Papaya Delight','Smooth papaya with lime, light and refreshing.',260,'/images/papaya-delight.jpg',4.4,7),
 ((SELECT id FROM public.categories WHERE slug='smoothies'),'Avocado Cream','Creamy avocado with milk and a touch of honey.',380,'/images/avocado-cream.jpg',4.7,10),
 ((SELECT id FROM public.categories WHERE slug='smoothies'),'Strawberry Smoothie','Strawberries blended with yoghurt and ice.',390,'/images/strawberry-smoothie.jpg',4.8,9),
 ((SELECT id FROM public.categories WHERE slug='milkshakes'),'Banana Milkshake','Thick banana shake topped with cinnamon.',320,'/images/banana-milkshake.jpg',4.5,8);

INSERT INTO public.product_sizes (product_id, name, price_modifier, sort_order)
SELECT id, s.name, s.m, s.o FROM public.products, (VALUES ('Small',-50,1),('Medium',0,2),('Large',80,3)) AS s(name,m,o);

INSERT INTO public.product_flavors (product_id, name, price_modifier, sort_order)
SELECT id, f.name, f.m, f.o FROM public.products, (VALUES ('Original',0,1),('Sweet',0,2),('Less Sweet',0,3),('No Sugar',0,4)) AS f(name,m,o);

INSERT INTO public.coupons (code, discount_type, discount_value, minimum_order, expiry_date) VALUES
 ('FRESH10','percent',10,500,'2027-12-31'),
 ('CAMPUS50','fixed',50,600,'2027-12-31');

-- Demo orders for admin dashboard (no customer account attached)
INSERT INTO public.orders (order_type, contact_name, contact_phone, delivery_address, subtotal, delivery_fee, total, status, created_at) VALUES
 ('delivery','Nuwan Perera','0771234567','Hostel Block C, Sabaragamuwa University',600,60,660,'pending', now() - interval '20 minutes'),
 ('pickup','Sanduni Silva','0712345678',NULL,350,0,350,'confirmed', now() - interval '45 minutes'),
 ('delivery','Kasun Fernando','0759876543','Faculty of Applied Sciences',700,60,760,'preparing', now() - interval '1 hour'),
 ('pickup','Ishara Jayasuriya','0763456789',NULL,280,0,280,'ready', now() - interval '2 hours'),
 ('delivery','Tharindu Bandara','0778887766','Girls Hostel A, Belihuloya',900,60,960,'out_for_delivery', now() - interval '3 hours'),
 ('delivery','Amaya Wickrama','0701122334','Lecture Hall Complex',540,60,600,'delivered', now() - interval '1 day'),
 ('pickup','Ruwan Dissanayake','0724455667',NULL,320,0,320,'delivered', now() - interval '2 days'),
 ('delivery','Hasini Gamage','0715566778','Staff Quarters',650,60,710,'cancelled', now() - interval '3 days');

INSERT INTO public.order_items (order_id, product_id, product_name, image_url, quantity, unit_price, size, flavor, subtotal)
SELECT o.id, p.id, p.name, p.image_url, 2, p.base_price, 'Medium', 'Original', p.base_price * 2
FROM public.orders o JOIN public.products p ON p.name = 'Mango Blast' WHERE o.user_id IS NULL;