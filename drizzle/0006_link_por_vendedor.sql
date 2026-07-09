ALTER TABLE `vendedores` ADD `link_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `vendedores_link_token_unique` ON `vendedores` (`link_token`);