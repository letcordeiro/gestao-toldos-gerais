CREATE TABLE `avisos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`gatilho` text NOT NULL,
	`dias` integer NOT NULL,
	`mensagem` text NOT NULL,
	`rearme_dias` integer,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `aviso_contatos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aviso_id` integer NOT NULL,
	`alvo_id` integer NOT NULL,
	`definitivo` integer DEFAULT false NOT NULL,
	`contatado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON UPDATE no action ON DELETE cascade
);
