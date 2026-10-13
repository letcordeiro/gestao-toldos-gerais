-- Agenda do próprio sistema (13/10/2026): horário em que o vendedor NÃO pode
-- receber visita — faculdade, médico, folga. Sem depender do Google.
--   recorrencia 'unico'   → vale só no dia `data`
--   recorrencia 'semanal' → vale todo `dia_semana` (0 = domingo), a partir de
--                           `data` (se houver) e até `ate` (se houver)
--   inicio_min / fim_min  → minutos desde a meia-noite; 0 e 1440 = dia inteiro
-- Datas em texto "aaaa-mm-dd": dia de calendário, sem fuso no meio.
CREATE TABLE `agenda_bloqueios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendedor_id` integer NOT NULL,
	`recorrencia` text DEFAULT 'unico' NOT NULL,
	`data` text,
	`dia_semana` integer,
	`inicio_min` integer NOT NULL,
	`fim_min` integer NOT NULL,
	`ate` text,
	`motivo` text,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agenda_bloqueios_vendedor` ON `agenda_bloqueios` (`vendedor_id`);
