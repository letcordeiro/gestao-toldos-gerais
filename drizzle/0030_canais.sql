CREATE TABLE `canais` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`no_cadastro_publico` integer DEFAULT true NOT NULL,
	`ativo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE `atendimentos` ADD `canal_id` integer;
