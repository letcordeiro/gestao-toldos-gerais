CREATE TABLE `chamados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`atendimento_id` integer NOT NULL,
	`orcamento_id` integer,
	`assunto` text NOT NULL,
	`descricao` text,
	`tipo` text DEFAULT 'receptivo' NOT NULL,
	`na_garantia` integer,
	`prioridade` text DEFAULT 'media' NOT NULL,
	`situacao` text DEFAULT 'aberto' NOT NULL,
	`responsavel_id` integer,
	`fechado_em` integer,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsavel_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chamados_situacao` ON `chamados` (`situacao`);
--> statement-breakpoint
CREATE TABLE `chamado_interacoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chamado_id` integer NOT NULL,
	`texto` text NOT NULL,
	`autor` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chamado_id`) REFERENCES `chamados`(`id`) ON UPDATE no action ON DELETE cascade
);
