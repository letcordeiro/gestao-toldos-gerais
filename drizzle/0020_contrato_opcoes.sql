CREATE TABLE `contrato_opcoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contrato_id` integer NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`rotulo` text NOT NULL,
	`valor` integer NOT NULL,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `contrato_pagamentos` ADD `percentual` real;
