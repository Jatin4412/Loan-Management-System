CREATE DATABASE IF NOT EXISTS loan_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE loan_management;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'USER',
  phone VARCHAR(25) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(25) NULL,
  email VARCHAR(255) NULL,
  aadhaar VARCHAR(20) NULL,
  pan VARCHAR(20) NULL,
  address TEXT NULL,
  occupation VARCHAR(120) NULL,
  monthly_income DECIMAL(15,2) NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customers_name (name),
  KEY idx_customers_phone (phone),
  KEY idx_customers_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS loans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  loan_number VARCHAR(40) NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(7,3) NOT NULL,
  tenure_months INT UNSIGNED NOT NULL,
  emi_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  loan_type VARCHAR(40) NOT NULL DEFAULT 'PERSONAL',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_loans_loan_number (loan_number),
  KEY idx_loans_customer_id (customer_id),
  KEY idx_loans_status (status),
  KEY idx_loans_loan_type (loan_type),
  CONSTRAINT fk_loans_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_loans_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS loan_schedule (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  loan_id BIGINT UNSIGNED NOT NULL,
  installment_no INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  principal_component DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  interest_component DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  penalty_component DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  principal_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  interest_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  penalty_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedule_loan_installment (loan_id, installment_no),
  KEY idx_schedule_status_due_date (status, due_date),
  CONSTRAINT fk_schedule_loan
    FOREIGN KEY (loan_id) REFERENCES loans(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  loan_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_mode VARCHAR(40) NOT NULL,
  transaction_reference VARCHAR(120) NULL,
  received_by BIGINT UNSIGNED NULL,
  remarks TEXT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_loan_id (loan_id),
  KEY idx_payments_payment_date (payment_date),
  KEY idx_payments_transaction_reference (transaction_reference),
  CONSTRAINT fk_payments_loan
    FOREIGN KEY (loan_id) REFERENCES loans(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_payments_received_by
    FOREIGN KEY (received_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  receipt_number VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_receipts_payment_id (payment_id),
  UNIQUE KEY uq_receipts_receipt_number (receipt_number),
  CONSTRAINT fk_receipts_payment
    FOREIGN KEY (payment_id) REFERENCES payments(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_customer_id (customer_id),
  CONSTRAINT fk_documents_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'SYSTEM',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_status (status),
  KEY idx_notifications_customer_id (customer_id),
  CONSTRAINT fk_notifications_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(150) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_user_id (user_id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- The application currently inserts loans without setting loan_number.
-- Keep this column nullable until the app defines a loan-number generation rule.

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_title VARCHAR(255) NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  section VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  chunk_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_knowledge_chunk_hash (chunk_hash),
  FULLTEXT KEY ft_knowledge_search (document_title, section, content)
) ENGINE=InnoDB;
