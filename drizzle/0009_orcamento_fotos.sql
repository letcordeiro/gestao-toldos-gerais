CREATE TABLE `orcamento_fotos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orcamento_id` integer NOT NULL,
	`arquivo` text NOT NULL,
	`legenda` text,
	`ordem` integer DEFAULT 0 NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action
);
