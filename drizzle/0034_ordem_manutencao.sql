-- Campos da Ordem de Manutenção (a ficha de papel que a equipe leva ao local).
-- O chamado já guardava o relato e a garantia; faltava o que se preenche na
-- hora de ir: quanto se cobra, quem vai, que serviço é e em que dia.
ALTER TABLE `chamados` ADD `valor` integer;--> statement-breakpoint
ALTER TABLE `chamados` ADD `instalador` text;--> statement-breakpoint
ALTER TABLE `chamados` ADD `tipo_servico` text;--> statement-breakpoint
ALTER TABLE `chamados` ADD `servico_outros` text;--> statement-breakpoint
ALTER TABLE `chamados` ADD `visita_em` integer;
