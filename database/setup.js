const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_NAME = process.env.DB_NAME || 'loan_management';
const DEMO_EMAIL = 'demo.admin@smarterloans.local';
const DEMO_PASSWORD = 'Demo@12345!';

function assertConfig() {
  if (!process.env.DB_HOST || !process.env.DB_USER) {
    throw new Error('Set DB_HOST and DB_USER in the repository root .env file first.');
  }
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    throw new Error('DB_NAME may contain only letters, numbers and underscores.');
  }
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function dateOnly(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function addMonthsClamped(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function calculateSchedule(loan, today) {
  const principal = Number(loan.principal);
  const monthlyRate = Number(loan.rate) / 12 / 100;
  const tenure = Number(loan.tenure);
  const emi = monthlyRate === 0
    ? principal / tenure
    : principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
      (Math.pow(1 + monthlyRate, tenure) - 1);

  const roundedEmi = roundMoney(emi);
  const startDate = addMonthsClamped(today, -loan.monthsAgo);
  const rows = [];
  let balance = principal;

  for (let installment = 1; installment <= tenure; installment += 1) {
    const interest = roundMoney(balance * monthlyRate);
    let principalPart = roundMoney(roundedEmi - interest);
    if (installment === tenure) principalPart = roundMoney(balance);

    const dueDate = addMonthsClamped(startDate, installment);
    const isPaid = loan.status === 'CLOSED' || installment <= loan.paidInstallments;
    const isOverdue = !isPaid && loan.status === 'APPROVED' &&
      dateOnly(dueDate) <= dateOnly(today);
    const status = isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING';

    rows.push({
      installment,
      dueDate: dateOnly(dueDate),
      amount: roundedEmi,
      principalPart,
      interest,
      paidPrincipal: isPaid ? principalPart : 0,
      paidInterest: isPaid ? interest : 0,
      status,
      paidAt: isPaid ? dateOnly(dueDate) + ' 12:00:00' : null
    });

    balance = roundMoney(balance - principalPart);
  }

  const principalPaid = rows.reduce((sum, row) => sum + row.paidPrincipal, 0);
  return {
    emi: roundedEmi,
    total: roundMoney(roundedEmi * tenure),
    balance: loan.status === 'CLOSED' ? 0 : Math.max(0, roundMoney(principal - principalPaid)),
    startDate: dateOnly(startDate),
    rows
  };
}

async function getOrCreateDemoUser(connection) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [existing] = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [DEMO_EMAIL]
  );

  if (existing.length) {
    await connection.execute(
      'UPDATE users SET name = ?, password = ?, role = ?, status = ? WHERE id = ?',
      ['Demo Administrator', passwordHash, 'ADMIN', 'ACTIVE', existing[0].id]
    );
    return existing[0].id;
  }

  const [result] = await connection.execute(
    'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
    ['Demo Administrator', DEMO_EMAIL, passwordHash, 'ADMIN', 'ACTIVE']
  );
  return result.insertId;
}

async function getOrCreateCustomer(connection, customer) {
  const [existing] = await connection.execute(
    'SELECT id FROM customers WHERE email = ? ORDER BY id ASC LIMIT 1',
    [customer.email]
  );

  if (existing.length) {
    await connection.execute(
      'UPDATE customers SET name = ?, occupation = ?, monthly_income = ? WHERE id = ?',
      [customer.name, customer.occupation, customer.monthlyIncome, existing[0].id]
    );
    return existing[0].id;
  }

  const [result] = await connection.execute(
    'INSERT INTO customers (name, email, occupation, monthly_income) VALUES (?, ?, ?, ?)',
    [customer.name, customer.email, customer.occupation, customer.monthlyIncome]
  );
  return result.insertId;
}

async function getOrCreateLoan(connection, customerId, loan, schedule, userId) {
  const approvedAt = ['APPROVED', 'CLOSED'].includes(loan.status)
    ? schedule.startDate + ' 12:00:00'
    : null;

  const [existing] = await connection.execute(
    'SELECT id FROM loans WHERE loan_number = ? LIMIT 1',
    [loan.number]
  );

  if (existing.length) {
    await connection.execute(
      'UPDATE loans SET customer_id = ?, principal_amount = ?, interest_rate = ?, tenure_months = ?, emi_amount = ?, total_amount = ?, balance = ?, loan_type = ?, status = ?, approved_by = ?, approved_at = ?, created_at = ? WHERE id = ?',
      [
        customerId, loan.principal, loan.rate, loan.tenure, schedule.emi,
        schedule.total, schedule.balance, loan.type, loan.status,
        approvedAt ? userId : null, approvedAt,
        schedule.startDate + ' 12:00:00', existing[0].id
      ]
    );
    return existing[0].id;
  }

  const [result] = await connection.execute(
    'INSERT INTO loans (loan_number, customer_id, principal_amount, interest_rate, tenure_months, emi_amount, total_amount, balance, loan_type, status, approved_by, approved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      loan.number, customerId, loan.principal, loan.rate, loan.tenure,
      schedule.emi, schedule.total, schedule.balance, loan.type, loan.status,
      approvedAt ? userId : null, approvedAt, schedule.startDate + ' 12:00:00'
    ]
  );
  return result.insertId;
}

async function upsertScheduleRows(connection, loanId, rows) {
  const sql = 'INSERT INTO loan_schedule (loan_id, installment_no, due_date, amount, principal_component, interest_component, penalty_component, principal_paid, interest_paid, penalty_paid, status, paid_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?) ON DUPLICATE KEY UPDATE due_date = VALUES(due_date), amount = VALUES(amount), principal_component = VALUES(principal_component), interest_component = VALUES(interest_component), principal_paid = VALUES(principal_paid), interest_paid = VALUES(interest_paid), penalty_paid = 0, status = VALUES(status), paid_at = VALUES(paid_at)';

  for (const row of rows) {
    await connection.execute(sql, [
      loanId, row.installment, row.dueDate, row.amount,
      row.principalPart, row.interest, row.paidPrincipal,
      row.paidInterest, row.status, row.paidAt
    ]);
  }
}

async function upsertDemoPayments(connection, loanId, loanNumber, rows, userId) {
  let paymentCount = 0;

  for (const row of rows) {
    if (row.status !== 'PAID') continue;

    const reference = 'DEMO-' + loanNumber + '-' + String(row.installment).padStart(2, '0');
    const paymentDate = row.dueDate + ' 12:00:00';
    const amount = roundMoney(row.paidPrincipal + row.paidInterest);

    const [existing] = await connection.execute(
      'SELECT id FROM payments WHERE transaction_reference = ? LIMIT 1',
      [reference]
    );

    let paymentId;
    if (existing.length) {
      paymentId = existing[0].id;
      await connection.execute(
        'UPDATE payments SET loan_id = ?, amount = ?, payment_mode = ?, received_by = ?, remarks = ?, payment_date = ? WHERE id = ?',
        [loanId, amount, 'DEMO', userId, 'Synthetic sample payment for local testing', paymentDate, paymentId]
      );
    } else {
      const [result] = await connection.execute(
        'INSERT INTO payments (loan_id, amount, payment_mode, transaction_reference, received_by, remarks, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [loanId, amount, 'DEMO', reference, userId, 'Synthetic sample payment for local testing', paymentDate]
      );
      paymentId = result.insertId;
    }

    await connection.execute(
      'INSERT INTO receipts (payment_id, receipt_number) VALUES (?, ?) ON DUPLICATE KEY UPDATE receipt_number = VALUES(receipt_number)',
      [paymentId, 'DEMO-RCPT-' + loanNumber + '-' + String(row.installment).padStart(2, '0')]
    );
    paymentCount += 1;
  }

  return paymentCount;
}

async function seedSampleData(connection) {
  const userId = await getOrCreateDemoUser(connection);
  const customers = [
    { key: 'C1', name: 'Aarav Mehta', email: 'aarav.mehta@example.test', occupation: 'Software Engineer', monthlyIncome: 85000 },
    { key: 'C2', name: 'Diya Sharma', email: 'diya.sharma@example.test', occupation: 'Business Owner', monthlyIncome: 145000 },
    { key: 'C3', name: 'Kabir Verma', email: 'kabir.verma@example.test', occupation: 'Consultant', monthlyIncome: 110000 },
    { key: 'C4', name: 'Anaya Iyer', email: 'anaya.iyer@example.test', occupation: 'Architect', monthlyIncome: 95000 },
    { key: 'C5', name: 'Rohan Kapoor', email: 'rohan.kapoor@example.test', occupation: 'Accountant', monthlyIncome: 72000 },
    { key: 'C6', name: 'Mira Nair', email: 'mira.nair@example.test', occupation: 'Marketing Manager', monthlyIncome: 105000 }
  ];

  const customerIds = {};
  for (const customer of customers) {
    customerIds[customer.key] = await getOrCreateCustomer(connection, customer);
  }

  const loans = [
    { number: 'DEMO-LN-1001', customer: 'C1', principal: 250000, rate: 11.5, tenure: 12, type: 'PERSONAL', status: 'APPROVED', monthsAgo: 8, paidInstallments: 4 },
    { number: 'DEMO-LN-1002', customer: 'C2', principal: 1200000, rate: 8.5, tenure: 24, type: 'HOME', status: 'APPROVED', monthsAgo: 5, paidInstallments: 4 },
    { number: 'DEMO-LN-1003', customer: 'C3', principal: 650000, rate: 9.25, tenure: 18, type: 'VEHICLE', status: 'APPROVED', monthsAgo: 3, paidInstallments: 2 },
    { number: 'DEMO-LN-1004', customer: 'C4', principal: 400000, rate: 12, tenure: 12, type: 'BUSINESS', status: 'PENDING', monthsAgo: 1, paidInstallments: 0 },
    { number: 'DEMO-LN-1005', customer: 'C5', principal: 150000, rate: 13.5, tenure: 12, type: 'PERSONAL', status: 'REJECTED', monthsAgo: 2, paidInstallments: 0 },
    { number: 'DEMO-LN-1006', customer: 'C6', principal: 900000, rate: 9, tenure: 12, type: 'HOME', status: 'CLOSED', monthsAgo: 15, paidInstallments: 12 }
  ];

  let paymentCount = 0;
  for (const loan of loans) {
    const schedule = calculateSchedule(loan, new Date());
    const loanId = await getOrCreateLoan(connection, customerIds[loan.customer], loan, schedule, userId);
    await upsertScheduleRows(connection, loanId, schedule.rows);
    paymentCount += await upsertDemoPayments(connection, loanId, loan.number, schedule.rows, userId);
  }

  return { userId, customerCount: customers.length, loanCount: loans.length, paymentCount };
}

async function main() {
  assertConfig();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    connectTimeout: 15000
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    schema = schema
      .replace(/CREATE DATABASE IF NOT EXISTS loan_management/i, 'CREATE DATABASE IF NOT EXISTS ' + DB_NAME)
      .replace(/USE loan_management\s*;/i, 'USE ' + DB_NAME + ';');

    console.log('Creating database and tables...');
    await connection.query(schema);

    console.log('Creating synthetic demo records...');
    await connection.beginTransaction();

    try {
      const summary = await seedSampleData(connection);
      await connection.commit();

      const [counts] = await connection.execute(
        'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM customers) AS customers, (SELECT COUNT(*) FROM loans) AS loans, (SELECT COUNT(*) FROM loan_schedule) AS installments, (SELECT COUNT(*) FROM payments) AS payments, (SELECT COUNT(*) FROM receipts) AS receipts'
      );

      console.log('\nDatabase setup completed successfully.');
      console.log('Database: ' + DB_NAME);
      console.log('Demo customers added/updated: ' + summary.customerCount);
      console.log('Demo loans added/updated: ' + summary.loanCount);
      console.log('Demo payments added/updated: ' + summary.paymentCount);
      console.log('Current table counts:', counts[0]);
      console.log('\nDemo login');
      console.log('Email: ' + DEMO_EMAIL);
      console.log('Password: ' + DEMO_PASSWORD);
      console.log('\nSample rows are synthetic and contain no real identity documents or customer phone numbers.');
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('\nDatabase setup failed: ' + error.message);
  process.exitCode = 1;
});