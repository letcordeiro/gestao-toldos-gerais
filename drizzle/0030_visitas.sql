CREATE TABLE `visitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`atendimento_id` integer NOT NULL,
	`vendedor_id` integer,
	`inicio_em` integer NOT NULL,
	`duracao_min` integer DEFAULT 60 NOT NULL,
	`endereco` text,
	`observacoes` text,
	`situacao` text DEFAULT 'agendada' NOT NULL,
	`google_event_id` text,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `visitas_inicio` ON `visitas` (`inicio_em`);
--> statement-breakpoint
ALTER TABLE `vendedores` ADD `link_agendamento` text;
