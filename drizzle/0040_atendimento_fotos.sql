-- Fotos do atendimento (21/10/2026): as que o cliente manda pelo WhatsApp do
-- Tadeu entram aqui, presas ao atendimento — o lead ainda não tem orçamento
-- (orcamento_fotos). Arquivos em uploads/atendimentos/<id>/.
--   origem 'tadeu'  → veio do WhatsApp do atendimento
--   origem 'equipe' → anexada por alguém da equipe
CREATE TABLE `atendimento_fotos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`atendimento_id` integer NOT NULL,
	`arquivo` text NOT NULL,
	`legenda` text,
	`origem` text DEFAULT 'equipe' NOT NULL,
	`mensagem_id` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `atendimento_fotos_atendimento` ON `atendimento_fotos` (`atendimento_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `atendimento_fotos_mensagem` ON `atendimento_fotos` (`mensagem_id`);
