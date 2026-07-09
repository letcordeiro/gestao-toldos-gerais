CREATE TABLE `vendedores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`telefone` text,
	`email` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `modelos_toldo` ADD `estrutura_sempre_aluminio` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `modelos_toldo` ADD `usa_formato` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `vendedor_id` integer REFERENCES vendedores(id);--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `formato` text;