-- DEM-0021 (13/10/2026): o chamado escolhe se é MANUTENÇÃO (o serviço) ou
-- VISITA (a ida ao local para avaliar). Antes todo chamado era ordem de
-- manutenção. Os que já existem continuam manutenção.
ALTER TABLE `chamados` ADD `natureza` text DEFAULT 'manutencao' NOT NULL;
