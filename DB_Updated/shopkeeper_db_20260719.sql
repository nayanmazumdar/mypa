-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: shopkeeper_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,2,1,'Groceries','Daily grocery items','2026-07-17 19:29:41'),(2,2,1,'Beverages','Drinks and beverages','2026-07-17 19:29:41'),(3,2,1,'Snacks','Packaged snacks and chips','2026-07-17 19:29:41'),(4,2,1,'Personal Care','Soaps, shampoos, hygiene','2026-07-17 19:29:41'),(5,2,1,'Dairy','Milk, curd, cheese products','2026-07-17 19:29:41'),(6,2,1,'Stationery','Pens, notebooks, office supplies','2026-07-17 19:29:41'),(7,2,1,'Household','Cleaning and household items','2026-07-17 19:29:41'),(8,1,1,'Vegetables',NULL,'2026-07-19 04:24:31'),(9,1,1,'Fresh Fruits',NULL,'2026-07-19 04:24:31'),(10,1,1,'Dry Fruits',NULL,'2026-07-19 04:24:31'),(11,1,1,'Miscellaneous',NULL,'2026-07-19 04:26:31');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_ledger`
--

DROP TABLE IF EXISTS `customer_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `shop_id` int NOT NULL,
  `type` enum('credit','payment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `shop_id` (`shop_id`),
  CONSTRAINT `customer_ledger_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_ledger_ibfk_2` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_ledger`
--

LOCK TABLES `customer_ledger` WRITE;
/*!40000 ALTER TABLE `customer_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `balance` decimal(10,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'18c0abaa-05b3-41b6-80f9-ee1da5e41976',2,1,'Rajesh Kumar','rajesh@email.com','9811111111','12 MG Road, Delhi',0.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(2,'ebbc3217-c152-411f-b3f9-5109aacc78ce',2,1,'Priya Sharma','priya@email.com','9822222222','45 Ring Road, Mumbai',500.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(3,'612852c1-f501-4b0b-8019-8c286e654775',2,1,'Amit Patel','amit@email.com','9833333333','78 Station Road, Ahmedabad',0.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(4,'ec316c13-9154-4b36-a49d-d190100d54e4',2,1,'Sunita Verma',NULL,'9844444444','23 Market Lane, Jaipur',250.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(5,'1bc40f24-2aeb-4e85-88b7-fa0cca0c4455',2,1,'Vikas Singh','vikas@email.com','9855555555','56 Gandhi Nagar, Lucknow',0.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(6,'b3ba6966-dabc-4cb4-9566-ff4d3fa2c5eb',1,1,'cb',NULL,NULL,NULL,0.00,NULL,1,'2026-07-17 19:39:15','2026-07-17 19:39:15'),(7,'979691d6-c56f-4611-9840-124aabad5731',1,1,'test',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 04:25:02','2026-07-18 04:25:02'),(9,'8ee3c01e-2a5c-4388-be31-e75fa489cbf4',1,1,'Nayan',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 20:45:24','2026-07-18 20:45:24'),(10,'134f9131-9e9e-4d92-9775-909b51dadf20',1,1,'vh',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 21:17:39','2026-07-18 21:17:39'),(11,'54a3a6a1-13cd-4564-9375-ce2a626e07b2',1,1,'uk',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 21:18:12','2026-07-18 21:18:12'),(12,'8a10ee09-1f44-4907-82a1-283381dad7f2',1,1,'ghg',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 21:22:00','2026-07-18 21:22:00'),(13,'1dc1b08b-83ec-41dc-8943-b68436f38aab',1,1,'try',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 21:35:35','2026-07-18 21:35:35'),(14,'27055bd1-84da-450f-81de-f2024b39a3e9',1,1,'ty',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 22:26:49','2026-07-18 22:26:49'),(15,'4cc9163d-2f3b-4a64-8590-95e0df1ce83a',1,1,'hy',NULL,NULL,NULL,0.00,NULL,1,'2026-07-18 22:27:29','2026-07-18 22:27:29'),(16,'6828e624-1d75-4a3c-b47d-6712a05533b6',1,1,'sd',NULL,NULL,NULL,0.00,NULL,1,'2026-07-19 04:36:13','2026-07-19 04:36:13'),(17,'f7b5ce21-4691-46f6-b5ab-8737cfe3c71a',1,1,'Nayanjyoti Mazumdar',NULL,NULL,NULL,0.00,NULL,1,'2026-07-19 04:36:32','2026-07-19 04:36:32');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_summary`
--

DROP TABLE IF EXISTS `daily_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_summary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `summary_date` date NOT NULL,
  `total_sales` decimal(12,2) DEFAULT '0.00',
  `total_transactions` int DEFAULT '0',
  `total_expenses` decimal(12,2) DEFAULT '0.00',
  `total_purchases` decimal(12,2) DEFAULT '0.00',
  `net_profit` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`summary_date`),
  CONSTRAINT `daily_summary_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_summary`
--

LOCK TABLES `daily_summary` WRITE;
/*!40000 ALTER TABLE `daily_summary` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_summary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','upi','bank_transfer') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `expense_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `min_stock_level` decimal(10,2) DEFAULT '0.00',
  `max_stock_level` decimal(10,2) DEFAULT '0.00',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_user` (`product_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (1,1,2,1,47.00,10.00,150.00,NULL,'2026-07-19 09:12:35'),(2,2,2,1,100.00,5.00,75.00,NULL,'2026-07-19 11:51:03'),(3,3,2,1,29.00,5.00,90.00,NULL,'2026-07-19 08:23:43'),(4,4,2,1,7.00,10.00,120.00,NULL,'2026-07-19 12:40:37'),(5,5,2,1,1.00,3.00,45.00,NULL,'2026-07-19 12:15:00'),(6,6,2,1,54.00,12.00,180.00,NULL,'2026-07-19 06:50:46'),(7,7,2,1,79.00,15.00,240.00,NULL,'2026-07-19 06:52:46'),(8,8,2,1,24.00,6.00,72.00,NULL,'2026-07-17 19:29:42'),(9,9,2,1,88.00,20.00,300.00,NULL,'2026-07-19 10:57:50'),(10,10,2,1,89.00,20.00,270.00,NULL,'2026-07-19 08:34:38'),(11,11,2,1,69.00,15.00,210.00,NULL,'2026-07-19 08:49:28'),(12,12,2,1,35.00,10.00,105.00,NULL,'2026-07-17 19:29:42'),(13,13,2,1,44.00,10.00,135.00,NULL,'2026-07-19 08:23:43'),(14,14,2,1,0.00,5.00,60.00,NULL,'2026-07-19 12:12:01'),(15,15,2,1,19.00,8.00,90.00,NULL,'2026-07-19 12:41:19'),(16,16,2,1,19.00,20.00,150.00,NULL,'2026-07-19 10:31:31'),(17,17,2,1,18.00,5.00,75.00,NULL,'2026-07-19 09:41:22'),(18,18,2,1,19.00,10.00,60.00,NULL,'2026-07-19 06:52:46'),(19,19,2,1,100.00,20.00,300.00,NULL,'2026-07-17 19:29:42'),(20,20,2,1,40.00,10.00,120.00,NULL,'2026-07-17 19:29:42');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offer_products`
--

DROP TABLE IF EXISTS `offer_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `offer_id` int NOT NULL,
  `product_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_offer_product` (`offer_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `offer_products_ibfk_1` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_products_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer_products`
--

LOCK TABLES `offer_products` WRITE;
/*!40000 ALTER TABLE `offer_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `offer_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offers`
--

DROP TABLE IF EXISTS `offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_id` int NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `discount_type` enum('percentage','flat') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `min_purchase_amount` decimal(10,2) DEFAULT '0.00',
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `applicable_to` enum('all','category','product') COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `category_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_paused` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `shop_id` (`shop_id`),
  KEY `category_id` (`category_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `offers_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offers_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `offers_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offers`
--

LOCK TABLES `offers` WRITE;
/*!40000 ALTER TABLE `offers` DISABLE KEYS */;
INSERT INTO `offers` VALUES (1,1,'Bumper','Pooja n Diwali Offers','percentage',2.00,0.00,NULL,'category',2,NULL,'2026-07-18','2026-07-19',1,'2026-07-18 20:44:06','2026-07-18 20:44:06',0);
/*!40000 ALTER TABLE `offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `reference_type` enum('sale','purchase','pos') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','upi','bank_transfer') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,2,1,'sale',1,294.00,'cash',NULL,'2026-07-17 19:29:42'),(2,2,1,'sale',2,567.00,'upi',NULL,'2026-07-17 19:29:42'),(3,2,1,'sale',3,106.40,'cash',NULL,'2026-07-17 19:29:42'),(4,2,1,'sale',5,162.75,'card',NULL,'2026-07-17 19:29:42'),(5,2,1,'purchase',1,5250.00,'bank_transfer',NULL,'2026-07-17 19:29:42'),(6,2,1,'purchase',2,2300.00,'upi',NULL,'2026-07-17 19:29:42'),(7,1,1,'sale',4,400.00,'upi',NULL,'2026-07-18 21:10:52'),(8,1,1,'sale',4,400.00,'cash',NULL,'2026-07-18 21:12:04'),(9,1,1,'pos',7,100.00,'cash',NULL,'2026-07-18 21:33:19'),(10,1,1,'pos',7,100.00,'cash',NULL,'2026-07-18 21:34:14'),(11,1,1,'pos',8,120.00,'cash',NULL,'2026-07-18 21:35:51'),(12,1,1,'pos',8,50.00,'cash',NULL,'2026-07-18 21:41:25'),(13,1,1,'pos',7,28.00,'cash',NULL,'2026-07-18 21:43:13'),(14,1,1,'pos',3,120.00,'cash',NULL,'2026-07-18 21:45:45'),(15,1,1,'pos',3,100.00,'cash',NULL,'2026-07-18 21:46:14'),(16,1,1,'pos',8,1.00,'cash',NULL,'2026-07-18 21:50:06'),(17,1,1,'pos',6,12.00,'cash',NULL,'2026-07-18 21:54:11'),(18,1,1,'pos',6,97.60,'cash',NULL,'2026-07-18 22:02:08'),(19,1,1,'pos',4,50.00,'cash',NULL,'2026-07-18 22:26:00'),(20,1,1,'pos',4,50.00,'card',NULL,'2026-07-18 22:31:10'),(21,1,1,'pos',4,100.00,'card',NULL,'2026-07-18 22:33:07'),(22,1,1,'pos',3,180.00,'cash',NULL,'2026-07-18 22:34:03'),(23,1,1,'pos',15,50.00,'cash',NULL,'2026-07-19 05:44:40'),(24,1,1,'pos',4,28.00,'cash',NULL,'2026-07-19 07:14:07'),(25,1,1,'pos',3,1000.00,'cash',NULL,'2026-07-19 07:14:15');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_budgets`
--

DROP TABLE IF EXISTS `personal_budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `budget_period` int NOT NULL DEFAULT '0',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `monthly_limit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_period_category` (`user_id`,`budget_period`,`category`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_budget_period` (`budget_period`),
  CONSTRAINT `personal_budgets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_budgets`
--

LOCK TABLES `personal_budgets` WRITE;
/*!40000 ALTER TABLE `personal_budgets` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_expenses`
--

DROP TABLE IF EXISTS `personal_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','upi','bank_transfer','other') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `expense_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `personal_expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_expenses`
--

LOCK TABLES `personal_expenses` WRITE;
/*!40000 ALTER TABLE `personal_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_incomes`
--

DROP TABLE IF EXISTS `personal_incomes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_incomes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `source` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','upi','bank_transfer','other') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `income_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `personal_incomes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_incomes`
--

LOCK TABLES `personal_incomes` WRITE;
/*!40000 ALTER TABLE `personal_incomes` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_incomes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_notes`
--

DROP TABLE IF EXISTS `personal_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Untitled',
  `content` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'yellow',
  `pinned` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `visible` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `personal_notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_notes`
--

LOCK TABLES `personal_notes` WRITE;
/*!40000 ALTER TABLE `personal_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_tasks`
--

DROP TABLE IF EXISTS `personal_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `priority` enum('low','medium','high') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `status` enum('pending','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `personal_tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_tasks`
--

LOCK TABLES `personal_tasks` WRITE;
/*!40000 ALTER TABLE `personal_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_returns`
--

DROP TABLE IF EXISTS `pos_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shop_id` int NOT NULL,
  `user_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('return','exchange') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'return',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `total_refund` decimal(10,2) NOT NULL DEFAULT '0.00',
  `items_json` json DEFAULT NULL,
  `status` enum('completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `idx_shop_date` (`shop_id`,`created_at`),
  CONSTRAINT `pos_returns_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_returns_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `pos_returns_ibfk_3` FOREIGN KEY (`transaction_id`) REFERENCES `pos_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_returns`
--

LOCK TABLES `pos_returns` WRITE;
/*!40000 ALTER TABLE `pos_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `pos_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_transaction_items`
--

DROP TABLE IF EXISTS `pos_transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_transaction_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `cgst` decimal(10,2) DEFAULT '0.00',
  `sgst` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `pos_transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `pos_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transaction_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_transaction_items`
--

LOCK TABLES `pos_transaction_items` WRITE;
/*!40000 ALTER TABLE `pos_transaction_items` DISABLE KEYS */;
INSERT INTO `pos_transaction_items` VALUES (1,1,9,'Bisleri Water 1L',3.000,'bottle',19.60,58.80,0.00,0.00),(2,1,6,'Coca-Cola 2L',2.000,'bottle',88.20,176.40,0.00,0.00),(3,2,2,'Aashirvaad Atta 5kg',3.000,'packet',280.00,840.00,0.00,0.00),(4,2,17,'Amul Butter 100g',3.000,'packet',57.00,171.00,0.00,0.00),(5,3,2,'Aashirvaad Atta 5kg',5.000,'packet',280.00,1400.00,0.00,0.00),(6,4,17,'Amul Butter 100g',4.000,'packet',57.00,228.00,0.00,0.00),(7,5,17,'Amul Butter 100g',4.000,'packet',57.00,228.00,0.00,0.00),(8,5,16,'Amul Milk 500ml',3.000,'packet',30.00,90.00,0.00,0.00),(9,6,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(10,6,16,'Amul Milk 500ml',3.000,'packet',30.00,90.00,0.00,0.00),(11,7,17,'Amul Butter 100g',4.000,'packet',57.00,228.00,0.00,0.00),(12,8,17,'Amul Butter 100g',3.000,'packet',57.00,171.00,0.00,0.00),(13,9,17,'Amul Butter 100g',4.000,'packet',57.00,228.00,0.00,0.00),(14,10,16,'Amul Milk 500ml',4.000,'packet',30.00,120.00,0.00,0.00),(15,11,17,'Amul Butter 100g',1.000,'packet',57.00,57.00,0.00,0.00),(16,11,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(17,11,9,'Bisleri Water 1L',3.000,'bottle',19.60,58.80,0.00,0.00),(18,12,17,'Amul Butter 100g',1.000,'packet',57.00,57.00,0.00,0.00),(19,12,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(20,12,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,0.00,0.00),(21,13,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(22,13,5,'Basmati Rice 5kg',2.000,'packet',450.00,900.00,0.00,0.00),(23,13,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(24,14,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(25,14,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(26,14,6,'Coca-Cola 2L',1.000,'bottle',88.20,88.20,0.00,0.00),(27,15,6,'Coca-Cola 2L',1.000,'bottle',88.20,88.20,0.00,0.00),(28,15,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(29,16,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(30,16,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(31,16,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(32,16,6,'Coca-Cola 2L',1.000,'bottle',88.20,88.20,0.00,0.00),(33,17,17,'Amul Butter 100g',1.000,'packet',57.00,57.00,0.00,0.00),(34,17,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(35,17,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,0.00,0.00),(36,17,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(37,18,6,'Coca-Cola 2L',1.000,'bottle',88.20,88.20,0.00,0.00),(38,19,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(39,20,9,'Bisleri Water 1L',1.000,'bottle',19.60,19.60,0.00,0.00),(40,21,18,'Mother Dairy Curd 400g',1.000,'piece',45.00,45.00,0.00,0.00),(41,21,7,'Parle Frooti 600ml',1.000,'bottle',34.30,34.30,0.00,0.00),(42,22,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(43,22,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(44,23,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,0.00,0.00),(45,23,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(46,24,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,6.67,6.67),(47,24,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,10.71,10.71),(48,25,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,1.36,1.36),(49,25,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,10.71,10.71),(50,26,13,'Dove Soap 100g',1.000,'piece',58.00,58.00,3.48,3.48),(51,26,3,'Fortune Sunflower Oil 1L',1.000,'bottle',155.00,155.00,3.88,3.88),(52,27,1,'Test',1.000,'piece',100.00,100.00,5.00,5.00),(53,28,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,1.50,1.50),(54,28,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,11.25,11.25),(55,29,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(56,30,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,1.50,1.50),(57,31,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(58,31,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(59,32,16,'Amul Milk 500ml',2.000,'packet',30.00,60.00,2.73,2.73),(60,33,16,'Amul Milk 500ml',2.000,'packet',30.00,60.00,2.73,2.73),(61,34,10,'Lays Classic Salted',1.000,'packet',20.00,20.00,1.07,1.07),(62,35,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,1.36,1.36),(63,36,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(64,37,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.00,0.00),(65,38,11,'Kurkure Masala Munch',1.000,'packet',20.00,20.00,1.20,1.20),(66,39,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.75,0.75),(67,40,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(68,41,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(69,42,5,'Basmati Rice 5kg',1.000,'packet',450.00,450.00,11.25,11.25),(70,43,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(71,44,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(72,45,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(73,46,1,'Test Item',1.000,'piece',30.00,30.00,0.00,0.00),(74,47,1,'Tata Salt',1.000,'piece',30.00,30.00,0.71,0.71),(75,48,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.71,0.71),(76,49,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,6.67,6.67),(77,50,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(78,51,17,'Amul Butter 100g',1.000,'packet',57.00,57.00,3.42,3.42),(79,52,17,'Amul Butter 100g',1.000,'packet',57.00,57.00,1.43,1.43),(80,53,16,'Amul Milk 500ml',1.000,'packet',30.00,30.00,0.75,0.75),(81,53,5,'Basmati Rice 5kg',4.000,'packet',450.00,1800.00,45.00,45.00),(82,54,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,7.00,7.00),(83,55,5,'Basmati Rice 5kg',2.000,'packet',450.00,900.00,0.00,0.00),(84,56,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(85,57,2,'Aashirvaad Atta 5kg',1.000,'packet',280.00,280.00,0.00,0.00),(86,58,14,'Head & Shoulders 180ml',19.000,'bottle',199.00,3781.00,0.00,0.00),(87,59,14,'Head & Shoulders 180ml',1.000,'bottle',199.00,199.00,0.00,0.00),(88,60,5,'Basmati Rice 5kg',9.000,'packet',450.00,4050.00,0.00,0.00),(89,61,4,'Toor Dal 1kg',33.000,'packet',140.00,4620.00,0.00,0.00),(90,63,15,'Colgate MaxFresh 150g',11.000,'piece',110.00,1210.00,0.00,0.00);
/*!40000 ALTER TABLE `pos_transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_transactions`
--

DROP TABLE IF EXISTS `pos_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `biller_id` int DEFAULT NULL,
  `shop_id` int DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cgst_amount` decimal(10,2) DEFAULT '0.00',
  `sgst_amount` decimal(10,2) DEFAULT '0.00',
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `amount_received` decimal(10,2) DEFAULT '0.00',
  `change_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'completed',
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `payments_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  KEY `customer_id` (`customer_id`),
  KEY `fk_pos_biller` (`biller_id`),
  CONSTRAINT `fk_pos_biller` FOREIGN KEY (`biller_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pos_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transactions_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_transactions`
--

LOCK TABLES `pos_transactions` WRITE;
/*!40000 ALTER TABLE `pos_transactions` DISABLE KEYS */;
INSERT INTO `pos_transactions` VALUES (1,'260718204530-27N',1,1,1,'Nayan',9,235.20,0.00,235.20,0.00,0.00,'credit',235.20,0.00,'completed','RCP-20260718-I86H','2026-07-18 20:45:30',NULL),(2,'260718205253-I0M',1,1,1,'hjh',NULL,1011.00,0.00,1011.00,0.00,0.00,'cash',1011.00,0.00,'completed','RCP-20260718-7LLV','2026-07-18 20:52:53',NULL),(3,'260718211234-9EW',1,1,1,'Nayan',9,1400.00,0.00,1400.00,0.00,0.00,'cash',1400.00,0.00,'completed','RCP-20260718-53OG','2026-07-18 21:12:34',NULL),(4,'260718211510-ASX',1,1,1,'Nayan',9,228.00,0.00,228.00,0.00,0.00,'cash',228.00,0.00,'completed','RCP-20260718-TI9K','2026-07-18 21:15:10',NULL),(5,'260718211742-COS',1,1,1,'vh',10,318.00,0.00,318.00,0.00,0.00,'cash',318.00,0.00,'completed','RCP-20260718-4DOD','2026-07-18 21:17:42',NULL),(6,'260718211815-838',1,1,1,'uk',11,109.60,0.00,109.60,0.00,0.00,'cash',109.60,0.00,'completed','RCP-20260718-V9Q0','2026-07-18 21:18:15',NULL),(7,'260718212202-V9T',1,1,1,'ghg',12,228.00,0.00,228.00,0.00,0.00,'cash',228.00,0.00,'completed','RCP-20260718-KP6B','2026-07-18 21:22:02',NULL),(8,'260718213538-9RN',1,1,1,'try',13,171.00,0.00,171.00,0.00,0.00,'cash',171.00,0.00,'completed','RCP-20260718-W5LW','2026-07-18 21:35:38',NULL),(9,'260718222650-OZE',1,1,1,'ty',14,228.00,0.00,228.00,0.00,0.00,'upi',228.00,0.00,'completed','RCP-20260718-3COT','2026-07-18 22:26:50',NULL),(10,'260718222734-1Y1',1,1,1,'hy',15,120.00,0.00,120.00,0.00,0.00,'upi',120.00,0.00,'completed','RCP-20260718-K2SP','2026-07-18 22:27:34',NULL),(11,'260719043633-TAJ',1,1,1,'Nayanjyoti Mazumdar',17,145.80,0.00,145.80,0.00,0.00,'cash',145.80,0.00,'completed','RCP-20260719-6E5V','2026-07-19 04:36:33',NULL),(12,'260719051159-F4Z',5,5,1,'Nayanjyoti Mazumdar',17,537.00,0.00,537.00,0.00,0.00,'card',537.00,0.00,'completed','RCP-20260719-7Z1R','2026-07-19 05:11:59',NULL),(13,'260719051212-26C',5,5,1,'Nayan',9,1210.00,0.00,1210.00,0.00,0.00,'cash',1210.00,0.00,'completed','RCP-20260719-GR84','2026-07-19 05:12:12',NULL),(14,'260719051225-NDU',5,5,1,'ee',NULL,137.80,0.00,137.80,0.00,0.00,'upi',137.80,0.00,'completed','RCP-20260719-S4KQ','2026-07-19 05:12:25',NULL),(15,'260719051250-YR0',5,5,1,'Nayanjyoti Mazumdar',17,107.80,0.00,107.80,0.00,0.00,'credit',107.80,0.00,'completed','RCP-20260719-VASO','2026-07-19 05:12:50',NULL),(16,'260719064501-2VY',5,5,1,'fs',NULL,417.80,0.00,417.80,0.00,0.00,'cash',417.80,0.00,'completed','RCP-20260719-NSX6','2026-07-19 06:45:02',NULL),(17,'260719065004-MGX',5,5,1,NULL,NULL,806.60,-0.40,807.00,0.00,0.00,'cash',807.00,0.00,'completed','RCP-20260719-VH5U','2026-07-19 06:50:04',NULL),(18,'260719065046-AMT',5,5,1,NULL,NULL,88.20,0.20,88.00,0.00,0.00,'cash',88.00,0.00,'completed','RCP-20260719-4GMZ','2026-07-19 06:50:46',NULL),(19,'260719065111-IUX',5,5,1,NULL,NULL,19.60,-0.40,20.00,0.00,0.00,'cash',20.00,0.00,'completed','RCP-20260719-37YZ','2026-07-19 06:51:11',NULL),(20,'260719065151-BH6',5,5,1,NULL,NULL,19.60,0.00,19.60,0.00,0.00,'cash',19.60,0.00,'completed','RCP-20260719-UHTW','2026-07-19 06:51:51',NULL),(21,'260719065246-X03',5,5,1,NULL,NULL,79.30,0.00,79.30,0.00,0.00,'cash',79.30,0.00,'completed','RCP-20260719-59WC','2026-07-19 06:52:46',NULL),(22,'260719080138-XBD',1,1,1,NULL,NULL,310.00,0.00,310.00,0.00,0.00,'cash',310.00,0.00,'completed','RCP-20260719-JVPM','2026-07-19 08:01:38',NULL),(23,'260719080246-W87',1,1,1,NULL,NULL,480.00,0.00,480.00,0.00,0.00,'cash',480.00,0.00,'completed','RCP-20260719-9F8L','2026-07-19 08:02:46',NULL),(24,'260719081141-USB',1,1,1,NULL,NULL,730.00,0.00,730.00,17.38,17.38,'cash',730.00,0.00,'completed','RCP-20260719-40JX','2026-07-19 08:11:41',NULL),(25,'260719082303-D36',1,1,1,'sscfffsf',NULL,480.00,0.00,480.00,12.07,12.07,'upi',480.00,0.00,'completed','RCP-20260719-EFR1','2026-07-19 08:23:03',NULL),(26,'260719082342-9KA',1,1,1,'gg',NULL,213.00,0.00,227.72,7.36,7.36,'cash',213.00,0.00,'completed','RCP-20260719-FIOD','2026-07-19 08:23:42',NULL),(27,'80fa7fe2-a8bc-4145-ae61-2192c7be7486',1,1,1,NULL,NULL,100.00,0.00,110.00,5.00,5.00,'cash',100.00,0.00,'completed','RCP-20260719-CSN4','2026-07-19 08:24:42',NULL),(28,'260719082536-A36',1,1,1,'xxxx',NULL,480.00,0.00,505.50,12.75,12.75,'cash',480.00,0.00,'completed','RCP-20260719-DKA7','2026-07-19 08:25:36',NULL),(29,'260719082603-3MS',1,1,1,'scssc',NULL,280.00,0.00,294.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-10K5','2026-07-19 08:26:03',NULL),(30,'990d99a2-40a6-4a1a-93fa-be279024e421',1,1,1,'ewewe',NULL,30.00,0.00,33.00,1.50,1.50,'cash',30.00,0.00,'completed','RCP-20260719-0LN4','2026-07-19 08:29:17',NULL),(31,'9f36fb49-ce42-48ba-9eb6-ea8c735b7a5b',1,1,1,'rwr',NULL,310.00,0.00,310.00,0.00,0.00,'cash',310.00,0.00,'completed','RCP-20260719-VZ8P','2026-07-19 08:31:01',NULL),(32,'1230c143-584e-4da4-a0c0-bd8a790f6b81',1,1,1,'rwr',NULL,60.00,0.00,60.00,2.73,2.73,'cash',60.00,0.00,'completed','RCP-20260719-PFDG','2026-07-19 08:31:42',NULL),(33,'8f52723f-cd0e-4519-8bc2-a2323a7464ba',1,1,1,'ete',NULL,60.00,0.00,60.00,2.73,2.73,'cash',60.00,0.00,'completed','RCP-20260719-Z0K1','2026-07-19 08:32:35',NULL),(34,'652823aa-33d2-452a-a398-d5ccee22d80c',1,1,1,NULL,NULL,20.00,0.00,20.00,1.07,1.07,'cash',20.00,0.00,'completed','RCP-20260719-5ZOP','2026-07-19 08:34:38',NULL),(35,'417a8d29-0b2e-433c-8c2e-4e953826d0cf',1,1,1,NULL,NULL,30.00,0.00,30.00,1.36,1.36,'cash',30.00,0.00,'completed','RCP-20260719-Q1K7','2026-07-19 08:37:45',NULL),(36,'b44d2910-c43e-4273-957a-ec9f203afb6b',1,1,1,NULL,NULL,30.00,0.00,30.00,0.00,0.00,'cash',30.00,0.00,'completed','RCP-20260719-LV7S','2026-07-19 08:47:43',NULL),(37,'260719084433-NFN',1,1,1,NULL,NULL,30.00,0.00,30.00,0.00,0.00,'cash',30.00,0.00,'completed','RCP-20260719-JCTQ','2026-07-19 08:49:28',NULL),(38,'260719084539-TAN',1,1,1,NULL,NULL,20.00,0.00,20.00,1.20,1.20,'cash',20.00,0.00,'completed','RCP-20260719-MT2Z','2026-07-19 08:49:28',NULL),(39,'4f443ec3-8605-4d75-b6e8-1497cc8ac024',1,1,1,NULL,NULL,30.00,0.00,30.00,0.75,0.75,'cash',30.00,0.00,'completed','RCP-20260719-IZSC','2026-07-19 08:49:59',NULL),(40,'38e7b4f5-c127-4cf3-b274-516e6dd0cad9',1,1,1,NULL,NULL,280.00,0.00,280.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-AZKV','2026-07-19 08:52:44',NULL),(41,'ead4d2d4-7202-4fe8-bc46-4b5e299a714b',1,1,1,NULL,NULL,280.00,0.00,280.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-TY79','2026-07-19 08:53:35',NULL),(42,'514b481e-d7e5-43f4-83c7-d4729bb2be1a',1,1,1,NULL,NULL,450.00,0.00,450.00,11.25,11.25,'cash',450.00,0.00,'completed','RCP-20260719-DAM0','2026-07-19 08:55:46',NULL),(43,'b8e376cc-6247-40bd-bb96-e2555f504f1b',1,1,1,'dd',NULL,280.00,0.00,280.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-5RDP','2026-07-19 08:56:39',NULL),(44,'c4177b52-8e10-4f0a-837b-48746f5f3cbb',1,1,1,NULL,NULL,280.00,0.00,280.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-GKYG','2026-07-19 08:57:48',NULL),(45,'7141a667-f4fc-439f-86b8-97244642aa87',1,1,1,'dsgdsg',NULL,280.00,0.00,280.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-JSX8','2026-07-19 08:58:37',NULL),(46,'51107440-9853-490d-849f-44ec0a5dafc3',1,1,1,NULL,NULL,30.00,0.00,30.00,0.00,0.00,'cash',35.00,5.00,'completed','RCP-20260719-95WT','2026-07-19 09:10:32',NULL),(47,'dfc493a8-fe06-4fc2-9956-ce8ae7dff68d',1,1,1,NULL,NULL,30.00,0.00,30.00,0.71,0.71,'cash',35.00,5.00,'completed','RCP-20260719-YITE','2026-07-19 09:12:35',NULL),(48,'286d1b5d-1703-40f4-9bec-037821c37fe3',1,1,1,NULL,NULL,30.00,0.00,30.00,0.71,0.71,'cash',30.00,0.00,'completed','RCP-20260719-Q7O6','2026-07-19 09:13:53',NULL),(49,'a32845ad-c7f2-4af4-94d7-8ab29206fdde',1,1,1,NULL,NULL,280.00,0.00,280.00,6.67,6.67,'cash',280.00,0.00,'completed','RCP-20260719-7VI0','2026-07-19 09:16:34',NULL),(50,'ce00172f-42a9-490f-a8e0-e3fb6facbe0a',1,1,1,NULL,NULL,280.00,0.00,294.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-E0HN','2026-07-19 09:17:58',NULL),(51,'381bb9ea-19c1-44c4-9622-4e2005d926cc',1,1,1,'asd',NULL,57.00,0.00,63.84,3.42,3.42,'cash',57.00,0.00,'completed','RCP-20260719-HPBF','2026-07-19 09:38:24',NULL),(52,'2843f65b-cdab-4a74-abf9-37234dd88ea4',1,1,1,NULL,NULL,57.00,0.00,59.86,1.43,1.43,'cash',57.00,0.00,'completed','RCP-20260719-DTZK','2026-07-19 09:41:22',NULL),(53,'a3112c0f-eb7b-4720-9fb0-f57a8364936c',1,1,1,NULL,NULL,1830.00,0.00,1921.50,45.75,45.75,'cash',1830.00,0.00,'completed','RCP-20260719-X1AZ','2026-07-19 10:31:31',NULL),(54,'4c08181e-b5f7-4eba-a38e-c1775534f65b',1,1,1,NULL,NULL,280.00,0.00,294.00,7.00,7.00,'cash',280.00,0.00,'completed','RCP-20260719-TGF4','2026-07-19 11:00:23',NULL),(55,'12d0bd13-1ee0-4541-9582-62169dc6426a',1,1,1,NULL,NULL,900.00,0.00,900.00,0.00,0.00,'cash',900.00,0.00,'completed','RCP-20260719-DJBC','2026-07-19 11:15:32',NULL),(56,'a116ff0a-14e4-4314-b0e0-5bb8f3a7c961',1,1,1,'asas',NULL,280.00,0.00,280.00,0.00,0.00,'cash',280.00,0.00,'completed','RCP-20260719-88JE','2026-07-19 11:40:31',NULL),(57,'830d435b-6d16-4a9b-8773-a33274c17fe8',5,5,1,NULL,NULL,280.00,0.00,280.00,0.00,0.00,'cash',280.00,0.00,'completed','RCP-20260719-8ZQU','2026-07-19 11:51:03',NULL),(58,'cb0cf155-6b26-4a61-a4b7-9ee94ffd4052',5,5,1,NULL,NULL,3781.00,0.00,3781.00,0.00,0.00,'cash',3781.00,0.00,'completed','RCP-20260719-I9H6','2026-07-19 11:55:26',NULL),(59,'d565d0fd-f9c9-4932-bbea-5c6a2d3ae6ab',1,1,1,NULL,NULL,199.00,0.00,199.00,0.00,0.00,'cash',199.00,0.00,'completed','RCP-20260719-I5R4','2026-07-19 12:12:01',NULL),(60,'648e84e4-4fe2-4284-8cfa-805426efd0cb',1,1,1,NULL,NULL,4050.00,0.00,4050.00,0.00,0.00,'cash',4050.00,0.00,'completed','RCP-20260719-6ITK','2026-07-19 12:15:00',NULL),(61,'9be410fe-c834-44d4-bd73-54750caa36cd',1,1,1,NULL,NULL,4620.00,0.00,4620.00,0.00,0.00,'cash',4620.00,0.00,'completed','RCP-20260719-LTLC','2026-07-19 12:40:37',NULL),(63,'46faca65-c40f-416e-a062-f927bbc85d5a',1,1,1,NULL,NULL,1210.00,0.00,1210.00,0.00,0.00,'cash',1210.00,0.00,'completed','RCP-20260719-OHS6','2026-07-19 12:41:19',NULL);
/*!40000 ALTER TABLE `pos_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barcode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hsn_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `mrp` decimal(10,2) DEFAULT '0.00',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'piece',
  `weight` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `min_stock_level` decimal(10,2) DEFAULT '0.00',
  `max_stock_level` decimal(10,2) DEFAULT '0.00',
  `expiry_date` date DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `tax_rate` decimal(5,2) DEFAULT '0.00',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `sku` (`sku`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'e875799b-9048-4997-b20f-d06fab649149',2,1,1,'Tata Salt 1kg','SKU-001',NULL,'Iodized salt',NULL,NULL,18.00,25.00,0.00,'packet',NULL,0.00,0.00,NULL,0,0.00,NULL,1,'2026-07-17 19:29:41','2026-07-17 19:29:41'),(2,'d42b7fb0-d723-4b89-88c4-4b4b3365b966',2,1,1,'Aashirvaad Atta 5kg','SKU-002',NULL,'Whole wheat flour',NULL,NULL,210.00,280.00,0.00,'packet',NULL,0.00,0.00,NULL,0,5.00,NULL,1,'2026-07-17 19:29:41','2026-07-17 19:29:41'),(3,'2eaef185-a574-40e2-8a34-e3d0f1675599',2,1,1,'Fortune Sunflower Oil 1L','SKU-003',NULL,'Refined sunflower oil',NULL,NULL,120.00,155.00,0.00,'bottle',NULL,0.00,0.00,NULL,0,5.00,NULL,1,'2026-07-17 19:29:41','2026-07-17 19:29:41'),(4,'a01bf620-185a-4471-b44a-057a2607fb60',2,1,1,'Toor Dal 1kg','SKU-004',NULL,'Yellow lentils',NULL,NULL,110.00,140.00,0.00,'packet',NULL,0.00,0.00,NULL,0,5.00,NULL,1,'2026-07-17 19:29:41','2026-07-17 19:29:41'),(5,'1fb5caa0-afda-4c9b-9fc9-20566abfa216',2,1,1,'Basmati Rice 5kg','SKU-005',NULL,'Premium basmati rice',NULL,NULL,350.00,450.00,0.00,'packet',NULL,0.00,0.00,NULL,0,5.00,NULL,1,'2026-07-17 19:29:41','2026-07-17 19:29:41'),(6,'c16125ef-3e10-4301-8ab0-36d55b30ef6e',2,1,2,'Coca-Cola 2L','SKU-006','','Cold drink','','',72.00,90.00,0.00,'bottle','',0.00,0.00,NULL,1,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-18 20:32:37'),(7,'117725d1-7f89-4a38-9a27-3b10661a43bc',2,1,2,'Parle Frooti 600ml','SKU-007',NULL,'Mango drink',NULL,NULL,25.00,35.00,0.00,'bottle',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(8,'b8ff1d41-d97b-4cca-bc29-fddada769d49',2,1,2,'Red Bull 250ml','SKU-008',NULL,'Energy drink',NULL,NULL,95.00,125.00,0.00,'piece',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(9,'3d4f51cf-caef-4161-b46a-ef55c2ac3950',2,1,2,'Bisleri Water 1L','SKU-009',NULL,'Packaged drinking water',NULL,NULL,15.00,20.00,0.00,'bottle',NULL,0.00,0.00,NULL,0,0.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(10,'428e6b6a-94b0-45fb-a679-310e88a5b9fa',2,1,3,'Lays Classic Salted','SKU-010',NULL,'Potato chips 52g',NULL,NULL,15.00,20.00,0.00,'packet',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(11,'2eb74850-7c62-4a29-b0e5-f84b3a94868e',2,1,3,'Kurkure Masala Munch','SKU-011',NULL,'Corn puffs 90g',NULL,NULL,15.00,20.00,0.00,'packet',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(12,'bc2ba14c-4c4f-4aea-975e-d5e559061350',2,1,3,'Haldiram Namkeen 200g','SKU-012',NULL,'Mixed namkeen',NULL,NULL,40.00,55.00,0.00,'packet',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(13,'a4de2ba0-e6e2-4dd8-81a2-c290b4fad616',2,1,4,'Dove Soap 100g','SKU-013',NULL,'Moisturizing soap',NULL,NULL,42.00,58.00,0.00,'piece',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(14,'19ecea2e-8c3a-4abf-a49e-5ca0c4eec83f',2,1,4,'Head & Shoulders 180ml','SKU-014',NULL,'Anti-dandruff shampoo',NULL,NULL,155.00,199.00,0.00,'bottle',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(15,'ec1cecd0-eea7-4a20-aef8-cfbc77534f83',2,1,4,'Colgate MaxFresh 150g','SKU-015',NULL,'Toothpaste',NULL,NULL,85.00,110.00,0.00,'piece',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(16,'fd523381-626f-4b57-a5cc-2e7588c6f731',2,1,5,'Amul Milk 500ml','SKU-016','','Toned milk','','',24.00,30.00,0.00,'packet','',0.00,0.00,NULL,0,5.00,NULL,1,'2026-07-17 19:29:42','2026-07-19 08:49:50'),(17,'e232dea0-2c84-49be-96b1-80641f5bbdc9',2,1,5,'Amul Butter 100g','SKU-017','','Pasteurized butter','','',48.00,57.00,0.00,'packet','',0.00,0.00,NULL,0,0.00,NULL,1,'2026-07-17 19:29:42','2026-07-19 09:41:16'),(18,'132e4a7f-9dc6-4541-82e1-785f36b36c38',2,1,5,'Mother Dairy Curd 400g','SKU-018',NULL,'Fresh curd',NULL,NULL,35.00,45.00,0.00,'piece',NULL,0.00,0.00,NULL,0,5.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(19,'30383695-8dde-4fae-9506-90ff066a467f',2,1,1,'Maggi Noodles (4 pack)','SKU-019',NULL,'Instant noodles',NULL,NULL,48.00,56.00,0.00,'packet',NULL,0.00,0.00,NULL,0,12.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(20,'14730b20-63c2-4771-a8c8-c102f7e84637',2,1,1,'Sugar 1kg','SKU-020',NULL,'White sugar',NULL,NULL,38.00,48.00,0.00,'packet',NULL,0.00,0.00,NULL,0,0.00,NULL,1,'2026-07-17 19:29:42','2026-07-17 19:29:42');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
INSERT INTO `purchase_items` VALUES (1,1,1,100.00,18.00,1800.00),(2,1,2,10.00,210.00,2100.00),(3,1,4,10.00,110.00,1100.00),(4,2,16,50.00,24.00,1200.00),(5,2,17,25.00,48.00,1200.00),(6,3,6,50.00,72.00,3600.00),(7,4,9,1.00,15.00,15.00),(8,5,2,100.00,210.00,21000.00);
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('paid','unpaid','partial') COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `payment_method` enum('cash','card','upi','bank_transfer') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `status` enum('pending','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `purchase_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchases_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (1,'72bdf2ca-1999-4bf1-8b11-508c50fe0619',2,1,1,'PUR-20260601-001',5000.00,0.00,250.00,5250.00,'paid','bank_transfer','cancelled',NULL,'2026-06-25','2026-07-17 19:29:42','2026-07-19 10:54:28'),(2,'bbbeb3fe-2c3d-498b-8236-dfb41276ac0f',2,1,2,'PUR-20260601-002',2400.00,100.00,0.00,2300.00,'paid','upi','completed',NULL,'2026-06-27','2026-07-17 19:29:42','2026-07-17 19:29:42'),(3,'a1ec29a8-dbb7-4fea-acdf-b79f1c1b9021',2,1,3,'PUR-20260601-003',3600.00,0.00,432.00,4032.00,'unpaid','cash','completed',NULL,'2026-06-30','2026-07-17 19:29:42','2026-07-17 19:29:42'),(4,'2d82151b-8893-4d05-97e8-0845680e3fdd',1,1,NULL,'PUR-MRROMAGH-FFU4',15.00,0.00,0.00,15.00,'paid','cash','completed',NULL,'2026-07-19','2026-07-19 10:57:50','2026-07-19 10:57:50'),(5,'271d1e32-46b2-4c43-b2aa-b599a2c51033',1,1,NULL,'PUR-MRROMQYB-NBPC',21000.00,0.00,0.00,21000.00,'paid','cash','completed',NULL,'2026-07-19','2026-07-19 10:58:12','2026-07-19 10:58:12');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sale_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES (1,1,2,1.00,280.00,0.00,280.00),(2,2,1,2.00,25.00,0.00,50.00),(3,2,2,1.00,280.00,0.00,280.00),(4,2,5,1.00,450.00,20.00,230.00),(5,3,6,1.00,95.00,0.00,95.00),(6,4,5,1.00,450.00,0.00,450.00),(7,5,3,1.00,155.00,0.00,155.00);
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('paid','unpaid','partial') COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `payment_method` enum('cash','card','upi','bank_transfer') COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `status` enum('pending','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `sale_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `user_id` (`user_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,'9d6a975e-03d1-427b-91a3-478e575bedb4',2,1,1,'INV-20260601-001',280.00,0.00,14.00,294.00,'paid','cash','completed',NULL,'2026-06-28','2026-07-17 19:29:42','2026-07-17 19:29:42'),(2,'98abc419-52be-4a93-9131-0385c39de82b',2,1,2,'INV-20260601-002',560.00,20.00,27.00,567.00,'paid','upi','completed',NULL,'2026-06-29','2026-07-17 19:29:42','2026-07-17 19:29:42'),(3,'0bf2b0d6-c56d-47b7-a042-9fd4942c37e0',2,1,NULL,'INV-20260601-003',95.00,0.00,11.40,106.40,'paid','cash','completed',NULL,'2026-06-30','2026-07-17 19:29:42','2026-07-17 19:29:42'),(4,'0d64c6a0-ff8f-42f3-9820-88a6bda1916b',2,1,3,'INV-20260601-004',450.00,0.00,22.50,472.50,'paid','cash','completed',NULL,'2026-07-01','2026-07-17 19:29:42','2026-07-18 21:12:04'),(5,'5f1600bf-287c-4f90-a03b-50eb61ce19c9',2,1,1,'INV-20260701-005',155.00,0.00,7.75,162.75,'paid','card','completed',NULL,'2026-07-02','2026-07-17 19:29:42','2026-07-17 19:29:42');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shop_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('open','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `opened_at` datetime NOT NULL,
  `closed_at` datetime DEFAULT NULL,
  `opening_cash` decimal(10,2) NOT NULL DEFAULT '0.00',
  `closing_cash` decimal(10,2) DEFAULT NULL,
  `expected_cash` decimal(10,2) DEFAULT NULL,
  `cash_difference` decimal(10,2) DEFAULT NULL,
  `total_sales` decimal(10,2) DEFAULT '0.00',
  `total_transactions` int DEFAULT '0',
  `cash_sales` decimal(10,2) DEFAULT '0.00',
  `upi_sales` decimal(10,2) DEFAULT '0.00',
  `card_sales` decimal(10,2) DEFAULT '0.00',
  `credit_sales` decimal(10,2) DEFAULT '0.00',
  `total_returns` decimal(10,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_shop_status` (`shop_id`,`status`),
  KEY `idx_shop_date` (`shop_id`,`opened_at`),
  CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shifts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shifts`
--

LOCK TABLES `shifts` WRITE;
/*!40000 ALTER TABLE `shifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_login_logs`
--

DROP TABLE IF EXISTS `shop_login_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_login_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_at` datetime DEFAULT NULL,
  `date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_shop_date` (`shop_id`,`date`),
  CONSTRAINT `shop_login_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shop_login_logs_ibfk_2` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_login_logs`
--

LOCK TABLES `shop_login_logs` WRITE;
/*!40000 ALTER TABLE `shop_login_logs` DISABLE KEYS */;
INSERT INTO `shop_login_logs` VALUES (30,1,1,'admin','2026-07-19 01:39:13','2026-07-19 01:42:59','2026-07-19','2026-07-18 20:09:13','2026-07-18 20:17:22'),(31,1,1,'admin','2026-07-19 01:42:59','2026-07-19 01:43:03','2026-07-19','2026-07-18 20:12:59','2026-07-18 20:17:22'),(32,1,2,'admin','2026-07-19 01:44:12','2026-07-19 01:44:16','2026-07-19','2026-07-18 20:14:12','2026-07-18 20:17:22'),(33,1,3,'admin','2026-07-19 01:44:43','2026-07-19 01:44:48','2026-07-19','2026-07-18 20:14:43','2026-07-18 20:17:22'),(34,1,2,'admin','2026-07-19 01:45:42','2026-07-19 01:45:48','2026-07-19','2026-07-18 20:15:42','2026-07-18 20:17:22'),(35,1,3,'admin','2026-07-19 01:56:53','2026-07-19 01:56:57','2026-07-19','2026-07-18 20:26:53','2026-07-18 20:26:57'),(36,1,1,'admin','2026-07-19 02:00:40','2026-07-19 02:04:09','2026-07-19','2026-07-18 20:30:40','2026-07-18 20:34:09'),(37,1,1,'admin','2026-07-19 02:04:29','2026-07-19 10:17:12','2026-07-19','2026-07-18 20:34:29','2026-07-19 04:47:12'),(38,5,1,'staff','2026-07-19 10:17:50','2026-07-19 10:38:45','2026-07-19','2026-07-19 04:47:50','2026-07-19 05:08:45'),(39,5,1,'staff','2026-07-19 10:38:45','2026-07-19 11:04:45','2026-07-19','2026-07-19 05:08:45','2026-07-19 05:34:45'),(40,1,1,'admin','2026-07-19 11:05:01','2026-07-19 11:15:41','2026-07-19','2026-07-19 05:35:01','2026-07-19 05:45:41'),(41,5,1,'staff','2026-07-19 11:15:56','2026-07-19 11:59:45','2026-07-19','2026-07-19 05:45:56','2026-07-19 06:29:45'),(42,3,3,'staff','2026-07-19 12:00:31','2026-07-19 12:04:05','2026-07-19','2026-07-19 06:30:31','2026-07-19 06:34:05'),(43,1,3,'admin','2026-07-19 12:04:25','2026-07-19 12:04:45','2026-07-19','2026-07-19 06:34:25','2026-07-19 06:34:45'),(44,3,3,'staff','2026-07-19 12:05:03','2026-07-19 12:12:10','2026-07-19','2026-07-19 06:35:03','2026-07-19 06:42:10'),(45,1,3,'admin','2026-07-19 12:12:24','2026-07-19 12:12:36','2026-07-19','2026-07-19 06:42:24','2026-07-19 06:42:36'),(46,1,2,'admin','2026-07-19 12:12:38','2026-07-19 12:12:44','2026-07-19','2026-07-19 06:42:38','2026-07-19 06:42:44'),(47,1,1,'admin','2026-07-19 12:12:50','2026-07-19 12:13:11','2026-07-19','2026-07-19 06:42:50','2026-07-19 06:43:11'),(48,5,1,'staff','2026-07-19 12:13:39','2026-07-19 12:31:49','2026-07-19','2026-07-19 06:43:39','2026-07-19 07:01:49'),(49,1,1,'admin','2026-07-19 12:32:02','2026-07-19 12:45:47','2026-07-19','2026-07-19 07:02:02','2026-07-19 07:15:47'),(50,1,1,'admin','2026-07-19 12:46:24','2026-07-19 13:31:28','2026-07-19','2026-07-19 07:16:24','2026-07-19 08:01:28'),(51,1,2,'admin','2026-07-19 12:46:37','2026-07-19 12:47:09','2026-07-19','2026-07-19 07:16:37','2026-07-19 07:17:09'),(52,1,2,'admin','2026-07-19 13:13:57','2026-07-19 13:14:36','2026-07-19','2026-07-19 07:43:57','2026-07-19 07:44:36'),(53,1,2,'admin','2026-07-19 13:30:46','2026-07-19 13:30:59','2026-07-19','2026-07-19 08:00:46','2026-07-19 08:00:59'),(54,1,1,'admin','2026-07-19 13:31:28','2026-07-19 13:31:56','2026-07-19','2026-07-19 08:01:28','2026-07-19 08:01:56'),(55,1,1,'admin','2026-07-19 13:32:38','2026-07-19 13:34:32','2026-07-19','2026-07-19 08:02:38','2026-07-19 08:04:32'),(56,1,1,'admin','2026-07-19 13:41:30','2026-07-19 13:53:16','2026-07-19','2026-07-19 08:11:30','2026-07-19 08:23:16'),(57,1,1,'admin','2026-07-19 13:53:34','2026-07-19 13:54:42','2026-07-19','2026-07-19 08:23:34','2026-07-19 08:24:42'),(58,1,1,'admin','2026-07-19 13:54:42','2026-07-19 14:00:36','2026-07-19','2026-07-19 08:24:42','2026-07-19 08:30:36'),(59,1,1,'admin','2026-07-19 14:00:36','2026-07-19 14:01:16','2026-07-19','2026-07-19 08:30:36','2026-07-19 08:31:16'),(60,1,1,'admin','2026-07-19 14:01:33','2026-07-19 14:02:08','2026-07-19','2026-07-19 08:31:33','2026-07-19 08:32:08'),(61,1,1,'admin','2026-07-19 14:02:23','2026-07-19 14:07:15','2026-07-19','2026-07-19 08:32:23','2026-07-19 08:37:15'),(62,1,1,'admin','2026-07-19 14:07:36','2026-07-19 14:17:16','2026-07-19','2026-07-19 08:37:36','2026-07-19 08:47:16'),(63,1,1,'admin','2026-07-19 14:17:16','2026-07-19 14:17:20','2026-07-19','2026-07-19 08:47:16','2026-07-19 08:47:20'),(64,1,1,'admin','2026-07-19 14:17:28','2026-07-19 14:40:32','2026-07-19','2026-07-19 08:47:28','2026-07-19 09:10:32'),(65,1,1,'admin','2026-07-19 14:40:32','2026-07-19 14:42:35','2026-07-19','2026-07-19 09:10:32','2026-07-19 09:12:35'),(66,1,1,'admin','2026-07-19 14:42:35','2026-07-19 14:47:51','2026-07-19','2026-07-19 09:12:35','2026-07-19 09:17:51'),(67,1,1,'admin','2026-07-19 14:47:51','2026-07-19 15:05:00','2026-07-19','2026-07-19 09:17:51','2026-07-19 09:35:00'),(68,1,1,'admin','2026-07-19 15:05:37','2026-07-19 15:10:07','2026-07-19','2026-07-19 09:35:37','2026-07-19 09:40:07'),(69,1,1,'admin','2026-07-19 15:10:56','2026-07-19 15:43:14','2026-07-19','2026-07-19 09:40:56','2026-07-19 10:13:14'),(70,1,2,'admin','2026-07-19 15:27:01','2026-07-19 15:27:09','2026-07-19','2026-07-19 09:57:01','2026-07-19 09:57:09'),(71,1,1,'admin','2026-07-19 15:43:14','2026-07-19 15:44:04','2026-07-19','2026-07-19 10:13:14','2026-07-19 10:14:04'),(72,1,2,'admin','2026-07-19 15:52:50','2026-07-19 15:53:51','2026-07-19','2026-07-19 10:22:50','2026-07-19 10:23:51'),(73,1,1,'admin','2026-07-19 16:01:22','2026-07-19 16:01:35','2026-07-19','2026-07-19 10:31:22','2026-07-19 10:31:35'),(74,1,1,'admin','2026-07-19 16:11:43','2026-07-19 16:13:52','2026-07-19','2026-07-19 10:41:43','2026-07-19 10:43:52'),(75,1,1,'admin','2026-07-19 16:16:39','2026-07-19 16:28:16','2026-07-19','2026-07-19 10:46:39','2026-07-19 10:58:16'),(76,1,2,'admin','2026-07-19 16:29:55','2026-07-19 16:30:12','2026-07-19','2026-07-19 10:59:55','2026-07-19 11:00:12'),(77,1,1,'admin','2026-07-19 16:30:13','2026-07-19 16:30:33','2026-07-19','2026-07-19 11:00:13','2026-07-19 11:00:33'),(78,1,1,'admin','2026-07-19 16:32:13','2026-07-19 16:33:06','2026-07-19','2026-07-19 11:02:13','2026-07-19 11:03:06'),(79,1,1,'admin','2026-07-19 16:45:12','2026-07-19 16:45:35','2026-07-19','2026-07-19 11:15:12','2026-07-19 11:15:35'),(80,1,1,'admin','2026-07-19 16:49:49','2026-07-19 16:51:11','2026-07-19','2026-07-19 11:19:49','2026-07-19 11:21:11'),(81,1,1,'admin','2026-07-19 16:58:50','2026-07-19 16:58:55','2026-07-19','2026-07-19 11:28:50','2026-07-19 11:28:55'),(82,1,1,'admin','2026-07-19 17:02:54','2026-07-19 17:07:03','2026-07-19','2026-07-19 11:32:54','2026-07-19 11:37:03'),(83,5,1,'staff','2026-07-19 17:07:28','2026-07-19 17:09:05','2026-07-19','2026-07-19 11:37:28','2026-07-19 11:39:05'),(84,1,1,'admin','2026-07-19 17:09:31','2026-07-19 17:13:28','2026-07-19','2026-07-19 11:39:31','2026-07-19 11:43:28'),(85,5,1,'staff','2026-07-19 17:13:45','2026-07-19 17:39:17','2026-07-19','2026-07-19 11:43:45','2026-07-19 12:09:17'),(86,1,1,'admin','2026-07-19 17:40:39','2026-07-19 17:40:59','2026-07-19','2026-07-19 12:10:39','2026-07-19 12:10:59'),(87,1,1,'admin','2026-07-19 17:41:13','2026-07-19 17:41:31','2026-07-19','2026-07-19 12:11:13','2026-07-19 12:11:31'),(88,1,1,'admin','2026-07-19 17:41:49','2026-07-19 17:42:08','2026-07-19','2026-07-19 12:11:49','2026-07-19 12:12:08'),(89,1,1,'admin','2026-07-19 17:44:50','2026-07-19 17:45:07','2026-07-19','2026-07-19 12:14:50','2026-07-19 12:15:07'),(90,7,2,'staff','2026-07-19 17:49:17','2026-07-19 17:49:22','2026-07-19','2026-07-19 12:19:17','2026-07-19 12:19:22'),(91,6,1,'manager','2026-07-19 17:50:01','2026-07-19 17:50:13','2026-07-19','2026-07-19 12:20:01','2026-07-19 12:20:13'),(92,3,1,'staff','2026-07-19 17:53:54','2026-07-19 17:53:59','2026-07-19','2026-07-19 12:23:54','2026-07-19 12:23:59'),(93,7,1,'staff','2026-07-19 17:54:15','2026-07-19 17:54:19','2026-07-19','2026-07-19 12:24:15','2026-07-19 12:24:19'),(94,5,2,'staff','2026-07-19 17:54:36','2026-07-19 17:54:40','2026-07-19','2026-07-19 12:24:36','2026-07-19 12:24:40'),(95,6,3,'manager','2026-07-19 17:54:52','2026-07-19 17:54:58','2026-07-19','2026-07-19 12:24:52','2026-07-19 12:24:58'),(96,1,1,'admin','2026-07-19 18:00:10','2026-07-19 18:05:49','2026-07-19','2026-07-19 12:30:10','2026-07-19 12:35:49'),(97,1,2,'admin','2026-07-19 18:00:15','2026-07-19 18:14:28','2026-07-19','2026-07-19 12:30:15','2026-07-19 12:44:28'),(98,1,3,'admin','2026-07-19 18:00:19',NULL,'2026-07-19','2026-07-19 12:30:19','2026-07-19 12:30:19'),(99,1,1,'admin','2026-07-19 18:05:49','2026-07-19 18:05:58','2026-07-19','2026-07-19 12:35:49','2026-07-19 12:35:58'),(100,1,1,'admin','2026-07-19 18:10:12','2026-07-19 18:10:40','2026-07-19','2026-07-19 12:40:12','2026-07-19 12:40:40'),(101,1,1,'admin','2026-07-19 18:10:49','2026-07-19 18:11:23','2026-07-19','2026-07-19 12:40:49','2026-07-19 12:41:23'),(102,1,1,'admin','2026-07-19 18:12:08','2026-07-19 18:12:29','2026-07-19','2026-07-19 12:42:08','2026-07-19 12:42:29'),(103,1,2,'admin','2026-07-19 18:14:28','2026-07-19 18:14:34','2026-07-19','2026-07-19 12:44:28','2026-07-19 12:44:34'),(104,1,1,'admin','2026-07-19 18:18:22','2026-07-19 18:18:37','2026-07-19','2026-07-19 12:48:22','2026-07-19 12:48:37');
/*!40000 ALTER TABLE `shop_login_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_subscriptions`
--

DROP TABLE IF EXISTS `shop_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `billing_cycle` enum('monthly','quarterly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `status` enum('active','expired','cancelled','trial') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trial',
  `amount_paid` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `starts_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `payment_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_shop_status` (`shop_id`,`status`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `shop_subscriptions_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shop_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_subscriptions`
--

LOCK TABLES `shop_subscriptions` WRITE;
/*!40000 ALTER TABLE `shop_subscriptions` DISABLE KEYS */;
INSERT INTO `shop_subscriptions` VALUES (1,1,1,'monthly','expired',0.00,'INR','2026-07-18 01:06:26','2026-08-18 01:06:26',NULL,NULL,NULL,'2026-07-17 19:36:26','2026-07-17 19:36:29'),(2,1,2,'monthly','expired',199.00,'INR','2026-07-18 01:06:29','2026-08-18 01:06:29',NULL,NULL,NULL,'2026-07-17 19:36:29','2026-07-17 19:36:34'),(3,1,3,'monthly','expired',499.00,'INR','2026-07-18 01:06:34','2026-08-18 01:06:34',NULL,NULL,NULL,'2026-07-17 19:36:34','2026-07-17 19:36:43'),(4,1,4,'monthly','expired',999.00,'INR','2026-07-18 01:06:43','2026-08-18 01:06:43',NULL,NULL,NULL,'2026-07-17 19:36:43','2026-07-17 19:38:37'),(5,1,2,'monthly','expired',199.00,'INR','2026-07-18 01:08:37','2026-08-18 01:08:37',NULL,NULL,NULL,'2026-07-17 19:38:37','2026-07-17 19:38:39'),(6,1,1,'monthly','expired',0.00,'INR','2026-07-18 01:08:39','2026-08-18 01:08:39',NULL,NULL,NULL,'2026-07-17 19:38:39','2026-07-17 19:38:44'),(7,1,4,'monthly','expired',999.00,'INR','2026-07-18 01:08:45','2026-08-18 01:08:45',NULL,NULL,NULL,'2026-07-17 19:38:44','2026-07-18 03:15:55'),(8,1,1,'monthly','expired',0.00,'INR','2026-07-18 08:45:56','2026-08-18 08:45:56',NULL,NULL,NULL,'2026-07-18 03:15:55','2026-07-18 03:16:47'),(9,1,2,'monthly','expired',199.00,'INR','2026-07-18 08:46:48','2026-08-18 08:46:48',NULL,NULL,NULL,'2026-07-18 03:16:47','2026-07-18 03:26:50'),(10,1,3,'monthly','expired',499.00,'INR','2026-07-18 08:56:50','2026-08-18 08:56:50',NULL,NULL,NULL,'2026-07-18 03:26:50','2026-07-18 03:27:59'),(11,1,1,'monthly','cancelled',0.00,'INR','2026-07-18 08:58:00','2026-08-18 08:58:00','2026-07-18 08:58:22',NULL,NULL,'2026-07-18 03:27:59','2026-07-18 03:28:22'),(12,1,1,'monthly','expired',0.00,'INR','2026-07-18 09:00:19','2026-08-18 09:00:19',NULL,NULL,NULL,'2026-07-18 03:30:19','2026-07-18 03:30:20'),(13,1,2,'monthly','expired',199.00,'INR','2026-07-18 09:00:21','2026-08-18 09:00:21',NULL,NULL,NULL,'2026-07-18 03:30:20','2026-07-18 03:30:25'),(14,1,4,'monthly','cancelled',999.00,'INR','2026-07-18 09:00:25','2026-08-18 09:00:25','2026-07-18 23:24:13',NULL,NULL,'2026-07-18 03:30:25','2026-07-18 17:54:13'),(15,1,4,'monthly','active',999.00,'INR','2026-07-18 23:24:23','2026-08-18 23:24:23',NULL,NULL,NULL,'2026-07-18 17:54:22','2026-07-18 17:54:22');
/*!40000 ALTER TABLE `shop_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shops`
--

DROP TABLE IF EXISTS `shops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT '5.00',
  `tax_label` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'GST',
  `gst_type` enum('without_gst','gst_inclusive','gst_exclusive') COLLATE utf8mb4_unicode_ci DEFAULT 'without_gst',
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_open` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shops`
--

LOCK TABLES `shops` WRITE;
/*!40000 ALTER TABLE `shops` DISABLE KEYS */;
INSERT INTO `shops` VALUES (1,'1c8f9ead-79f6-482e-a389-4094aca905ba','Demo General Store','145 Market Road, Ludhiana West','9876543211',NULL,'27AABCD1234E1ZF',5.00,'GST','without_gst',NULL,2,1,1,'2026-07-17 19:29:41','2026-07-19 11:01:33'),(2,'065e535d-7bf2-4c31-bcf1-bf56c256a484','Ms Lakshmi Groceries','Iromgmara West Cachar Assam 788011','1232324567',NULL,'AS34434SDT545',5.00,'GST','without_gst',NULL,1,1,1,'2026-07-17 20:12:51','2026-07-19 11:23:08'),(3,'17089798-738d-4217-9d68-dc5549db9c95','Ms Bishnu Groceries','Irongmara Silchar Cachar Assam 788011','1234567890',NULL,NULL,5.00,'GST','without_gst',NULL,1,1,1,'2026-07-18 16:29:12','2026-07-19 12:33:39'),(4,'ef8bec20-ad80-4f3a-8207-c55fa09460be','Ms Agrawal Traders','Silchar Cachar Assam','1234545434',NULL,'AS3432SD3434',5.00,'GST','without_gst',NULL,1,1,1,'2026-07-19 12:47:18','2026-07-19 12:49:08');
/*!40000 ALTER TABLE `shops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_attendance`
--

DROP TABLE IF EXISTS `staff_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shop_status` enum('open','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recorded_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_attendance` (`user_id`,`shop_id`,`date`),
  KEY `shop_id` (`shop_id`),
  KEY `recorded_by` (`recorded_by`),
  CONSTRAINT `staff_attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `staff_attendance_ibfk_2` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `staff_attendance_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_attendance`
--

LOCK TABLES `staff_attendance` WRITE;
/*!40000 ALTER TABLE `staff_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `type` enum('in','out','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,9,2,1,'out',3.00,'pos_transaction',1,'POS Sale: RCP-20260718-I86H','2026-07-18 20:45:30'),(2,6,2,1,'out',2.00,'pos_transaction',1,'POS Sale: RCP-20260718-I86H','2026-07-18 20:45:30'),(3,2,2,1,'out',3.00,'pos_transaction',2,'POS Sale: RCP-20260718-7LLV','2026-07-18 20:52:53'),(4,17,2,1,'out',3.00,'pos_transaction',2,'POS Sale: RCP-20260718-7LLV','2026-07-18 20:52:53'),(5,2,2,1,'out',5.00,'pos_transaction',3,'POS Sale: RCP-20260718-53OG','2026-07-18 21:12:34'),(6,17,2,1,'out',4.00,'pos_transaction',4,'POS Sale: RCP-20260718-TI9K','2026-07-18 21:15:10'),(7,17,2,1,'out',4.00,'pos_transaction',5,'POS Sale: RCP-20260718-4DOD','2026-07-18 21:17:42'),(8,16,2,1,'out',3.00,'pos_transaction',5,'POS Sale: RCP-20260718-4DOD','2026-07-18 21:17:42'),(9,9,2,1,'out',1.00,'pos_transaction',6,'POS Sale: RCP-20260718-V9Q0','2026-07-18 21:18:15'),(10,16,2,1,'out',3.00,'pos_transaction',6,'POS Sale: RCP-20260718-V9Q0','2026-07-18 21:18:15'),(11,17,2,1,'out',4.00,'pos_transaction',7,'POS Sale: RCP-20260718-KP6B','2026-07-18 21:22:02'),(12,17,2,1,'out',3.00,'pos_transaction',8,'POS Sale: RCP-20260718-W5LW','2026-07-18 21:35:38'),(13,17,2,1,'out',4.00,'pos_transaction',9,'POS Sale: RCP-20260718-3COT','2026-07-18 22:26:50'),(14,16,2,1,'out',4.00,'pos_transaction',10,'POS Sale: RCP-20260718-K2SP','2026-07-18 22:27:34'),(15,17,2,1,'out',1.00,'pos_transaction',11,'POS Sale: RCP-20260719-6E5V','2026-07-19 04:36:33'),(16,16,2,1,'out',1.00,'pos_transaction',11,'POS Sale: RCP-20260719-6E5V','2026-07-19 04:36:33'),(17,9,2,1,'out',3.00,'pos_transaction',11,'POS Sale: RCP-20260719-6E5V','2026-07-19 04:36:33'),(18,17,2,1,'out',1.00,'pos_transaction',12,'POS Sale: RCP-20260719-7Z1R','2026-07-19 05:11:59'),(19,16,2,1,'out',1.00,'pos_transaction',12,'POS Sale: RCP-20260719-7Z1R','2026-07-19 05:11:59'),(20,5,2,1,'out',1.00,'pos_transaction',12,'POS Sale: RCP-20260719-7Z1R','2026-07-19 05:11:59'),(21,2,2,1,'out',1.00,'pos_transaction',13,'POS Sale: RCP-20260719-GR84','2026-07-19 05:12:12'),(22,5,2,1,'out',2.00,'pos_transaction',13,'POS Sale: RCP-20260719-GR84','2026-07-19 05:12:12'),(23,16,2,1,'out',1.00,'pos_transaction',13,'POS Sale: RCP-20260719-GR84','2026-07-19 05:12:12'),(24,16,2,1,'out',1.00,'pos_transaction',14,'POS Sale: RCP-20260719-S4KQ','2026-07-19 05:12:25'),(25,9,2,1,'out',1.00,'pos_transaction',14,'POS Sale: RCP-20260719-S4KQ','2026-07-19 05:12:25'),(26,6,2,1,'out',1.00,'pos_transaction',14,'POS Sale: RCP-20260719-S4KQ','2026-07-19 05:12:25'),(27,6,2,1,'out',1.00,'pos_transaction',15,'POS Sale: RCP-20260719-VASO','2026-07-19 05:12:50'),(28,9,2,1,'out',1.00,'pos_transaction',15,'POS Sale: RCP-20260719-VASO','2026-07-19 05:12:50'),(29,2,2,1,'out',1.00,'pos_transaction',16,'POS Sale: RCP-20260719-NSX6','2026-07-19 06:45:02'),(30,16,2,1,'out',1.00,'pos_transaction',16,'POS Sale: RCP-20260719-NSX6','2026-07-19 06:45:02'),(31,9,2,1,'out',1.00,'pos_transaction',16,'POS Sale: RCP-20260719-NSX6','2026-07-19 06:45:02'),(32,6,2,1,'out',1.00,'pos_transaction',16,'POS Sale: RCP-20260719-NSX6','2026-07-19 06:45:02'),(33,17,2,1,'out',1.00,'pos_transaction',17,'POS Sale: RCP-20260719-VH5U','2026-07-19 06:50:04'),(34,2,2,1,'out',1.00,'pos_transaction',17,'POS Sale: RCP-20260719-VH5U','2026-07-19 06:50:04'),(35,5,2,1,'out',1.00,'pos_transaction',17,'POS Sale: RCP-20260719-VH5U','2026-07-19 06:50:04'),(36,9,2,1,'out',1.00,'pos_transaction',17,'POS Sale: RCP-20260719-VH5U','2026-07-19 06:50:04'),(37,6,2,1,'out',1.00,'pos_transaction',18,'POS Sale: RCP-20260719-4GMZ','2026-07-19 06:50:46'),(38,9,2,1,'out',1.00,'pos_transaction',19,'POS Sale: RCP-20260719-37YZ','2026-07-19 06:51:11'),(39,9,2,1,'out',1.00,'pos_transaction',20,'POS Sale: RCP-20260719-UHTW','2026-07-19 06:51:51'),(40,18,2,1,'out',1.00,'pos_transaction',21,'POS Sale: RCP-20260719-59WC','2026-07-19 06:52:46'),(41,7,2,1,'out',1.00,'pos_transaction',21,'POS Sale: RCP-20260719-59WC','2026-07-19 06:52:46'),(42,2,2,1,'out',1.00,'pos_transaction',22,'POS Sale: RCP-20260719-JVPM','2026-07-19 08:01:38'),(43,16,2,1,'out',1.00,'pos_transaction',22,'POS Sale: RCP-20260719-JVPM','2026-07-19 08:01:38'),(44,5,2,1,'out',1.00,'pos_transaction',23,'POS Sale: RCP-20260719-9F8L','2026-07-19 08:02:46'),(45,16,2,1,'out',1.00,'pos_transaction',23,'POS Sale: RCP-20260719-9F8L','2026-07-19 08:02:46'),(46,2,2,1,'out',1.00,'pos_transaction',24,'POS Sale: RCP-20260719-40JX','2026-07-19 08:11:41'),(47,5,2,1,'out',1.00,'pos_transaction',24,'POS Sale: RCP-20260719-40JX','2026-07-19 08:11:41'),(48,16,2,1,'out',1.00,'pos_transaction',25,'POS Sale: RCP-20260719-EFR1','2026-07-19 08:23:04'),(49,5,2,1,'out',1.00,'pos_transaction',25,'POS Sale: RCP-20260719-EFR1','2026-07-19 08:23:04'),(50,13,2,1,'out',1.00,'pos_transaction',26,'POS Sale: RCP-20260719-FIOD','2026-07-19 08:23:43'),(51,3,2,1,'out',1.00,'pos_transaction',26,'POS Sale: RCP-20260719-FIOD','2026-07-19 08:23:43'),(52,1,2,1,'out',1.00,'pos_transaction',27,'POS Sale: RCP-20260719-CSN4','2026-07-19 08:24:42'),(53,16,2,1,'out',1.00,'pos_transaction',28,'POS Sale: RCP-20260719-DKA7','2026-07-19 08:25:36'),(54,5,2,1,'out',1.00,'pos_transaction',28,'POS Sale: RCP-20260719-DKA7','2026-07-19 08:25:36'),(55,2,2,1,'out',1.00,'pos_transaction',29,'POS Sale: RCP-20260719-10K5','2026-07-19 08:26:03'),(56,16,2,1,'out',1.00,'pos_transaction',30,'POS Sale: RCP-20260719-0LN4','2026-07-19 08:29:17'),(57,2,2,1,'out',1.00,'pos_transaction',31,'POS Sale: RCP-20260719-VZ8P','2026-07-19 08:31:01'),(58,16,2,1,'out',1.00,'pos_transaction',31,'POS Sale: RCP-20260719-VZ8P','2026-07-19 08:31:01'),(59,16,2,1,'out',2.00,'pos_transaction',32,'POS Sale: RCP-20260719-PFDG','2026-07-19 08:31:42'),(60,16,2,1,'out',2.00,'pos_transaction',33,'POS Sale: RCP-20260719-Z0K1','2026-07-19 08:32:35'),(61,10,2,1,'out',1.00,'pos_transaction',34,'POS Sale: RCP-20260719-5ZOP','2026-07-19 08:34:38'),(62,16,2,1,'out',1.00,'pos_transaction',35,'POS Sale: RCP-20260719-Q1K7','2026-07-19 08:37:45'),(63,16,2,1,'out',1.00,'pos_transaction',36,'POS Sale: RCP-20260719-LV7S','2026-07-19 08:47:43'),(64,16,2,1,'out',1.00,'pos_transaction',37,'POS Sale: RCP-20260719-JCTQ','2026-07-19 08:49:28'),(65,11,2,1,'out',1.00,'pos_transaction',38,'POS Sale: RCP-20260719-MT2Z','2026-07-19 08:49:28'),(66,16,2,1,'out',1.00,'pos_transaction',39,'POS Sale: RCP-20260719-IZSC','2026-07-19 08:49:59'),(67,2,2,1,'out',1.00,'pos_transaction',40,'POS Sale: RCP-20260719-AZKV','2026-07-19 08:52:44'),(68,2,2,1,'out',1.00,'pos_transaction',41,'POS Sale: RCP-20260719-TY79','2026-07-19 08:53:35'),(69,5,2,1,'out',1.00,'pos_transaction',42,'POS Sale: RCP-20260719-DAM0','2026-07-19 08:55:46'),(70,2,2,1,'out',1.00,'pos_transaction',43,'POS Sale: RCP-20260719-5RDP','2026-07-19 08:56:39'),(71,2,2,1,'out',1.00,'pos_transaction',44,'POS Sale: RCP-20260719-GKYG','2026-07-19 08:57:48'),(72,2,2,1,'out',1.00,'pos_transaction',45,'POS Sale: RCP-20260719-JSX8','2026-07-19 08:58:37'),(73,1,2,1,'out',1.00,'pos_transaction',46,'POS Sale: RCP-20260719-95WT','2026-07-19 09:10:32'),(74,1,2,1,'out',1.00,'pos_transaction',47,'POS Sale: RCP-20260719-YITE','2026-07-19 09:12:35'),(75,16,2,1,'out',1.00,'pos_transaction',48,'POS Sale: RCP-20260719-Q7O6','2026-07-19 09:13:53'),(76,2,2,1,'out',1.00,'pos_transaction',49,'POS Sale: RCP-20260719-7VI0','2026-07-19 09:16:34'),(77,2,2,1,'out',1.00,'pos_transaction',50,'POS Sale: RCP-20260719-E0HN','2026-07-19 09:17:58'),(78,17,1,1,'in',20.00,'manual',NULL,NULL,'2026-07-19 09:38:09'),(79,17,2,1,'out',1.00,'pos_transaction',51,'POS Sale: RCP-20260719-HPBF','2026-07-19 09:38:24'),(80,17,2,1,'out',1.00,'pos_transaction',52,'POS Sale: RCP-20260719-DTZK','2026-07-19 09:41:22'),(81,16,2,1,'out',1.00,'pos_transaction',53,'POS Sale: RCP-20260719-X1AZ','2026-07-19 10:31:31'),(82,5,2,1,'out',4.00,'pos_transaction',53,'POS Sale: RCP-20260719-X1AZ','2026-07-19 10:31:31'),(83,9,1,1,'in',1.00,'purchase',4,'Purchase: PUR-MRROMAGH-FFU4','2026-07-19 10:57:50'),(84,2,1,1,'in',100.00,'purchase',5,'Purchase: PUR-MRROMQYB-NBPC','2026-07-19 10:58:12'),(85,2,2,1,'out',1.00,'pos_transaction',54,'POS Sale: RCP-20260719-TGF4','2026-07-19 11:00:23'),(86,5,2,1,'out',2.00,'pos_transaction',55,'POS Sale: RCP-20260719-DJBC','2026-07-19 11:15:32'),(87,2,2,1,'out',1.00,'pos_transaction',56,'POS Sale: RCP-20260719-88JE','2026-07-19 11:40:31'),(88,2,2,1,'out',1.00,'pos_transaction',57,'POS Sale: RCP-20260719-8ZQU','2026-07-19 11:51:03'),(89,14,2,1,'out',19.00,'pos_transaction',58,'POS Sale: RCP-20260719-I9H6','2026-07-19 11:55:26'),(90,5,1,1,'in',10.00,'manual',NULL,NULL,'2026-07-19 12:10:50'),(91,14,2,1,'out',1.00,'pos_transaction',59,'POS Sale: RCP-20260719-I5R4','2026-07-19 12:12:01'),(92,5,2,1,'out',9.00,'pos_transaction',60,'POS Sale: RCP-20260719-6ITK','2026-07-19 12:15:00'),(93,4,2,1,'out',33.00,'pos_transaction',61,'POS Sale: RCP-20260719-LTLC','2026-07-19 12:40:37'),(94,15,2,1,'out',11.00,'pos_transaction',63,'POS Sale: RCP-20260719-OHS6','2026-07-19 12:41:19');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price_monthly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `price_quarterly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `price_yearly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `max_products` int DEFAULT NULL,
  `max_staff` int DEFAULT NULL,
  `max_customers` int DEFAULT NULL,
  `max_monthly_sales` int DEFAULT NULL,
  `features` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES (1,'free','Free','Basic plan for getting started',0.00,0.00,0.00,'INR',50,1,100,200,'{\"pos\": true, \"offers\": false, \"reports\": false, \"invoice_branding\": false, \"priority_support\": false}',1,1,'2026-07-17 19:29:38','2026-07-17 19:29:38'),(2,'starter','Starter','For small shops just getting started',199.00,499.00,1799.00,'INR',200,3,500,1000,'{\"pos\": true, \"offers\": false, \"reports\": true, \"invoice_branding\": false, \"priority_support\": false}',1,2,'2026-07-17 19:29:38','2026-07-17 19:29:38'),(3,'pro','Pro','For growing businesses that need more',499.00,1299.00,4799.00,'INR',NULL,10,NULL,NULL,'{\"pos\": true, \"offers\": true, \"reports\": true, \"invoice_branding\": true, \"priority_support\": false}',1,3,'2026-07-17 19:29:38','2026-07-17 19:29:38'),(4,'enterprise','Enterprise','Unlimited everything with priority support',999.00,2499.00,8999.00,'INR',NULL,NULL,NULL,NULL,'{\"pos\": true, \"offers\": true, \"reports\": true, \"invoice_branding\": true, \"priority_support\": true}',1,4,'2026-07-17 19:29:38','2026-07-17 19:29:38');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `shop_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `gst_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'b312f796-6f3b-4f4a-a37c-cf4d62f3378d',2,1,'Wholesale Mart','contact@wholesalemart.com','9900001111','Wholesale Mart Pvt Ltd','101 Industrial Area, Delhi','27AABCW1234A1ZA',0.00,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(2,'a978c01c-e6ee-4ce1-8d99-ab9f1a1d68f7',2,1,'Fresh Dairy Suppliers','dairy@freshsupply.com','9900002222','Fresh Dairy Co.','22 Dairy Complex, Anand','24AABCF5678B1ZB',0.00,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(3,'ca6f7651-dd83-4c6e-b877-94352c16bac9',2,1,'Beverage Distributors','sales@bevdist.com','9900003333','Bev Distributors LLP','33 MIDC, Pune','27AABCB9012C1ZC',0.00,1,'2026-07-17 19:29:42','2026-07-17 19:29:42'),(4,'a20b5508-7862-4d85-9bde-9db588fa67b4',2,1,'FMCG Direct',NULL,'9900004444','FMCG Direct India','44 Sector 12, Noida',NULL,1200.00,1,'2026-07-17 19:29:42','2026-07-17 19:29:42');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_shops`
--

DROP TABLE IF EXISTS `user_shops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_shops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_id` int NOT NULL,
  `role` enum('admin','manager','staff') COLLATE utf8mb4_unicode_ci DEFAULT 'staff',
  `is_active` tinyint(1) DEFAULT '1',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_shop` (`user_id`,`shop_id`),
  KEY `shop_id` (`shop_id`),
  CONSTRAINT `user_shops_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_shops_ibfk_2` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_shops`
--

LOCK TABLES `user_shops` WRITE;
/*!40000 ALTER TABLE `user_shops` DISABLE KEYS */;
INSERT INTO `user_shops` VALUES (1,2,1,'admin',1,'2026-07-17 19:29:41',NULL),(2,1,1,'admin',1,'2026-07-17 19:29:41',NULL),(4,1,2,'admin',1,'2026-07-17 20:12:51',NULL),(6,1,3,'admin',1,'2026-07-18 16:29:12',NULL),(13,3,1,'staff',1,'2026-07-19 12:21:52',NULL),(14,5,2,'staff',1,'2026-07-19 12:21:59',NULL),(15,6,3,'staff',1,'2026-07-19 12:22:07',NULL),(16,7,1,'staff',1,'2026-07-19 12:23:06',NULL),(17,1,4,'admin',1,'2026-07-19 12:47:18',NULL);
/*!40000 ALTER TABLE `user_shops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passcode` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','shopkeeper','staff','individual') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` int DEFAULT NULL,
  `default_module` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shop_id` int DEFAULT NULL,
  `shop_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `area` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_shop` (`shop_id`),
  CONSTRAINT `fk_users_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'2493c575-4315-4cf8-93ca-3448bc60d811','Buddha Paul','admin@shopkeeper.com','9876543210','$2a$10$Jk5igX5nWMAWcPnO2jbllOZkDvgMFA3LFSr4hBwsf4sRW73qirJN2',NULL,'admin',NULL,NULL,1,'Admin Shop','123 Admin Street',1,'2026-07-17 19:29:41','2026-07-19 12:59:12','Silchar Bylane-6 2nd Link Road','000000'),(2,'814ee41c-f799-441f-8899-cbf99e757a2d','Demo Shopkeeper','demo@shopkeeper.com','9876543211','$2a$10$Pea2JrYaT9fEIwsSCQKi3u04wKjdbFF9jGyAFJ/oGGnmot35bpAeq',NULL,'admin',NULL,NULL,1,'Demo General Store','456 Market Road, City',1,'2026-07-17 19:29:41','2026-07-17 19:29:41',NULL,NULL),(3,'1496453b-f23a-4766-a5a2-67511821384c','Staff','staff@shopkeeper.com','123456789','$2a$10$5GiZU.zksVzQayTq.RfLCObslQZ5Wtf8Nejh.iZfVP7jiezUxGKG6',NULL,'staff',NULL,NULL,1,NULL,NULL,1,'2026-07-17 20:06:13','2026-07-18 16:50:27',NULL,NULL),(5,'6a4f5b70-8656-4eb5-88b6-f62dea0af0f2','staff2','staff2@shopkeeper.com','6765654543','$2a$10$QIRtlLARZrTK2q.ZWmVBCuzKi7QnrgN0VqViEuN2T.PZefWM1aq6G',NULL,'staff',NULL,NULL,NULL,NULL,NULL,1,'2026-07-18 16:55:00','2026-07-18 17:19:44',NULL,NULL),(6,'bb194cd8-aec7-401f-9d1d-fa38cff16c69','Staff3','staff3@shopkeeper.com','12323232456','$2a$10$y3RW7R1sVW7xCMU3ivE15ulWRCnF100sd/JQt2i/lJq1btQ5swlua',NULL,'staff',NULL,NULL,NULL,NULL,NULL,1,'2026-07-18 17:34:01','2026-07-18 17:34:01',NULL,NULL),(7,'075cdac9-b5a0-4072-96d1-9c5d452835a9','Staff1','staff1@shopkeeper.com','1232343456','$2a$10$hcryVj71mxqBEZILLWwri.FJ2ZDxOlrmaqjtS6sshPajo.9svep6G',NULL,'staff',NULL,NULL,NULL,NULL,NULL,1,'2026-07-18 19:50:34','2026-07-18 19:50:34',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'shopkeeper_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-19 18:40:45
