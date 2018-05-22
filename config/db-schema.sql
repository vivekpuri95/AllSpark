/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table tb_accounts
# ------------------------------------------------------------

CREATE TABLE `tb_accounts` (
  `account_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL DEFAULT '',
  `url` varchar(500) NOT NULL DEFAULT '',
  `icon` varchar(500) NOT NULL DEFAULT '',
  `logo` varchar(500) NOT NULL DEFAULT '',
  `auth_api` varchar(300) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `url` (`url`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;



# Dump of table tb_categories
# ------------------------------------------------------------

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
  UNIQUE KEY `account_id` (`account_id`,`name`),
  KEY `parent` (`parent`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;



# Dump of table tb_credentials
# ------------------------------------------------------------

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
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_id` (`account_id`,`connection_name`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;



# Dump of table tb_dashboards
# ------------------------------------------------------------

CREATE TABLE `tb_dashboards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  `added_by` int(11) DEFAULT NULL,
  `visibility` enum('public','private') DEFAULT 'private',
  `name` varchar(100) NOT NULL,
  `parent` int(11) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `status` smallint(6) NOT NULL DEFAULT '1',
  `roles` varchar(50) DEFAULT NULL,
  `format` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;



# Dump of table tb_datasets
# ------------------------------------------------------------

CREATE TABLE `tb_datasets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `query_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `order` int(11) DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;



# Dump of table tb_password_reset
# ------------------------------------------------------------

CREATE TABLE `tb_password_reset` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `reset_token` varchar(300) NOT NULL DEFAULT '',
  `status` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table tb_privileges
# ------------------------------------------------------------

CREATE TABLE `tb_privileges` (
  `privilege_id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `is_admin` smallint(10) NOT NULL DEFAULT '0',
  `status` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`privilege_id`),
  UNIQUE KEY `account_id` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;



# Dump of table tb_query
# ------------------------------------------------------------

CREATE TABLE `tb_query` (
  `query_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `source` enum('query','api','pg','bigquery') NOT NULL DEFAULT 'query',
  `query` varchar(25000) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `url_options` text,
  `category_id` int(11) NOT NULL COMMENT 'FK',
  `description` varchar(1024) DEFAULT NULL,
  `added_by` int(100) DEFAULT NULL,
  `requested_by` varchar(100) DEFAULT NULL,
  `tags` varchar(1024) DEFAULT NULL,
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `is_redis` varchar(10) DEFAULT '1',
  `refresh_rate` int(11) DEFAULT NULL,
  `roles` varchar(50) DEFAULT NULL,
  `format` varchar(25000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `connection_name` int(11) DEFAULT NULL,
  PRIMARY KEY (`query_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=latin1;



# Dump of table tb_query_filters
# ------------------------------------------------------------

CREATE TABLE `tb_query_filters` (
  `filter_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
  `placeholder` varchar(64) NOT NULL COMMENT '{{ backend }} , [[ frontend ]]',
  `description` varchar(64) DEFAULT NULL,
  `default_value` varchar(500) DEFAULT NULL COMMENT 'default not null to apply filter',
  `offset` int(11) DEFAULT NULL,
  `multiple` smallint(6) DEFAULT '0',
  `type_old` int(11) NOT NULL COMMENT '0-Integer, 1-String, 2-Date',
  `type` enum('number','text','date','month','hidden','column') DEFAULT 'text',
  `dataset` int(11) DEFAULT NULL,
  `is_enabled` int(11) NOT NULL DEFAULT '1',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`filter_id`),
  UNIQUE KEY `unique_index` (`query_id`,`placeholder`)
) ENGINE=InnoDB AUTO_INCREMENT=1087 DEFAULT CHARSET=latin1;



# Dump of table tb_query_visualizations
# ------------------------------------------------------------

CREATE TABLE `tb_query_visualizations` (
  `visualization_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `query_id` int(11) NOT NULL,
  `name` varchar(250) DEFAULT NULL,
  `type` enum('table','spatialmap','funnel','cohort','line','bar','area','pie','stacked','livenumber','dualaxisbar','bigtext','scatter','bubble') NOT NULL DEFAULT 'table',
  `description` varchar(1000) DEFAULT NULL,
  `options` text,
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `is_deleted` smallint(11) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`visualization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=latin1;



# Dump of table tb_roles
# ------------------------------------------------------------

CREATE TABLE `tb_roles` (
  `role_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `account_id` int(11) DEFAULT NULL,
  `name` varchar(30) DEFAULT NULL,
  `is_admin` smallint(6) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;



# Dump of table tb_settings
# ------------------------------------------------------------

CREATE TABLE `tb_settings` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `account_id` int(11) DEFAULT NULL,
  `owner` varchar(30) DEFAULT NULL,
  `profile` varchar(30) DEFAULT NULL,
  `value` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;



# Dump of table tb_tasks
# ------------------------------------------------------------

CREATE TABLE `tb_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) DEFAULT NULL,
  `har` json NOT NULL,
  `type` varchar(50) NOT NULL,
  `frequency` varchar(100) NOT NULL,
  `metadata` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  `status` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table tb_third_party_credentials
# ------------------------------------------------------------

CREATE TABLE `tb_third_party_credentials` (
  `id` int(20) NOT NULL AUTO_INCREMENT,
  `account_type` varchar(50) DEFAULT '',
  `account_id` varchar(50) DEFAULT NULL,
  `category_id` int(20) DEFAULT NULL,
  `credentials` blob,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table tb_third_party_ga
# ------------------------------------------------------------

CREATE TABLE `tb_third_party_ga` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table tb_user_dashboard
# ------------------------------------------------------------

CREATE TABLE `tb_user_dashboard` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dashboard_id` (`dashboard_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;



# Dump of table tb_user_privilege
# ------------------------------------------------------------

CREATE TABLE `tb_user_privilege` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `privilege_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;



# Dump of table tb_user_query
# ------------------------------------------------------------

CREATE TABLE `tb_user_query` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;



# Dump of table tb_user_roles
# ------------------------------------------------------------

CREATE TABLE `tb_user_roles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_user_role` (`category_id`,`user_id`,`role_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=438 DEFAULT CHARSET=latin1;



# Dump of table tb_users
# ------------------------------------------------------------

CREATE TABLE `tb_users` (
  `user_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `account_user` (`email`,`account_id`),
  KEY `account_id` (`account_id`),
  KEY `phone` (`phone`),
  KEY `status` (`status`),
  KEY `created_aat` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=447 DEFAULT CHARSET=latin1;



# Dump of table tb_visualization_dashboard
# ------------------------------------------------------------

CREATE TABLE `tb_visualization_dashboard` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_id` int(11) DEFAULT NULL,
  `visualization_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `format` varchar(3000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dashboard_id` (`dashboard_id`,`visualization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1;



# Dump of table tb_visualizations
# ------------------------------------------------------------

CREATE TABLE `tb_visualizations` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT '',
  `slug` varchar(100) DEFAULT NULL,
  `image` varchar(200) DEFAULT NULL,
  `excel_format` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=latin1;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;