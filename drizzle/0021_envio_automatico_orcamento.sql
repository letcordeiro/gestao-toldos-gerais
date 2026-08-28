ALTER TABLE `orcamentos` ADD `agendado_em` integer;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `envio_tentativas` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `envio_erro` text;
--> statement-breakpoint
ALTER TABLE `orcamentos` ADD `mensagem_id` text;
