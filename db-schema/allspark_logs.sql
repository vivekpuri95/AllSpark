--
-- Database: `allspark_logs`
--

-- --------------------------------------------------------

--
-- Table structure for table `tb_api_logs`
--

CREATE TABLE `tb_api_logs` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_errors`
--

CREATE TABLE `tb_errors` (
  `id` int(11) UNSIGNED NOT NULL,
  `account_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` int(11) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `os` varchar(50) DEFAULT NULL,
  `browser` varchar(50) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `message` varchar(1000) DEFAULT NULL,
  `description` text,
  `status` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `creation_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_history`
--

CREATE TABLE `tb_history` (
  `id` int(11) NOT NULL COMMENT 'PK',
  `session_id` int(11) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `query_id` int(11) DEFAULT NULL,
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
  `creation_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_jobs_history`
--

CREATE TABLE `tb_jobs_history` (
  `id` int(11) UNSIGNED NOT NULL,
  `owner` varchar(40) DEFAULT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `timing` timestamp NULL DEFAULT NULL,
  `user_id` int(11) NOT NULL DEFAULT '0',
  `successful` int(11) DEFAULT NULL,
  `response` text,
  `runtime` double DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `creation_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_report_logs`
--

CREATE TABLE `tb_report_logs` (
  `id` int(11) NOT NULL,
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
  `creation_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tb_sessions`
--

CREATE TABLE `tb_sessions` (
  `id` int(11) UNSIGNED NOT NULL,
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
  `creation_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `tb_tests_logs`
--

CREATE TABLE `tb_tests_logs` (
  `id` int(11) UNSIGNED NOT NULL,
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
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_api_logs`
--
ALTER TABLE `tb_api_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `status` (`status`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `pathname` (`pathname`);

--
-- Indexes for table `tb_errors`
--
ALTER TABLE `tb_errors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `url` (`url`(50),`message`(80),`description`(80)),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tb_history`
--
ALTER TABLE `tb_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `creation_date` (`creation_date`);

--
-- Indexes for table `tb_jobs_history`
--
ALTER TABLE `tb_jobs_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `owner` (`owner`,`owner_id`),
  ADD KEY `timing` (`timing`),
  ADD KEY `successful` (`successful`),
  ADD KEY `creation_date` (`creation_date`);

--
-- Indexes for table `tb_report_logs`
--
ALTER TABLE `tb_report_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `query_id` (`query_id`),
  ADD KEY `user_email` (`user_id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `id` (`id`),
  ADD KEY `query_id_2` (`query_id`,`created_at`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `creation_date` (`creation_date`);

--
-- Indexes for table `tb_sessions`
--
ALTER TABLE `tb_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `type` (`type`),
  ADD KEY `user_id_2` (`user_id`,`type`,`session_id`),
  ADD KEY `creation_date` (`creation_date`);

--
-- Indexes for table `tb_tests_logs`
--
ALTER TABLE `tb_tests_logs`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_api_logs`
--
ALTER TABLE `tb_api_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_errors`
--
ALTER TABLE `tb_errors`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_history`
--
ALTER TABLE `tb_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'PK';
--
-- AUTO_INCREMENT for table `tb_jobs_history`
--
ALTER TABLE `tb_jobs_history`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_report_logs`
--
ALTER TABLE `tb_report_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_sessions`
--
ALTER TABLE `tb_sessions`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tb_tests_logs`
--
ALTER TABLE `tb_tests_logs`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;