export type AppRole = "customer" | "admin" | "delivery";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "picked_up"
  | "cancelled";

export type OrderType = "delivery" | "pickup";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ProductOption = {
  id: string;
  product_id: string;
  name: string;
  price_modifier: number;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  rating: number;
  is_available: boolean;
  preparation_time: number;
  created_at: string;
  categories?: { name: string; slug: string } | null;
  product_sizes?: ProductOption[];
  product_flavors?: ProductOption[];
};

export type Order = {
  id: string;
  user_id: string | null;
  order_number: string;
  order_type: OrderType;
  delivery_person_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  delivery_address: string | null;
  pickup_time: string | null;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  size: string | null;
  flavor: string | null;
  customization: string | null;
  subtotal: number;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  created_at: string;
};
