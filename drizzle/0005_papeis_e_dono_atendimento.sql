ALTER TABLE `atendimentos` ADD `vendedor_id` integer;--> statement-breakpoint
ALTER TABLE `vendedores` ADD `papel` text DEFAULT 'vendedor' NOT NULL;