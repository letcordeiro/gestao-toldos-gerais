-- Agenda do Google de cada vendedor. Uma linha por vendedor: conectar de novo
-- substitui a anterior, e desconectar apaga a linha inteira (é o que faz o
-- sistema esquecer o token de verdade).
CREATE TABLE `agendas_google` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendedor_id` integer NOT NULL,
	`google_email` text NOT NULL,
	`refresh_token` text NOT NULL,
	`access_token` text,
	`access_token_expira_em` integer,
	`ultimo_erro` text,
	`conectado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `agendas_google_vendedor_id_unique` ON `agendas_google` (`vendedor_id`);
