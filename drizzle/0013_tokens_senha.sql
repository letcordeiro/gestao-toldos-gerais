CREATE TABLE `tokens_senha` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expira_em` integer NOT NULL,
	`usado_em` integer,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_senha_token_hash_unique` ON `tokens_senha` (`token_hash`);
