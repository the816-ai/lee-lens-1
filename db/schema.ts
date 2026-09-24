import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderCode: text("order_code").notNull().unique(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  salesChannel: text("sales_channel").notNull().default("Facebook"),
  paymentMethod: text("payment_method").notNull().default("Chuyển khoản"),
  status: text("status").notNull().default("Chưa thanh toán"),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  shippingFee: integer("shipping_fee").notNull().default(0),
  total: integer("total").notNull(),
  paid: integer("paid").notNull().default(0),
  debt: integer("debt").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_orders_created_at").on(table.createdAt), index("idx_orders_status").on(table.status)]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  product: text("product").notNull(),
  detail: text("detail").notNull().default(""),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  discount: integer("discount").notNull().default(0),
  lineTotal: integer("line_total").notNull(),
}, (table) => [index("idx_order_items_order_id").on(table.orderId)]);
