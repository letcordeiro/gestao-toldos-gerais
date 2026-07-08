CREATE TABLE `atendimentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`fase_id` integer NOT NULL,
	`observacoes` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fase_id`) REFERENCES `fases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`telefone` text NOT NULL,
	`email` text,
	`endereco` text,
	`cidade` text,
	`origem` text DEFAULT 'interno' NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ordem` integer NOT NULL,
	`cor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `historico_fases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`atendimento_id` integer NOT NULL,
	`fase_anterior_id` integer,
	`fase_nova_id` integer NOT NULL,
	`data` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fase_anterior_id`) REFERENCES `fases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fase_nova_id`) REFERENCES `fases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `modelos_toldo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao_material` text,
	`estrutura_aluminio` text,
	`estrutura_ferro` text,
	`fixacao_vedacao` text,
	`ativo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orcamento_itens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orcamento_id` integer NOT NULL,
	`descricao` text NOT NULL,
	`valor_min` integer,
	`valor_max` integer,
	`ordem` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orcamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero` text NOT NULL,
	`atendimento_id` integer NOT NULL,
	`modelo_id` integer,
	`descricao_material` text,
	`estrutura_texto` text,
	`tipo_estrutura` text,
	`fixacao_vedacao` text,
	`garantia_texto` text,
	`forma_pagamento` text,
	`prazo_entrega` text,
	`status` text DEFAULT 'rascunho' NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modelo_id`) REFERENCES `modelos_toldo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orcamentos_numero_unique` ON `orcamentos` (`numero`);--> statement-breakpoint
CREATE TABLE `tokens_cadastro` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`expira_em` integer NOT NULL,
	`usado_em` integer,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_cadastro_token_unique` ON `tokens_cadastro` (`token`);