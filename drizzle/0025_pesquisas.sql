CREATE TABLE `pesquisas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`atendimento_id` integer NOT NULL,
	`token` text NOT NULL,
	`nota` integer,
	`comentario` text,
	`respondida_em` integer,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pesquisas_token_unique` ON `pesquisas` (`token`);
