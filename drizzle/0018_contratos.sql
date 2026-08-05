ALTER TABLE `clientes` ADD `documento` text;
--> statement-breakpoint
CREATE TABLE `contratos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero` text,
	`versao` integer DEFAULT 1 NOT NULL,
	`contrato_pai_id` integer,
	`cliente_id` integer NOT NULL,
	`orcamento_id` integer NOT NULL,
	`status` text DEFAULT 'rascunho' NOT NULL,
	`snapshot` text,
	`valor_total` integer DEFAULT 0 NOT NULL,
	`escopo` text DEFAULT 'fabricacao' NOT NULL,
	`local_instalacao` text DEFAULT '' NOT NULL,
	`observacoes_tecnicas` text,
	`prazo_dias_uteis` integer DEFAULT 30 NOT NULL,
	`garantia_meses` integer DEFAULT 12 NOT NULL,
	`retencao_percent` integer DEFAULT 30 NOT NULL,
	`multa_percent` real DEFAULT 2 NOT NULL,
	`juros_mes_percent` real DEFAULT 1 NOT NULL,
	`flag_medidas` integer DEFAULT true NOT NULL,
	`flag_clima` integer DEFAULT true NOT NULL,
	`flag_energia` integer DEFAULT true NOT NULL,
	`flag_sob_medida` integer DEFAULT true NOT NULL,
	`representante` text DEFAULT 'João Pedro Avelar' NOT NULL,
	`cidade_emissao` text DEFAULT 'Belo Horizonte' NOT NULL,
	`data_emissao` integer,
	`data_assinatura` integer,
	`motivo_cancelamento` text,
	`valor_retido` integer,
	`public_token` text,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contratos_numero_unique` ON `contratos` (`numero`);
--> statement-breakpoint
CREATE UNIQUE INDEX `contratos_public_token_unique` ON `contratos` (`public_token`);
--> statement-breakpoint
CREATE TABLE `contrato_itens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contrato_id` integer NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`modelo` text NOT NULL,
	`cor` text,
	`medidas_m2` text,
	`descricao_extra` text,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contrato_pagamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contrato_id` integer NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`rotulo` text NOT NULL,
	`tipo` text NOT NULL,
	`valor` integer NOT NULL,
	`meio` text NOT NULL,
	`numero_parcelas` integer DEFAULT 1 NOT NULL,
	`gatilho` text NOT NULL,
	`dias_apos` integer,
	`data_vencimento` integer,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contrato_aditivos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contrato_id` integer NOT NULL,
	`numero` integer NOT NULL,
	`objeto` text NOT NULL,
	`delta_valor` integer DEFAULT 0 NOT NULL,
	`novo_prazo_dias_uteis` integer,
	`data_assinatura` integer,
	`snapshot` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contrato_eventos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contrato_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`descricao` text NOT NULL,
	`usuario` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE cascade
);
