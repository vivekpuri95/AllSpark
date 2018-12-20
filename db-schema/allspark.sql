--
-- Database: `allspark`
--

-- --------------------------------------------------------

--
-- Table structure for table `tb_accounts`
--

CREATE TABLE `tb_accounts` (
  `account_id` int(11) UNSIGNED NOT NULL,
  `name` varchar(30) NOT NULL DEFAULT '',
  `url` varchar(500) NOT NULL DEFAULT '',
  `icon` varchar(500) DEFAULT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `auth_api` varchar(300) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_account_features`
--

CREATE TABLE `tb_account_features` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) NOT NULL,
  `feature_id` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_categories`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `tb_credentials`
--

CREATE TABLE `tb_credentials` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_dashboards`
--

CREATE TABLE `tb_dashboards` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_datasources`
--

CREATE TABLE `tb_datasources` (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL DEFAULT '',
  `slug` varchar(50) NOT NULL DEFAULT '',
  `image` varchar(500) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_features`
--

CREATE TABLE `tb_features` (
  `feature_id` int(11) UNSIGNED NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `slug` varchar(50) NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_global_filters`
--

CREATE TABLE `tb_global_filters` (
  `id` int(11) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `placeholder` varchar(64) NOT NULL DEFAULT '' COMMENT '{{ backend }} , [[ frontend ]]',
  `description` varchar(200) DEFAULT NULL,
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

-- --------------------------------------------------------

--
-- Table structure for table `tb_jobs`
--

CREATE TABLE `tb_jobs` (
  `job_id` int(11) UNSIGNED NOT NULL,
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
  `config` text
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_job_contacts`
--

CREATE TABLE `tb_job_contacts` (
  `id` int(11) UNSIGNED NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `job_status` int(11) DEFAULT NULL,
  `contact_type` varchar(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_oauth_connections`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `tb_oauth_providers`
--

CREATE TABLE `tb_oauth_providers` (
  `provider_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(100) NOT NULL,
  `client_id` varchar(1000) NOT NULL,
  `client_secret` varchar(1000) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_object_roles`
--

CREATE TABLE `tb_object_roles` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL COMMENT 'User Id',
  `owner_id` int(11) NOT NULL COMMENT 'from',
  `owner` enum('user','dashboard','role','query','connection','visualization') DEFAULT NULL,
  `target_id` int(11) NOT NULL,
  `target` enum('user','dashboard','role','connection') NOT NULL DEFAULT 'role' COMMENT 'to',
  `category_id` int(11) DEFAULT NULL,
  `group_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_password_reset`
--

CREATE TABLE `tb_password_reset` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `reset_token` varchar(300) NOT NULL DEFAULT '',
  `status` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_privileges`
--

CREATE TABLE `tb_privileges` (
  `privilege_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `is_admin` smallint(10) NOT NULL DEFAULT '0',
  `status` int(11) NOT NULL DEFAULT '1',
  `added_by` int(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_privileges_tree`
--

CREATE TABLE `tb_privileges_tree` (
  `id` int(11) UNSIGNED NOT NULL,
  `privilege_id` int(11) DEFAULT NULL,
  `parent` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_query`
--

CREATE TABLE `tb_query` (
  `query_id` int(11) NOT NULL COMMENT 'PK',
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `connection_name` int(11) DEFAULT NULL,
  `query` mediumtext,
  `definition` json DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `url_options` json DEFAULT NULL,
  `subtitle` int(11) NOT NULL COMMENT 'FK',
  `description` varchar(1024) DEFAULT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_query_filters`
--

CREATE TABLE `tb_query_filters` (
  `filter_id` int(11) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
  `placeholder` varchar(64) NOT NULL COMMENT '{{ backend }} , [[ frontend ]]',
  `description` varchar(64) DEFAULT NULL,
  `order` int(11) DEFAULT '0',
  `default_value` varchar(500) DEFAULT NULL COMMENT 'default not null to apply filter',
  `offset` int(11) DEFAULT NULL,
  `multiple` smallint(6) DEFAULT '0',
  `type` enum('number','text','date','month','hidden','column','datetime','literal','time','year') DEFAULT 'text',
  `dataset` int(11) DEFAULT NULL,
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_query_visualizations`
--

CREATE TABLE `tb_query_visualizations` (
  `visualization_id` int(11) UNSIGNED NOT NULL,
  `query_id` int(11) NOT NULL,
  `name` varchar(250) DEFAULT NULL,
  `type` enum('table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble','html','linear','sankey','calendar') NOT NULL DEFAULT 'table',
  `description` varchar(1000) DEFAULT NULL,
  `options` json DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `is_deleted` smallint(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_query_visualizations_copy`
--

CREATE TABLE `tb_query_visualizations_copy` (
  `visualization_id` int(11) UNSIGNED NOT NULL,
  `query_id` int(11) NOT NULL,
  `name` varchar(250) DEFAULT NULL,
  `type` enum('table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble','html','linear','sankey','calendar') NOT NULL DEFAULT 'table',
  `description` varchar(1000) DEFAULT NULL,
  `options` json DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `is_deleted` smallint(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_query_visualizations_copy_copy`
--

CREATE TABLE `tb_query_visualizations_copy_copy` (
  `visualization_id` int(11) UNSIGNED NOT NULL,
  `query_id` int(11) NOT NULL,
  `name` varchar(250) DEFAULT NULL,
  `type` enum('table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble','html','linear','sankey','calendar') NOT NULL DEFAULT 'table',
  `description` varchar(1000) DEFAULT NULL,
  `options` json DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `is_deleted` smallint(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_roles`
--

CREATE TABLE `tb_roles` (
  `role_id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(30) DEFAULT NULL,
  `is_admin` smallint(6) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_settings`
--

CREATE TABLE `tb_settings` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `owner` enum('account','user') DEFAULT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `profile` varchar(30) DEFAULT NULL,
  `value` json DEFAULT NULL,
  `status` int(11) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_spatial_map_themes`
--

CREATE TABLE `tb_spatial_map_themes` (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tb_tasks`
--

CREATE TABLE `tb_tasks` (
  `task_id` int(11) UNSIGNED NOT NULL,
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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_users`
--

CREATE TABLE `tb_users` (
  `user_id` int(11) UNSIGNED NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_user_privilege`
--

CREATE TABLE `tb_user_privilege` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `privilege_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_user_query`
--

CREATE TABLE `tb_user_query` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_visualizations`
--

CREATE TABLE `tb_visualizations` (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT '',
  `slug` varchar(100) DEFAULT NULL,
  `image` varchar(200) DEFAULT NULL,
  `excel_format` json DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_visualization_canvas`
--

CREATE TABLE `tb_visualization_canvas` (
  `id` int(11) UNSIGNED NOT NULL,
  `owner` enum('report','dashboard','visualization') DEFAULT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `dashboard_id` int(11) DEFAULT NULL,
  `visualization_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `format` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_visualization_dashboard_deleted`
--

CREATE TABLE `tb_visualization_dashboard_deleted` (
  `id` int(11) UNSIGNED NOT NULL,
  `dashboard_id` int(11) DEFAULT NULL,
  `visualization_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `format` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_accounts`
--
ALTER TABLE `tb_accounts`
  ADD PRIMARY KEY (`account_id`);

--
-- Indexes for table `tb_account_features`
--
ALTER TABLE `tb_account_features`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`feature_id`);

--
-- Indexes for table `tb_categories`
--
ALTER TABLE `tb_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `account_slug` (`account_id`,`slug`),
  ADD KEY `parent` (`parent`),
  ADD KEY `slug` (`slug`,`account_id`);

--
-- Indexes for table `tb_credentials`
--
ALTER TABLE `tb_credentials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`connection_name`,`type`);

--
-- Indexes for table `tb_dashboards`
--
ALTER TABLE `tb_dashboards`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_datasources`
--
ALTER TABLE `tb_datasources`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_features`
--
ALTER TABLE `tb_features`
  ADD PRIMARY KEY (`feature_id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `tb_global_filters`
--
ALTER TABLE `tb_global_filters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_index` (`account_id`,`placeholder`);

--
-- Indexes for table `tb_jobs`
--
ALTER TABLE `tb_jobs`
  ADD PRIMARY KEY (`job_id`);

--
-- Indexes for table `tb_job_contacts`
--
ALTER TABLE `tb_job_contacts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_oauth_connections`
--
ALTER TABLE `tb_oauth_connections`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_oauth_providers`
--
ALTER TABLE `tb_oauth_providers`
  ADD PRIMARY KEY (`provider_id`);

--
-- Indexes for table `tb_object_roles`
--
ALTER TABLE `tb_object_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_owner_target_cat_group` (`account_id`,`owner_id`,`owner`,`target_id`,`target`,`category_id`,`group_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `owner_id` (`owner_id`),
  ADD KEY `owner` (`owner`),
  ADD KEY `target` (`target`),
  ADD KEY `target_id` (`target_id`);

--
-- Indexes for table `tb_password_reset`
--
ALTER TABLE `tb_password_reset`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_privileges`
--
ALTER TABLE `tb_privileges`
  ADD PRIMARY KEY (`privilege_id`),
  ADD UNIQUE KEY `name` (`name`,`account_id`,`status`);

--
-- Indexes for table `tb_privileges_tree`
--
ALTER TABLE `tb_privileges_tree`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AccId_name_priviIedge_Parent` (`privilege_id`,`parent`);

--
-- Indexes for table `tb_query`
--
ALTER TABLE `tb_query`
  ADD PRIMARY KEY (`query_id`),
  ADD KEY `name` (`name`);

--
-- Indexes for table `tb_query_filters`
--
ALTER TABLE `tb_query_filters`
  ADD PRIMARY KEY (`filter_id`),
  ADD UNIQUE KEY `unique_index` (`query_id`,`placeholder`);

--
-- Indexes for table `tb_query_visualizations`
--
ALTER TABLE `tb_query_visualizations`
  ADD PRIMARY KEY (`visualization_id`);

--
-- Indexes for table `tb_query_visualizations_copy`
--
ALTER TABLE `tb_query_visualizations_copy`
  ADD PRIMARY KEY (`visualization_id`);

--
-- Indexes for table `tb_query_visualizations_copy_copy`
--
ALTER TABLE `tb_query_visualizations_copy_copy`
  ADD PRIMARY KEY (`visualization_id`);

--
-- Indexes for table `tb_roles`
--
ALTER TABLE `tb_roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tb_settings`
--
ALTER TABLE `tb_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`owner`,`profile`);

--
-- Indexes for table `tb_spatial_map_themes`
--
ALTER TABLE `tb_spatial_map_themes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_tasks`
--
ALTER TABLE `tb_tasks`
  ADD PRIMARY KEY (`task_id`);

--
-- Indexes for table `tb_users`
--
ALTER TABLE `tb_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `account_user` (`email`,`account_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `phone` (`phone`),
  ADD KEY `status` (`status`),
  ADD KEY `created_aat` (`created_at`),
  ADD KEY `first_name` (`first_name`,`middle_name`,`last_name`),
  ADD KEY `first_name_2` (`first_name`),
  ADD KEY `middle_name` (`middle_name`),
  ADD KEY `last_name` (`last_name`),
  ADD KEY `first_name_3` (`first_name`,`last_name`);

--
-- Indexes for table `tb_user_privilege`
--
ALTER TABLE `tb_user_privilege`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_user_query`
--
ALTER TABLE `tb_user_query`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_visualizations`
--
ALTER TABLE `tb_visualizations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_visualization_canvas`
--
ALTER TABLE `tb_visualization_canvas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `owner_visualization` (`owner`,`owner_id`,`visualization_id`);

--
-- Indexes for table `tb_visualization_dashboard_deleted`
--
ALTER TABLE `tb_visualization_dashboard_deleted`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dashboard_id` (`dashboard_id`,`visualization_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_accounts`
--
ALTER TABLE `tb_accounts`
  MODIFY `account_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_account_features`
--
ALTER TABLE `tb_account_features`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_categories`
--
ALTER TABLE `tb_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_credentials`
--
ALTER TABLE `tb_credentials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_dashboards`
--
ALTER TABLE `tb_dashboards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_datasources`
--
ALTER TABLE `tb_datasources`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_features`
--
ALTER TABLE `tb_features`
  MODIFY `feature_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_global_filters`
--
ALTER TABLE `tb_global_filters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_jobs`
--
ALTER TABLE `tb_jobs`
  MODIFY `job_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_job_contacts`
--
ALTER TABLE `tb_job_contacts`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_oauth_connections`
--
ALTER TABLE `tb_oauth_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_oauth_providers`
--
ALTER TABLE `tb_oauth_providers`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_object_roles`
--
ALTER TABLE `tb_object_roles`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_password_reset`
--
ALTER TABLE `tb_password_reset`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_privileges`
--
ALTER TABLE `tb_privileges`
  MODIFY `privilege_id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_privileges_tree`
--
ALTER TABLE `tb_privileges_tree`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_query`
--
ALTER TABLE `tb_query`
  MODIFY `query_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'PK';
--
-- AUTO_INCREMENT for table `tb_query_filters`
--
ALTER TABLE `tb_query_filters`
  MODIFY `filter_id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_query_visualizations`
--
ALTER TABLE `tb_query_visualizations`
  MODIFY `visualization_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_query_visualizations_copy`
--
ALTER TABLE `tb_query_visualizations_copy`
  MODIFY `visualization_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_query_visualizations_copy_copy`
--
ALTER TABLE `tb_query_visualizations_copy_copy`
  MODIFY `visualization_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_roles`
--
ALTER TABLE `tb_roles`
  MODIFY `role_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_settings`
--
ALTER TABLE `tb_settings`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_spatial_map_themes`
--
ALTER TABLE `tb_spatial_map_themes`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_tasks`
--
ALTER TABLE `tb_tasks`
  MODIFY `task_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_users`
--
ALTER TABLE `tb_users`
  MODIFY `user_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_user_privilege`
--
ALTER TABLE `tb_user_privilege`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_user_query`
--
ALTER TABLE `tb_user_query`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_visualizations`
--
ALTER TABLE `tb_visualizations`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_visualization_canvas`
--
ALTER TABLE `tb_visualization_canvas`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_visualization_dashboard_deleted`
--
ALTER TABLE `tb_visualization_dashboard_deleted`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;