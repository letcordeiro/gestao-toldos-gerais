CREATE TABLE `logs_dinheiro` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`acao` text NOT NULL,
	`usuario` text NOT NULL,
	`descricao` text NOT NULL,
	`valor` integer,
	`orcamento_id` integer,
	`contrato_id` integer,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `logs_dinheiro_criado` ON `logs_dinheiro` (`criado_em`);
