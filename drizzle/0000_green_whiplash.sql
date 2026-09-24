CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_code` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`sales_channel` text DEFAULT 'Facebook' NOT NULL,
	`payment_method` text DEFAULT 'Chuyển khoản' NOT NULL,
	`status` text DEFAULT 'Chưa thanh toán' NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`shipping_fee` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`debt` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_code_unique` ON `orders` (`order_code`);--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);