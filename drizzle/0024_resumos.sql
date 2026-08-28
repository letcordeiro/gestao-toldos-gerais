CREATE TABLE `resumos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`frequencia` text DEFAULT 'diario' NOT NULL,
	`blocos` text DEFAULT '[]' NOT NULL,
	`destinatarios` text DEFAULT '[]' NOT NULL,
	`mensagem` text,
	`ativo` integer DEFAULT true NOT NULL,
	`ultimo_envio_em` integer,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
