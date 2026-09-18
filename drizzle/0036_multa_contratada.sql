-- Multa por atraso DA CONTRATADA e diária de paralisação (18/09/2026).
-- Vieram do contrato da Telhado Técnico; os valores são decisão da Letícia.
-- Campos e não constantes porque preço muda com o tempo, e trocar número não
-- pode depender de deploy — mesma razão de multa_percent e juros_mes_percent.
ALTER TABLE `contratos` ADD `multa_contratada_dia_percent` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `multa_contratada_teto_percent` real DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `paralisacao_diaria` integer DEFAULT 80000 NOT NULL;
