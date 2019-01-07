CREATE TABLE `tb_account_features` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) NOT NULL,
	 `feature_id` int(11) NOT NULL,
	 `status` tinyint(1) NOT NULL DEFAULT '1',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `account_id` (`account_id`,`feature_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_accounts` (
	 `account_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `name` varchar(30) NOT NULL DEFAULT '',
	 `url` varchar(500) NOT NULL DEFAULT '',
	 `icon` varchar(500) DEFAULT NULL,
	 `logo` varchar(500) DEFAULT NULL,
	 `auth_api` varchar(300) DEFAULT NULL,
	 `status` int(11) NOT NULL DEFAULT '1',
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 PRIMARY KEY (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_categories` (
	 `category_id` int(11) NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) DEFAULT NULL,
	 `name` varchar(32) NOT NULL,
	 `slug` varchar(32) NOT NULL,
	 `parent` int(11) DEFAULT NULL,
	 `is_admin` tinyint(1) NOT NULL DEFAULT '0',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`category_id`),
	 UNIQUE KEY `account_slug` (`account_id`,`slug`),
	 KEY `parent` (`parent`),
	 KEY `slug` (`slug`,`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_credentials` (
	 `id` int(11) NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) NOT NULL,
	 `type` varchar(50) NOT NULL,
	 `connection_name` varchar(50) DEFAULT NULL,
	 `host` varchar(100) DEFAULT NULL,
	 `port` int(11) DEFAULT NULL,
	 `user` varchar(100) DEFAULT NULL,
	 `password` varchar(100) DEFAULT NULL,
	 `db` varchar(100) DEFAULT NULL,
	 `limit` int(11) DEFAULT NULL,
	 `file` text,
	 `project_name` varchar(50) DEFAULT NULL,
	 `status` int(11) NOT NULL DEFAULT '1',
	 `added_by` int(11) DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `account_id` (`account_id`,`connection_name`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_dashboards` (
	 `id` int(11) NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) NOT NULL,
	 `added_by` int(11) DEFAULT NULL,
	 `name` varchar(100) NOT NULL,
	 `parent` int(11) DEFAULT NULL,
	 `icon` varchar(100) DEFAULT NULL,
	 `status` smallint(6) NOT NULL DEFAULT '1',
	 `roles` varchar(50) DEFAULT NULL,
	 `order` int(11) DEFAULT NULL,
	 `format` json DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_datasources` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `name` varchar(50) NOT NULL DEFAULT '',
	 `slug` varchar(50) NOT NULL DEFAULT '',
	 `image` varchar(500) DEFAULT NULL,
	 `status` int(11) NOT NULL DEFAULT '1',
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_features` (
	 `feature_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
	 `slug` varchar(50) NOT NULL,
	 `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`feature_id`),
	 UNIQUE KEY `slug` (`slug`),
	 UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_global_filters` (
	 `id` int(11) NOT NULL AUTO_INCREMENT,
	 `name` varchar(64) DEFAULT NULL,
	 `account_id` int(11) DEFAULT NULL,
	 `placeholder` varchar(64) NOT NULL DEFAULT '' COMMENT '{{ backend }} , [[ frontend ]]',
	 `description` varchar(200) DEFAULT NULL,
	 `dashboard_id` int(11) DEFAULT NULL,
	 `order` int(11) DEFAULT NULL,
	 `default_value` varchar(500) DEFAULT NULL COMMENT 'default not null to apply filter',
	 `offset` int(11) DEFAULT NULL,
	 `multiple` smallint(6) DEFAULT '0',
	 `type` enum('number','text','date','month','hidden','column','datetime') DEFAULT 'text' COMMENT '0-Integer, 1-String, 2-Date',
	 `dataset` int(11) DEFAULT NULL,
	 `is_enabled` int(11) NOT NULL DEFAULT '1',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `unique_index` (`account_id`,`placeholder`,`dashboard_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_job_contacts` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `job_id` int(11) DEFAULT NULL,
	 `user_id` int(11) DEFAULT NULL,
	 `job_status` int(11) DEFAULT NULL,
	 `contact_type` varchar(11) DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_jobs` (
	 `job_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) DEFAULT NULL,
	 `name` varchar(50) DEFAULT NULL,
	 `cron_interval_string` varchar(50) DEFAULT NULL,
	 `next_interval` timestamp NULL DEFAULT NULL,
	 `is_enabled` int(11) NOT NULL DEFAULT '1',
	 `is_deleted` int(11) NOT NULL DEFAULT '0',
	 `added_by` int(11) DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 `type` enum('none','adword') DEFAULT 'none',
	 `config` text,
	 PRIMARY KEY (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_oauth_connections` (
	 `id` int(11) NOT NULL AUTO_INCREMENT,
	 `user_id` int(11) NOT NULL,
	 `provider_id` int(11) NOT NULL,
	 `access_token` varchar(1000) DEFAULT NULL,
	 `refresh_token` varchar(1000) DEFAULT NULL,
	 `expires_at` timestamp NULL DEFAULT NULL,
	 `status` tinyint(4) NOT NULL DEFAULT '1',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_oauth_providers` (
	 `provider_id` int(11) NOT NULL AUTO_INCREMENT,
	 `name` varchar(100) NOT NULL,
	 `type` varchar(100) NOT NULL,
	 `client_id` varchar(1000) NOT NULL,
	 `client_secret` varchar(1000) NOT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_object_roles` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) DEFAULT NULL,
	 `added_by` int(11) DEFAULT NULL COMMENT 'User Id',
	 `owner_id` int(11) NOT NULL COMMENT 'from',
	 `owner` enum('user','dashboard','role','query','connection','visualization') DEFAULT NULL,
	 `target_id` int(11) NOT NULL,
	 `target` enum('user','dashboard','role','connection') NOT NULL DEFAULT 'role' COMMENT 'to',
	 `category_id` int(11) DEFAULT NULL,
	 `group_id` int(11) NOT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `account_owner_target_cat_group` (`account_id`,`owner_id`,`owner`,`target_id`,`target`,`category_id`,`group_id`),
	 KEY `account_id` (`account_id`),
	 KEY `owner_id` (`owner_id`),
	 KEY `owner` (`owner`),
	 KEY `target` (`target`),
	 KEY `target_id` (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_password_reset` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `user_id` int(11) NOT NULL,
	 `reset_token` varchar(300) NOT NULL DEFAULT '',
	 `status` int(11) NOT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_privileges` (
	 `privilege_id` int(11) NOT NULL AUTO_INCREMENT,
	 `name` varchar(50) NOT NULL,
	 `account_id` int(11) DEFAULT NULL,
	 `is_admin` smallint(10) NOT NULL DEFAULT '0',
	 `status` int(11) NOT NULL DEFAULT '1',
	 `added_by` int(11) DEFAULT '0',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`privilege_id`),
	 UNIQUE KEY `name` (`name`,`account_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_privileges_tree` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `privilege_id` int(11) DEFAULT NULL,
	 `parent` int(11) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `AccId_name_priviIedge_Parent` (`privilege_id`,`parent`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_query` (
	 `query_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'PK',
	 `account_id` int(11) DEFAULT NULL,
	 `name` varchar(64) NOT NULL,
	 `connection_name` int(11) DEFAULT NULL,
	 `query` mediumtext,
	 `definition` json DEFAULT NULL,
	 `url` varchar(500) DEFAULT NULL,
	 `url_options` json DEFAULT NULL,
	 `subtitle` int(11) NOT NULL COMMENT 'FK',
	 `description` text,
	 `added_by` int(100) DEFAULT NULL,
	 `requested_by` varchar(100) DEFAULT NULL,
	 `tags` varchar(1024) DEFAULT NULL,
	 `is_enabled` int(11) NOT NULL DEFAULT '1',
	 `is_deleted` int(11) NOT NULL DEFAULT '0',
	 `is_redis` varchar(10) DEFAULT NULL,
	 `load_saved` int(3) NOT NULL DEFAULT '0',
	 `refresh_rate` int(11) DEFAULT NULL,
	 `roles` varchar(50) DEFAULT NULL,
	 `format` json DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`query_id`),
	 KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_query_filters` (
	 `filter_id` int(11) NOT NULL AUTO_INCREMENT,
	 `name` varchar(64) DEFAULT NULL,
	 `query_id` int(11) DEFAULT NULL,
	 `placeholder` varchar(64) NOT NULL COMMENT '{{ backend }} , [[ frontend ]]',
	 `description` varchar(64) DEFAULT NULL,
	 `order` int(11) DEFAULT NULL,
	 `default_value` varchar(500) DEFAULT NULL COMMENT 'default not null to apply filter',
	 `offset` varchar(500) DEFAULT NULL,
	 `multiple` smallint(6) DEFAULT '0',
	 `type` enum('number','text','date','month','hidden','column','datetime','literal','time','year') DEFAULT 'text',
	 `dataset` int(11) DEFAULT NULL,
	 `is_enabled` int(11) NOT NULL DEFAULT '1',
	 `is_deleted` int(11) NOT NULL DEFAULT '0',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`filter_id`),
	 UNIQUE KEY `unique_index` (`query_id`,`placeholder`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_query_visualizations` (
	 `visualization_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `query_id` int(11) NOT NULL,
	 `name` varchar(250) DEFAULT NULL,
	 `type` enum('table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble','html','linear','sankey','calendar') NOT NULL DEFAULT 'table',
	 `description` text,
	 `tags` varchar(1024) DEFAULT NULL,
	 `options` json DEFAULT NULL,
	 `added_by` int(11) DEFAULT NULL,
	 `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
	 `is_deleted` smallint(11) DEFAULT '0',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`visualization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_roles` (
	 `role_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) DEFAULT NULL,
	 `name` varchar(30) DEFAULT NULL,
	 `is_admin` smallint(6) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_settings` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) DEFAULT NULL,
	 `owner` enum('account','user') DEFAULT NULL,
	 `owner_id` int(11) DEFAULT NULL,
	 `profile` varchar(30) DEFAULT NULL,
	 `value` json DEFAULT NULL,
	 `status` int(11) DEFAULT '1',
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `account_id` (`account_id`,`owner`,`profile`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_spatial_map_themes` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	 `theme` text COLLATE utf8mb4_unicode_ci,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tb_tasks` (
	 `task_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `job_id` int(11) NOT NULL,
	 `name` varchar(50) DEFAULT NULL,
	 `account_id` int(11) NOT NULL,
	 `definition` text COMMENT 'json containing url and method',
	 `parameters` varchar(200) DEFAULT NULL,
	 `timeout` float DEFAULT NULL COMMENT 'seconds',
	 `sequence` int(11) NOT NULL,
	 `inherit_data` smallint(6) DEFAULT NULL,
	 `fatal` int(11) NOT NULL DEFAULT '0',
	 `is_enabled` smallint(11) NOT NULL DEFAULT '1',
	 `is_deleted` smallint(11) NOT NULL DEFAULT '0',
	 `added_by` int(11) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_user_privilege` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `user_id` int(11) DEFAULT NULL,
	 `category_id` int(11) DEFAULT NULL,
	 `privilege_id` int(11) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `user_category_privilege` (`user_id`,`category_id`,`privilege_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_user_query` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `user_id` int(11) DEFAULT NULL,
	 `query_id` int(11) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_users` (
	 `user_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) NOT NULL,
	 `phone` varchar(15) DEFAULT '',
	 `email` varchar(50) NOT NULL DEFAULT '',
	 `first_name` varchar(30) NOT NULL DEFAULT '',
	 `last_name` varchar(30) DEFAULT NULL,
	 `middle_name` varchar(30) DEFAULT NULL,
	 `privileges_deleted` varchar(50) DEFAULT NULL,
	 `TTL` int(11) NOT NULL DEFAULT '30',
	 `password` varchar(300) DEFAULT NULL,
	 `added_by` int(11) DEFAULT '0',
	 `status` varchar(30) NOT NULL DEFAULT '1',
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`user_id`),
	 UNIQUE KEY `account_user` (`email`,`account_id`),
	 KEY `account_id` (`account_id`),
	 KEY `phone` (`phone`),
	 KEY `status` (`status`),
	 KEY `created_aat` (`created_at`),
	 KEY `first_name` (`first_name`,`middle_name`,`last_name`),
	 KEY `first_name_2` (`first_name`),
	 KEY `middle_name` (`middle_name`),
	 KEY `last_name` (`last_name`),
	 KEY `first_name_3` (`first_name`,`last_name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_visualization_canvas` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `owner` enum('report','dashboard','visualization') DEFAULT NULL,
	 `owner_id` int(11) DEFAULT NULL,
	 `dashboard_id` int(11) DEFAULT NULL,
	 `visualization_id` int(11) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `format` json DEFAULT NULL,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`),
	 UNIQUE KEY `owner_visualization` (`owner`,`owner_id`,`visualization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_visualizations` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `name` varchar(100) NOT NULL DEFAULT '',
	 `slug` varchar(100) DEFAULT NULL,
	 `image` varchar(200) DEFAULT NULL,
	 `excel_format` json DEFAULT NULL,
	 `description` varchar(1000) DEFAULT NULL,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO
	tb_features (name, slug, type)
VALUES
	('Table','table','visualization'),
	('Spatial Map','spatialmap','visualization'),
	('Funnel','funnel','visualization'),
	('Cohort','cohort','visualization'),
	('Line','line','visualization'),
	('Bar','bar','visualization'),
	('Area','area','visualization'),
	('Stacked','stacked','visualization'),
	('Pie','pie','visualization'),
	('Live Number','livenumber','visualization'),
	('Dual Axis Bar','dualaxisbar','visualization'),
	('Bubble','bubble','visualization'),
	('Big Text','bigtext','visualization'),
	('Scatter','scatter','visualization'),
	('Json','json','visualization'),
	('MySQL','mysql','source'),
	('API','api','source'),
	('pgSQL','pgsql','source'),
	('BigQuery','bigquery','source'),
	('HTML','html','visualization'),
	('MongoDB','mongo','source'),
	('File','file','source'),
	('Linear','linear','visualization'),
	('Sankey','sankey','visualization'),
	('Calendar Heatmap','calendar','visualization'),
	('Bigquery Legacy','bigquery_legacy','source');

INSERT INTO
	tb_datasources (name, slug)
VALUES
	('MySQL','mysql'),
	('MSSQL','mssql'),
	('PostgreSQL','pgsql'),
	('Google Bigquery','bigquery'),
	('Mongodb','mongo'),
	('Oracle','oracle'),
	('API','api'),
	('File','file'),
	('Google Bigquery Legacy','bigquery_legacy');

INSERT INTO
	tb_visualizations (name, slug, image)
VALUES
	('Table','table','https://i.imgur.com/t9yW97t.png'),
	('Spatial Map','spatialmap','https://i.imgur.com/gDxBW8Z.png'),
	('Funnel','funnel','https://i.imgur.com/bBJIrBo.png'),
	('Cohort','cohort','https://i.imgur.com/y8Fnq1p.png'),
	('Line','line','https://i.imgur.com/Rz8MCXI.png'),
	('Bar','bar','https://i.imgur.com/ItNpKis.png'),
	('Area','area','https://i.imgur.com/4lVeuw1.png'),
	('Stacked','stacked','https://i.imgur.com/7PLntjB.png'),
	('Pie','pie','https://i.imgur.com/9VDKnlz.png'),
	('Live Number','livenumber','https://i.imgur.com/xxcMnSv.png'),
	('Dual Axis Bar','dualaxisbar','https://i.imgur.com/5Csusur.png'),
	('Bubble','bubble','https://i.imgur.com/UtECRk2.png'),
	('Big Text','bigtext','https://i.imgur.com/zip77tn.png'),
	('Scatter','scatter','https://i.imgur.com/mBxqW9e.png'),
	('JSON','json','https://i.imgur.com/ydjKDYl.png'),
	('HTML','html',''),
	('Linear','linear','https://i.imgur.com/5Csusur.png'),
	('Sankey','sankey',''),
	('Calender','calendar','');

INSERT INTO
	tb_privileges (privilege_id, name, account_id)
VALUES
	(1, 'user', 0),
	(2, 'user.insert', 0),
	(3, 'user.update', 0),
	(4, 'user.delete', 0),
	(5, 'user.list', 0),
	(6, 'connection.insert', 0),
	(7, 'connection.update', 0),
	(8, 'connection.delete', 0),
	(9, 'connection.list', 0),
	(10, 'connection', 0),
	(11, 'dashboard.insert', 0),
	(12, 'dashboard.update', 0),
	(13, 'dashboard.list', 0),
	(14, 'dashboard.delete', 0),
	(15, 'dashboard', 0),
	(16, 'report', 0),
	(17, 'report.insert', 0),
	(18, 'report.update', 0),
	(19, 'report.delete', 0),
	(20, 'visualization', 0),
	(21, 'visualization.insert', 0),
	(22, 'visualization.update', 0),
	(23, 'visualization.delete', 0),
	(24, 'visualization.list', 0),
	(25, 'category', 0),
	(26, 'category.insert', 0),
	(27, 'category.update', 0),
	(28, 'category.list', 0),
	(29, 'category.delete', 0);

INSERT INTO
	tb_privileges_tree (privilege_id, parent)
VALUES
	(1, 2),
	(1, 3),
	(1, 4),
	(1, 5),
	(2, 0),
	(3, 0),
	(4, 0),
	(5, 0),
	(10, 6),
	(10, 7),
	(10, 8),
	(10, 9),
	(6, 0),
	(7, 0),
	(8, 0),
	(9, 0),
	(15, 11),
	(15, 12),
	(15, 13),
	(15, 14),
	(11, 0),
	(12, 0),
	(13, 0),
	(14, 0),
	(16, 17),
	(16, 18),
	(16, 19),
	(17, 0),
	(18, 0),
	(19, 0),
	(20, 21),
	(20, 22),
	(20, 23),
	(20, 24),
	(21, 0),
	(22, 0),
	(23, 0),
	(24, 0),
	(25, 26),
	(25, 27),
	(25, 28),
	(25, 29),
	(26, 0),
	(27, 0),
	(28, 0),
	(29, 0);