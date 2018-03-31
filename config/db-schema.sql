-- phpMyAdmin SQL Dump
-- version 4.7.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 31, 2018 at 07:45 PM
-- Server version: 10.1.29-MariaDB
-- PHP Version: 7.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `allspark`
--
CREATE DATABASE IF NOT EXISTS `allspark` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `allspark`;

-- --------------------------------------------------------

--
-- Table structure for table `tb_accounts`
--

CREATE TABLE `tb_accounts` (
  `account_id` int(11) UNSIGNED NOT NULL,
  `name` varchar(30) NOT NULL DEFAULT '',
  `url` varchar(500) NOT NULL DEFAULT '',
  `icon` varchar(500) NOT NULL DEFAULT '',
  `logo` varchar(500) NOT NULL DEFAULT '',
  `status` int(11) NOT NULL DEFAULT '1',
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
  `user` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `db` varchar(100) DEFAULT NULL,
  `limit` int(11) DEFAULT NULL,
  `file` varchar(500) DEFAULT NULL,
  `project_name` varchar(50) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
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
  `name` varchar(100) NOT NULL,
  `parent` int(11) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `status` smallint(6) NOT NULL DEFAULT '1',
  `roles` varchar(50) DEFAULT NULL,
  `format` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_datasets`
--

CREATE TABLE `tb_datasets` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `query_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `is_admin` smallint(10) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_query`
--

CREATE TABLE `tb_query` (
  `query_id` int(11) NOT NULL COMMENT 'PK',
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `source` enum('query','api') NOT NULL DEFAULT 'query',
  `query` varchar(25000) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `url_options` text,
  `category_id` int(11) NOT NULL COMMENT 'FK',
  `description` varchar(1024) DEFAULT NULL,
  `added_by` varchar(100) NOT NULL,
  `requested_by` varchar(100) DEFAULT NULL,
  `tags` varchar(1024) DEFAULT NULL,
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `is_redis` int(2) DEFAULT '1',
  `refresh_rate` int(11) DEFAULT NULL,
  `roles` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `connection_name` varchar(50) DEFAULT 'analytics'
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
  `default_value` varchar(64) DEFAULT NULL COMMENT 'default not null to apply filter',
  `offset` int(11) DEFAULT NULL,
  `type` int(11) NOT NULL COMMENT '0-Integer, 1-String, 2-Date',
  `dataset` int(50) DEFAULT NULL,
  `multiple` tinyint(1) NOT NULL DEFAULT '0',
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
  `type` enum('table','spatialmap','funnel','cohort','line','bar','area','stacked') NOT NULL DEFAULT 'table',
  `options` text,
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `is_deleted` smallint(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_report_logs`
--

CREATE TABLE `tb_report_logs` (
  `id` int(11) NOT NULL,
  `user_email` varchar(100) DEFAULT '',
  `query_id` int(11) NOT NULL,
  `response_time` float DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'IST'
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
  `owner` varchar(30) DEFAULT NULL,
  `profile` varchar(30) DEFAULT NULL,
  `value` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_third_party_credentials`
--

CREATE TABLE `tb_third_party_credentials` (
  `id` int(20) NOT NULL,
  `account_type` varchar(50) DEFAULT '',
  `account_id` varchar(50) DEFAULT NULL,
  `category_id` int(20) DEFAULT NULL,
  `credentials` blob,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_users`
--

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
-- Table structure for table `tb_user_roles`
--

CREATE TABLE `tb_user_roles` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_accounts`
--
ALTER TABLE `tb_accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `url` (`url`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `tb_categories`
--
ALTER TABLE `tb_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `account_id` (`account_id`,`name`),
  ADD KEY `parent` (`parent`);

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
-- Indexes for table `tb_datasets`
--
ALTER TABLE `tb_datasets`
  ADD PRIMARY KEY (`id`);

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
  ADD UNIQUE KEY `account_id` (`name`);

--
-- Indexes for table `tb_query`
--
ALTER TABLE `tb_query`
  ADD PRIMARY KEY (`query_id`);

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
-- Indexes for table `tb_report_logs`
--
ALTER TABLE `tb_report_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `query_id` (`query_id`),
  ADD KEY `user_email` (`user_email`),
  ADD KEY `created_at` (`created_at`);

--
-- Indexes for table `tb_roles`
--
ALTER TABLE `tb_roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tb_settings`
--
ALTER TABLE `tb_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_third_party_credentials`
--
ALTER TABLE `tb_third_party_credentials`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_users`
--
ALTER TABLE `tb_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `account_user` (`email`,`account_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `phone` (`phone`),
  ADD KEY `status` (`status`),
  ADD KEY `created_aat` (`created_at`);

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
-- Indexes for table `tb_user_roles`
--
ALTER TABLE `tb_user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id_2` (`user_id`,`role_id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_accounts`
--
ALTER TABLE `tb_accounts`
  MODIFY `account_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `tb_datasets`
--
ALTER TABLE `tb_datasets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `tb_report_logs`
--
ALTER TABLE `tb_report_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `tb_third_party_credentials`
--
ALTER TABLE `tb_third_party_credentials`
  MODIFY `id` int(20) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `tb_user_roles`
--
ALTER TABLE `tb_user_roles`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
