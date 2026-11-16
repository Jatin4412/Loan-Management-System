import React, { useState, useEffect } from "react";
import "./App.css";

import Login from "./Login";
import Dashboard from "./Dashboard";
import Customers from "./Customers";
import CreateCustomer from "./CreateCustomer";
import LoanApplication from "./LoanApplication";
import Reports from "./Reports";          
import Payments from "./Payments";        
import Settings from "./Settings";
import CustomerProfile from "./CustomerProfile";
import AssistantChat from "./components/AssistantChat"; 

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [reportLoans, setReportLoans] = useState([]);
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentsLedger, setPaymentsLedger] = useState([]); 
  const [selectedCustomer, setSelectedCustomer] = useState(null); 

  const API_BASE_URL = "http://localhost:4000/api";

  const themeTemplates = [
    { 
      name: "Glassmorphic Dark", 
      vars: { 
        "--bg-main": "#0b1120", 
        "--accent-color": "#22d3ee", 
        "--card-bg": "rgba(255, 255, 255, 0.03)", 
        "--card-border": "rgba(255, 255, 255, 0.06)",
        "--text-muted": "#64748b",
        "--input-focus": "#22d3ee"
      } 
    },
    { 
      name: "Nordic Midnight", 
      vars: { 
        "--bg-main": "#0f172a", 
        "--accent-color": "#38bdf8", 
        "--card-bg": "#1e293b", 
        "--card-border": "rgba(56, 189, 248, 0.2)",
        "--text-muted": "#94a3b8",
        "--input-focus": "#38bdf8"
      } 
    },
    { 
      name: "Pure Cyber Black", 
      vars: { 
        "--bg-main": "#000000", 
        "--accent-color": "#10b981", 
        "--card-bg": "#0a0a0a", 
        "--card-border": "rgba(16, 185, 129, 0.25)",
        "--text-muted": "#737373",
        "--input-focus": "#10b981"
      } 
    }
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem("workspace-theme") || "Glassmorphic Dark";
    const target = themeTemplates.find(t => t.name === savedTheme);
    if (target && target.vars) {
      Object.entries(target.vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
  }, []);

  const fetchDatabaseData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};

      const custRes = await fetch(`${API_BASE_URL}/customers`, { headers });
      const custData = await custRes.json();
      if (custData.success) {
        setCustomers(custData.customers || custData.data || []);
      }

      const loanRes = await fetch(`${API_BASE_URL}/loans`, { headers });
      const loanData = await loanRes.json();
      if (loanData.success) {
        setLoans(loanData.loans || []);
      }

      const reportRes = await fetch(`${API_BASE_URL}/reports/loans`, { headers });
      const reportData = await reportRes.json();
      if (reportData.success) {
        setReportLoans(reportData.report || []);
      }
    } catch (error) {
      console.error("Error synchronizing client ledger with backend:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDatabaseData();
    }
  }, [isAuthenticated]);

  const handleRegisterCustomer = async (newCust) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(newCust)
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseData(); 
        setCurrentView("Customers");
      }
    } catch (error) {
      console.error("Failed to write new customer row:", error);
    }
  };

  const handleCreateLoan = async (newLoan) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/loans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(newLoan)
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseData(); 
      }
    } catch (error) {
      console.error("Failed to commit new loan row asset:", error);
    }
  };

  const handleUpdateLoanStatus = async (loanId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const actionEndpoint = newStatus === "APPROVED" ? "approve" : "reject";
      
      const res = await fetch(`${API_BASE_URL}/loans/${loanId}/${actionEndpoint}`, {
        method: "PUT",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseData(); 
      }
    } catch (error) {
      console.error("Failed to post underwriting processing transition updates:", error);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseData();
        if (selectedCustomer?.id === customerId) {
          setSelectedCustomer(null);
        }
        setCurrentView("Customers");
      }
    } catch (error) {
      console.error("Failed to erase profile reference registry entity:", error);
    }
  };

  const handleRegisterPayment = async (newTxn) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(newTxn)
      });
      const data = await res.json();
      if (data.success) {
        setPaymentsLedger([data.transaction, ...paymentsLedger]);
        fetchDatabaseData(); 
      }
    } catch (error) {
      console.error("Payment clearing execution failure:", error);
    }
  };

  const navigateToView = (viewName) => {
    setCurrentView(viewName);
    setIsSidebarOpen(false);
  };



const handleDeleteLoan = async (loanId) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/loans/${loanId}`, {
      method: "DELETE",
      headers: { 
        "Authorization": `Bearer ${token}` 
      }
    });
    const data = await res.json();
    if (data.success) {
      fetchDatabaseData();
    }
  } catch (error) {
    console.error("Failed to delete loan record:", error);
    alert("Could not delete the loan record.");
  }
};



  return (
    <>
      {!isAuthenticated ? (
        <Login onLogin={() => setIsAuthenticated(true)} />
      ) : (
        <div className="app-layout">
          
          <div 
            className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`}
            onClick={() => setIsSidebarOpen(false)}
          />

          <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
            <div>
              <div className="sidebar-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span className="sidebar-badge">INR Core Stack</span>
                  <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>✖</button>
                </div>
                <h2>SmarterLoans</h2>
              </div>

              <nav className="sidebar-nav">
                {[
                  "Dashboard",
                  "Customers",
                  "Loan Application",
                  "Payments",     
                  "Reports",
                  "Settings"
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => navigateToView(item)}
                    className={currentView === item || (item === "Customers" && currentView === "Customer Profile") ? "nav-btn active" : "nav-btn"}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>

            <div className="sidebar-footer">
              <div>
                <p>Manager Desk</p>
                <small>ID: local_admin</small>
              </div>
              <button
                className="logout-btn"
                onClick={() => {
                  setIsAuthenticated(false);
                  setCurrentView("Dashboard");
                  setIsSidebarOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="logout-svg-icon">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </aside>

          <main className="main-content">
            <header className="page-header">
              <div className="header-title-container">
                <button 
                  className="hamburger-menu-btn" 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  aria-label="Toggle Navigation Menu"
                >
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                </button>
                
                <div>
                  <h1>{currentView === "Customer Profile" ? "Customer Profile" : currentView}</h1>
                  <p>Loan Management System</p>
                </div>
              </div>
            </header>

            {currentView === "Dashboard" && (
              <Dashboard
                dataLoans={loans}
                dataCust={customers}
                setView={setCurrentView}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
              />
            )}

            {currentView === "Customers" && (
              <Customers
                dataCust={customers}
                dataLoans={loans}
                setView={setCurrentView}
                setSelectedCustomer={setSelectedCustomer}
                onDeleteCustomer={handleDeleteCustomer}
              />
            )}

            {currentView === "Create Customer" && (
              <CreateCustomer
                onSubmitCustomer={handleRegisterCustomer}
                setView={setCurrentView}
              />
            )}

            {currentView === "Loan Application" && (
              <LoanApplication
                onSubmit={handleCreateLoan}
                dataCust={customers}
                dataLoans={loans}
                onUpdateLoanStatus={handleUpdateLoanStatus}
                onDeleteLoan={handleDeleteLoan}
              />
            )}

            {currentView === "Payments" && (
              <Payments 
                dataLoans={loans} 
                onAddPaymentRecord={handleRegisterPayment} 
              />
            )}

            {currentView === "Reports" && (
              <Reports dataLoans={reportLoans} />
            )}

            {currentView === "Settings" && (
              <Settings />
            )}

            {currentView === "Customer Profile" && (
              <CustomerProfile
                customer={selectedCustomer}
                loans={loans}
                setView={setCurrentView}
                onDeleteCustomer={handleDeleteCustomer}
              />
            )}
          </main>

          <AssistantChat currentView={currentView} />
        </div>
      )}
    </>
  );
}