CREATE TABLE `instaladores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`telefone` text,
	`comissao_padrao_percent` real,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `instalacao_equipe` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orcamento_id` integer NOT NULL,
	`instalador_id` integer NOT NULL,
	`papel` text DEFAULT 'ajudante' NOT NULL,
	`tipo` text DEFAULT 'percentual' NOT NULL,
	`percentual` real,
	`valor_fixo` integer,
	`pago_em` integer,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instalador_id`) REFERENCES `instaladores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `instalacao_equipe_orcamento` ON `instalacao_equipe` (`orcamento_id`);
