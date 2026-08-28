CREATE TABLE `motivos_perda` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tarefas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text DEFAULT 'ligacao' NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`atendimento_id` integer,
	`orcamento_id` integer,
	`contrato_id` integer,
	`responsavel_id` integer,
	`prioridade` text DEFAULT 'media' NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`prevista_em` integer,
	`concluida_em` integer,
	`mensagem` text,
	`gatilho_id` integer,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsavel_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tarefas_status_prevista` ON `tarefas` (`status`,`prevista_em`);
--> statement-breakpoint
CREATE INDEX `tarefas_atendimento` ON `tarefas` (`atendimento_id`);
--> statement-breakpoint
CREATE TABLE `gatilhos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`evento` text NOT NULL,
	`fase_id` integer,
	`tarefa_tipo` text DEFAULT 'ligacao' NOT NULL,
	`tarefa_titulo` text NOT NULL,
	`tarefa_prioridade` text DEFAULT 'media' NOT NULL,
	`prazo_dias` integer DEFAULT 0 NOT NULL,
	`mensagem` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`fase_id`) REFERENCES `fases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `fases` ADD `exibir_na_listagem` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `fases` ADD `terminal` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `fases` ADD `eh_perdido` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `atendimentos` ADD `motivo_perda_id` integer;
--> statement-breakpoint
ALTER TABLE `atendimentos` ADD `motivo_perda_obs` text;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `introducao` text;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `aos_cuidados_de` text;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `validade_dias` integer;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `observacoes_internas` text;
--> statement-breakpoint
ALTER TABLE `contratos` ADD `observacoes_internas` text;
--> statement-breakpoint
UPDATE `fases` SET `terminal` = true WHERE `nome` IN ('Concluído', 'Perdido');
--> statement-breakpoint
UPDATE `fases` SET `eh_perdido` = true, `exibir_na_listagem` = false WHERE `nome` = 'Perdido';
