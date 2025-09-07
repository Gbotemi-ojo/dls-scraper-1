CREATE TABLE `found_phone_numbers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`player_id` varchar(16),
	`found_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `found_phone_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players_to_visit` (
	`id` varchar(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `players_to_visit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players_visited` (
	`id` varchar(16) NOT NULL,
	`visited_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `players_visited_id` PRIMARY KEY(`id`)
);
