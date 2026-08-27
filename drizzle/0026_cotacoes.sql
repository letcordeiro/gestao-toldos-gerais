CREATE TABLE `fornecedores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`contato` text,
	`telefone` text,
	`email` text,
	`fornece` text,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cotacoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`orcamento_id` integer,
	`prazo_resposta` integer,
	`observacoes` text,
	`observacoes_internas` text,
	`situacao` text DEFAULT 'aberta' NOT NULL,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cotacao_itens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cotacao_id` integer NOT NULL,
	`descricao` text NOT NULL,
	`quantidade` text,
	`unidade` text,
	`ordem` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`cotacao_id`) REFERENCES `cotacoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cotacao_fornecedores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cotacao_id` integer NOT NULL,
	`fornecedor_id` integer NOT NULL,
	`token` text NOT NULL,
	`prazo_entrega` text,
	`observacao` text,
	`respondido_em` integer,
	FOREIGN KEY (`cotacao_id`) REFERENCES `cotacoes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cotacao_fornecedores_token_unique` ON `cotacao_fornecedores` (`token`);
--> statement-breakpoint
CREATE TABLE `cotacao_respostas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cotacao_fornecedor_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`valor_unitario` integer,
	FOREIGN KEY (`cotacao_fornecedor_id`) REFERENCES `cotacao_fornecedores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `cotacao_itens`(`id`) ON UPDATE no action ON DELETE cascade
);
