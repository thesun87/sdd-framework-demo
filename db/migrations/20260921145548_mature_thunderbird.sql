CREATE INDEX "product_category_id_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_name_normalized_idx" ON "product" USING btree ("name_normalized");