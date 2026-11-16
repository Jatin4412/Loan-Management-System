const express = require('express');
const router = express.Router();

const customer = require('../controllers/customercontroller');
const loan = require('../controllers/loancontroller');
const payment = require('../controllers/paymentcontroller');
const dashboard = require('../controllers/dashboardcontroller');
const auth = require('../controllers/authcontroller');
const settings = require('../controllers/settingscontroller');
const report = require('../controllers/reportcontroller');
const assistant = require('../controllers/assistantcontroller'); 

const { verifyToken, authorizeRole } = require('../middleware/auth');

router.post('/login', auth.login);
router.post('/register', auth.register);

router.get('/dashboard', verifyToken, dashboard.getStats);
router.get('/dashboard/recent-loans', verifyToken, dashboard.getRecentLoans);
router.get('/dashboard/loan-distribution', verifyToken, dashboard.getLoanDistribution);

router.post('/customers', verifyToken, customer.createCustomer);
router.get('/customers', verifyToken, customer.getCustomers);
router.get('/customers/:id', verifyToken, customer.getCustomerById);
router.put('/customers/:id', updatedStatus => customer.updateCustomer);
router.delete('/customers/:id', verifyToken, customer.deleteCustomer);
router.get('/customers/:id/loans', verifyToken, customer.getCustomerLoans);
router.get('/customers/:id/stats', verifyToken, customer.getCustomerStats);

router.post('/loans', verifyToken, loan.issueLoan);
router.get('/loans', verifyToken, loan.getLoans);
router.get('/loans/:id', verifyToken, loan.getLoanById);
router.put('/loans/:id/approve', verifyToken, loan.approveLoan);
router.put('/loans/:id/reject', verifyToken, loan.rejectLoan);
router.put('/loans/:id/close', verifyToken, loan.closeLoan);
router.delete('/loans/:id', verifyToken, loan.deleteLoan);

router.post('/payments', verifyToken, payment.receivePayment);
router.post('/payments/manual-adjust', verifyToken, payment.receivePayment);
router.get('/payments', verifyToken, payment.getPayments);
router.get('/payments/schedule', verifyToken, payment.getLoanSchedule);
router.get('/payments/:id', verifyToken, payment.getPaymentById);
router.post('/waive', verifyToken, payment.applyAdminWaiver);

router.get('/reports/loans', verifyToken, report.loanReport);
router.get('/reports/collections', verifyToken, report.collectionReport);
router.get('/reports/customers', verifyToken, report.customerReport);
router.get('/reports/overdue', verifyToken, report.overdueReport);
router.get('/reports/active-loans', verifyToken, report.activeLoanReport);
router.get('/reports/closed-loans', verifyToken, report.closedLoanReport);
router.get('/reports/monthly-collections', verifyToken, report.monthlyCollectionReport);

router.post('/assistant/chat', verifyToken, assistant.chat);

router.put('/settings', verifyToken, settings.update);
router.get('/settings', verifyToken, settings.getSettings);
router.put('/settings/change-password', verifyToken, settings.changePassword);

module.exports = router;