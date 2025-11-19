import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Pages
import HomePage from './pages/Home.tsx';
import SignInPage from './pages/SignIn.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import ContactsPage from './pages/Contacts.tsx';
import ContactDetailPage from './pages/ContactDetail.tsx';
import NewContactPage from './pages/NewContact.tsx';
import MailItemsPage from './pages/MailItems.tsx';
import NewMailItemPage from './pages/NewMailItem.tsx';
import SendMessagePage from './pages/SendMessage.tsx';

// Layout
import { AuthProvider } from './contexts/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import DashboardLayout from './components/layouts/DashboardLayout.tsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/signin" element={<SignInPage />} />
          
          {/* Protected Routes with Dashboard Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="contacts/new" element={<NewContactPage />} />
            <Route path="contacts/:id" element={<ContactDetailPage />} />
            <Route path="contacts/:id/message" element={<SendMessagePage />} />
            <Route path="mail-items" element={<MailItemsPage />} />
            <Route path="mail-items/new" element={<NewMailItemPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
