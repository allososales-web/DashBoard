-- AlterTable
ALTER TABLE "store_auth" ADD COLUMN     "is_first_login" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pin_changed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "hq_auth" (
    "id" UUID NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "is_first_login" BOOLEAN NOT NULL DEFAULT true,
    "pin_changed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hq_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_records" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "total_hours" DECIMAL(4,2),
    "is_off" BOOLEAN NOT NULL DEFAULT false,
    "off_reason" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_records_store_id_year_month_idx" ON "work_records"("store_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "work_records_store_id_staff_id_work_date_key" ON "work_records"("store_id", "staff_id", "work_date");

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
