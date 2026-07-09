ALTER TABLE `orcamentos` ADD `public_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orcamentos_public_token_unique` ON `orcamentos` (`public_token`);