CREATE TABLE `numeracoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documento` text NOT NULL,
	`prefixo` text DEFAULT '' NOT NULL,
	`inclui_ano` integer DEFAULT true NOT NULL,
	`digitos` integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `numeracoes_documento_unique` ON `numeracoes` (`documento`);
--> statement-breakpoint
INSERT INTO `numeracoes` (`documento`, `prefixo`, `inclui_ano`, `digitos`) VALUES ('orcamento', '', 1, 3);
--> statement-breakpoint
INSERT INTO `numeracoes` (`documento`, `prefixo`, `inclui_ano`, `digitos`) VALUES ('contrato', 'CT', 1, 4);
