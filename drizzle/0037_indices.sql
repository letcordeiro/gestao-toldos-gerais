-- Índices que faltavam (auditoria de dados de 07/10/2026). O SQLite não cria
-- índice para chave estrangeira sozinho: a soma do valor de cada orçamento
-- (subconsulta em orcamento_itens) varria a tabela INTEIRA por orçamento, nas
-- telas de Orçamentos e no Painel. Só leitura mais rápida — não muda dado.
CREATE INDEX IF NOT EXISTS `orcamento_itens_orcamento` ON `orcamento_itens` (`orcamento_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `historico_fases_atendimento` ON `historico_fases` (`atendimento_id`,`fase_nova_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `orcamentos_atendimento` ON `orcamentos` (`atendimento_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `atendimentos_cliente` ON `atendimentos` (`cliente_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `atendimentos_fase` ON `atendimentos` (`fase_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `contrato_pagamentos_contrato` ON `contrato_pagamentos` (`contrato_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `aviso_contatos_aviso_alvo` ON `aviso_contatos` (`aviso_id`,`alvo_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chamados_atendimento` ON `chamados` (`atendimento_id`);
