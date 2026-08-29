CREATE TABLE `pos_venda_envios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`atendimento_id` integer NOT NULL,
	`aviso_id` integer NOT NULL,
	`conclusao_em` integer NOT NULL,
	`status` text DEFAULT 'agendado' NOT NULL,
	`agendado_em` integer NOT NULL,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`erro` text,
	`enviado_em` integer,
	`mensagem_id` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aviso_id`) REFERENCES `avisos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pos_venda_envios_atendimento_id_unique` ON `pos_venda_envios` (`atendimento_id`);
--> statement-breakpoint
UPDATE `avisos`
SET `dias` = 7,
    `rearme_dias` = NULL,
    `mensagem` = 'Olá {cliente}! Aqui é o João da Toldos Gerais.

Já faz alguns dias que concluímos a instalação e passamos para saber: está tudo certo com o seu toldo? O que você achou do nosso atendimento e do serviço?

Sua opinião ajuda muito a gente a melhorar. E, se puder, deixa uma avaliação rápida no Google — leva menos de 1 minuto e faz toda a diferença pra nós:

{avaliacao}

Muito obrigado pela confiança! Qualquer coisa, é só chamar.'
WHERE `gatilho` = 'atendimento_concluido' AND `nome` = 'Pós-venda';
