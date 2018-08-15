CREATE TABLE `tb_accounts` (
  `account_id` int(11) UNSIGNED NOT NULL,
  `name` varchar(30) NOT NULL DEFAULT '',
  `url` varchar(500) NOT NULL DEFAULT '',
  `icon` varchar(500) NOT NULL DEFAULT '',
  `logo` varchar(500) NOT NULL DEFAULT '',
  `auth_api` varchar(300) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_account_features` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) NOT NULL,
  `feature_id` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tb_categories` (
  `category_id` int(11) NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(32) NOT NULL,
  `slug` varchar(32) NOT NULL,
  `parent` int(11) DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_credentials` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `connection_name` varchar(50) NOT NULL DEFAULT '',
  `host` varchar(100) DEFAULT '',
  `port` int(11) DEFAULT NULL,
  `user` varchar(100) DEFAULT '',
  `password` varchar(100) DEFAULT '',
  `db` varchar(100) DEFAULT '',
  `limit` int(11) DEFAULT NULL,
  `file` varchar(500) DEFAULT NULL,
  `project_name` varchar(50) DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_dashboards` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `added_by` int(11) DEFAULT NULL,
  `visibility` enum('public','private') DEFAULT 'public',
  `name` varchar(100) NOT NULL,
  `parent` int(11) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `status` smallint(6) NOT NULL DEFAULT '1',
  `roles` varchar(50) DEFAULT NULL,
  `format` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_datasets` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `query_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `order` int(11) DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_features` (
  `feature_id` int(11) UNSIGNED NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tb_global_filters` (
  `id` int(11) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `placeholder` varchar(64) NOT NULL DEFAULT '' COMMENT '{{ backend }} , [[ frontend ]]',
  `description` varchar(64) DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT '0',
  `default_value` varchar(500) DEFAULT NULL COMMENT 'default not null to apply filter',
  `offset` int(11) DEFAULT NULL,
  `multiple` smallint(6) DEFAULT '0',
  `type` enum('number','text','date','month','hidden','column','datetime') DEFAULT 'text' COMMENT '0-Integer, 1-String, 2-Date',
  `dataset` int(11) DEFAULT NULL,
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_oauth_connections` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `access_token` varchar(1000) DEFAULT NULL,
  `refresh_token` varchar(1000) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_oauth_providers` (
  `provider_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(100) NOT NULL,
  `client_id` varchar(1000) NOT NULL,
  `client_secret` varchar(1000) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_object_roles` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL COMMENT 'User Id',
  `owner_id` int(11) NOT NULL COMMENT 'from',
  `owner` enum('user','dashboard','role','query','connection') DEFAULT NULL,
  `target_id` int(11) NOT NULL,
  `target` enum('user','dashboard','role') NOT NULL DEFAULT 'role' COMMENT 'to',
  `category_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_password_reset` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `reset_token` varchar(300) NOT NULL DEFAULT '',
  `status` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_privileges` (
  `privilege_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_admin` smallint(10) NOT NULL DEFAULT '0',
  `status` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_query` (
  `query_id` int(11) NOT NULL COMMENT 'PK',
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `source` enum('query','api','pg') NOT NULL DEFAULT 'query',
  `query` varchar(25000) DEFAULT NULL,
  `definition` varchar(10000) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `url_options` text,
  `subtitle` int(11) NOT NULL COMMENT 'FK',
  `description` varchar(1024) DEFAULT NULL,
  `added_by` int(100) DEFAULT NULL,
  `requested_by` varchar(100) DEFAULT NULL,
  `tags` varchar(1024) DEFAULT NULL,
  `load_saved` tinyint(4) NOT NULL DEFAULT '0',
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `is_redis` varchar(10) DEFAULT '1',
  `refresh_rate` int(11) DEFAULT NULL,
  `roles` varchar(50) DEFAULT NULL,
  `format` varchar(25000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `connection_name` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_query_filters` (
  `filter_id` int(11) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
  `placeholder` varchar(64) NOT NULL COMMENT '{{ backend }} , [[ frontend ]]',
  `description` varchar(64) DEFAULT NULL,
  `default_value` varchar(500) DEFAULT NULL COMMENT 'default not null to apply filter',
  `offset` int(11) DEFAULT NULL,
  `multiple` smallint(6) DEFAULT '0',
  `order` int(11) DEFAULT NULL,
  `type` enum('number','text','date','month','hidden','column','datetime') DEFAULT 'text' COMMENT '0-Integer, 1-String, 2-Date',
  `dataset` int(11) DEFAULT NULL,
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_query_visualizations` (
  `visualization_id` int(11) UNSIGNED NOT NULL,
  `query_id` int(11) NOT NULL,
  `name` varchar(250) DEFAULT NULL,
  `type` enum('table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bubble','scatter','bigtext','json','html') NOT NULL DEFAULT 'table',
  `description` varchar(1000) DEFAULT NULL,
  `options` text,
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `is_deleted` smallint(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_roles` (
  `role_id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(30) DEFAULT NULL,
  `is_admin` smallint(6) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_settings` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `owner` varchar(30) DEFAULT NULL,
  `profile` varchar(30) DEFAULT NULL,
  `value` text,
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_spatial_map_themes` (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tb_tasks` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `details` text,
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_third_party_ga` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `task_id` int(11) NOT NULL,
  `segment` varchar(100) NOT NULL,
  `landingPagePath` varchar(10000) NOT NULL,
  `countryIsoCode` varchar(50) NOT NULL,
  `users` int(11) NOT NULL,
  `percentNewSessions` float NOT NULL,
  `sessions` float NOT NULL,
  `sessionsPerUser` float NOT NULL,
  `newUsers` int(11) NOT NULL,
  `organicSearches` float NOT NULL,
  `avgSessionDuration` varchar(100) NOT NULL,
  `bounceRate` varchar(100) NOT NULL,
  `goalCompletionsAll` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_users` (
  `user_id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) NOT NULL,
  `phone` varchar(15) NOT NULL DEFAULT '',
  `email` varchar(50) NOT NULL DEFAULT '',
  `first_name` varchar(30) NOT NULL DEFAULT '',
  `last_name` varchar(30) NOT NULL DEFAULT '',
  `middle_name` varchar(30) DEFAULT NULL,
  `privileges` varchar(50) DEFAULT NULL,
  `TTL` int(11) NOT NULL DEFAULT '7',
  `password` varchar(300) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_user_dashboard` (
  `id` int(11) UNSIGNED NOT NULL,
  `dashboard_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_user_privilege` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `privilege_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_user_query` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_user_roles` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_visualizations` (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT '',
  `slug` varchar(100) DEFAULT NULL,
  `image` varchar(200) DEFAULT NULL,
  `excel_format` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_visualization_dashboard` (
  `id` int(11) UNSIGNED NOT NULL,
  `dashboard_id` int(11) DEFAULT NULL,
  `visualization_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `format` varchar(3000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


ALTER TABLE `tb_accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `url` (`url`),
  ADD UNIQUE KEY `name` (`name`);

ALTER TABLE `tb_account_features`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`feature_id`);

ALTER TABLE `tb_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`name`),
  ADD KEY `parent` (`parent`);

ALTER TABLE `tb_credentials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`connection_name`,`type`);

ALTER TABLE `tb_dashboards`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_datasets`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_features`
  ADD PRIMARY KEY (`feature_id`);

ALTER TABLE `tb_global_filters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_index` (`account_id`,`placeholder`);

ALTER TABLE `tb_oauth_connections`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_oauth_providers`
  ADD PRIMARY KEY (`provider_id`);

ALTER TABLE `tb_object_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_owner_target_category` (`account_id`,`owner_id`,`target_id`,`category_id`,`target`,`owner`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `owner_id` (`owner_id`),
  ADD KEY `owner` (`owner`),
  ADD KEY `target` (`target`),
  ADD KEY `target_id` (`target_id`);

ALTER TABLE `tb_password_reset`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_privileges`
  ADD PRIMARY KEY (`privilege_id`),
  ADD KEY `account_id` (`name`);

ALTER TABLE `tb_query`
  ADD PRIMARY KEY (`query_id`);

ALTER TABLE `tb_query_filters`
  ADD PRIMARY KEY (`filter_id`),
  ADD UNIQUE KEY `unique_index` (`query_id`,`placeholder`);

ALTER TABLE `tb_query_visualizations`
  ADD PRIMARY KEY (`visualization_id`);

ALTER TABLE `tb_roles`
  ADD PRIMARY KEY (`role_id`);

ALTER TABLE `tb_settings`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_spatial_map_themes`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_tasks`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_third_party_ga`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `account_user` (`email`,`account_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `phone` (`phone`),
  ADD KEY `status` (`status`),
  ADD KEY `created_aat` (`created_at`);

ALTER TABLE `tb_user_dashboard`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dashboard_id` (`dashboard_id`,`user_id`);

ALTER TABLE `tb_user_privilege`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_user_query`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id_2` (`user_id`,`role_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `tb_visualizations`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tb_visualization_dashboard`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dashboard_id` (`dashboard_id`,`visualization_id`);


ALTER TABLE `tb_accounts`
  MODIFY `account_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_account_features`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_credentials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_dashboards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_datasets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_features`
  MODIFY `feature_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_global_filters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_oauth_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_oauth_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_object_roles`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_password_reset`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_privileges`
  MODIFY `privilege_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_query`
  MODIFY `query_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'PK';

ALTER TABLE `tb_query_filters`
  MODIFY `filter_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_query_visualizations`
  MODIFY `visualization_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_roles`
  MODIFY `role_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_settings`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_spatial_map_themes`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_third_party_ga`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_users`
  MODIFY `user_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_user_dashboard`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_user_privilege`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_user_query`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_user_roles`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_visualizations`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tb_visualization_dashboard`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
