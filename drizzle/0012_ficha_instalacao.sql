CREATE TABLE `orcamento_instalacao` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orcamento_id` integer NOT NULL,
	`responsavel` text,
	`observacoes` text,
	`calha` text,
	`tipo_escada` text,
	`cond_estacionamento` text,
	`horario` text,
	`prev_entrega` integer,
	`data_entrega` integer,
	`atualizado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orcamento_instalacao_orcamento_id_unique` ON `orcamento_instalacao` (`orcamento_id`);--> statement-breakpoint
CREATE TABLE `instalacao_itens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orcamento_id` integer NOT NULL,
	`qtde` text,
	`produto` text,
	`estrutura` text,
	`revestimento` text,
	`rufo` text,
	`babado` text,
	`vies` text,
	`ordem` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action
);
