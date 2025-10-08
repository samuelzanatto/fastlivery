/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `supplier_clients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "supplier_clients_phone_key" ON "public"."supplier_clients"("phone");
