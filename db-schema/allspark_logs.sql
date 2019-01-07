CREATE TABLE `tb_api_logs` (
	 `id` int(11) NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) NOT NULL,
	 `user_id` int(11) DEFAULT NULL,
	 `pathname` varchar(1000) DEFAULT NULL,
	 `query` varchar(10000) DEFAULT NULL,
	 `body` varchar(10000) DEFAULT NULL,
	 `headers` varchar(10000) DEFAULT NULL,
	 `response` varchar(10000) DEFAULT NULL,
	 `status` int(100) DEFAULT NULL,
	 `useragent` varchar(1000) DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_errors` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `account_id` int(11) NOT NULL,
	 `user_id` int(11) DEFAULT NULL,
	 `session_id` int(11) DEFAULT NULL,
	 `os` varchar(50) DEFAULT NULL,
	 `browser` varchar(50) DEFAULT NULL,
	 `user_agent` varchar(500) DEFAULT NULL,
	 `type` varchar(100) DEFAULT NULL,
	 `url` varchar(1000) DEFAULT NULL,
	 `message` varchar(1000) DEFAULT NULL,
	 `description` text,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 `status` int(11) DEFAULT NULL,
	 `creation_date` date DEFAULT NULL,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_history` (
	 `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'PK',
	 `session_id` int(11) DEFAULT NULL,
	 `account_id` int(11) DEFAULT NULL,
	 `owner` enum('query','filter','visualization','connection') DEFAULT NULL,
	 `owner_id` int(11) NOT NULL,
	 `state` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	 `ip` varchar(100) DEFAULT NULL,
	 `user_agent` mediumtext,
	 `os` varchar(500) DEFAULT NULL,
	 `browser` varchar(500) DEFAULT NULL,
	 `operation` enum('update','delete','insert') DEFAULT NULL,
	 `user_id` int(11) DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 `creation_date` date DEFAULT NULL,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_jobs_history` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `owner` varchar(40) DEFAULT NULL,
	 `owner_id` int(11) DEFAULT NULL,
	 `timing` timestamp NULL DEFAULT NULL,
	 `user_id` int(11) DEFAULT NULL,
	 `successful` int(11) DEFAULT NULL,
	 `response` text,
	 `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 `creation_date` date DEFAULT NULL,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_report_logs` (
	 `id` int(11) NOT NULL AUTO_INCREMENT,
	 `session_id` int(11) DEFAULT NULL,
	 `query_id` int(11) NOT NULL,
	 `query` text,
	 `result_query` text,
	 `type` varchar(20) DEFAULT NULL,
	 `user_id` int(11) DEFAULT NULL,
	 `response_time` float DEFAULT NULL,
	 `cache` smallint(6) DEFAULT NULL,
	 `rows` text,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `creation_date` date NOT NULL,
	 PRIMARY KEY (`id`),
	 KEY `query_id` (`query_id`),
	 KEY `user_email` (`user_id`),
	 KEY `created_at` (`created_at`),
	 KEY `id` (`id`),
	 KEY `query_id_2` (`query_id`,`created_at`),
	 KEY `session_id` (`session_id`),
	 KEY `creation_date` (`creation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tb_sessions` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `user_id` int(11) DEFAULT NULL,
	 `type` enum('login','logout') DEFAULT NULL,
	 `session_id` int(11) DEFAULT NULL,
	 `expire_time` varchar(55) DEFAULT NULL,
	 `ip` varchar(45) DEFAULT NULL,
	 `user_agent` varchar(1000) DEFAULT NULL,
	 `os` varchar(20) DEFAULT NULL,
	 `browser` varchar(20) DEFAULT NULL,
	 `description` text,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `creation_date` date DEFAULT NULL,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `tb_tests_logs` (
	 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
	 `section` varchar(100) DEFAULT NULL,
	 `test` varchar(100) DEFAULT NULL,
	 `executed_as` int(11) DEFAULT NULL,
	 `executed_by` int(11) DEFAULT NULL,
	 `time` int(20) DEFAULT NULL,
	 `result` varchar(20) DEFAULT NULL,
	 `response` text,
	 `group_id` int(11) DEFAULT NULL,
	 `scope` enum('complete','section','test') DEFAULT NULL,
	 `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	 `creation_date` date DEFAULT NULL,
	 `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;