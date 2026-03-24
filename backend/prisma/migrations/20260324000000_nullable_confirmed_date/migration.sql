-- Make confirmed_date nullable in sales_raw_data
ALTER TABLE "sales_raw_data" ALTER COLUMN "confirmed_date" DROP NOT NULL;

-- Make order_date nullable in sales_raw_data
ALTER TABLE "sales_raw_data" ALTER COLUMN "order_date" DROP NOT NULL;
