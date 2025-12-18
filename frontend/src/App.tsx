import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Pages
import SignInPage from './pages/SignIn.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import ContactsPage from './pages/Contacts.tsx';
import ContactDetailPage from './pages/ContactDetail.tsx';
import NewContactPage from './pages/NewContact.tsx';
import MailItemsPage from './pages/MailItems.tsx';
import NewMailItemPage from './pages/NewMailItem.tsx';
import SendMessagePage from './pages/SendMessage.tsx';
import TemplatesPage from './pages/Templates.tsx';
import MailManagementPage from './pages/MailManagement.tsx';
import IntakePage from './pages/Intake.tsx';
import LogPage from './pages/Log.tsx';
import TodoListPage from './pages/TodoList.tsx';
import ScanSessionPage from './pages/ScanSession.tsx';
import DesignSystemPage from './pages/DesignSystem.tsx';
import SettingsPage from './pages/Settings.tsx';
import FollowUpsPage from './pages/FollowUps.tsx';
import FeesPage from './pages/Fees.tsx';

// Layout
import { AuthProvider } from './contexts/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import DashboardLayout from './components/layouts/DashboardLayout.tsx';
import ScrollToTop from './components/ScrollToTop.tsx';

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<SignInPage />} />
          <Route path="/signin" element={<SignInPage />} />
          
          {/* Protected Routes with Dashboard Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="mail" element={<MailManagementPage />} />
            {/* Keep old routes for backward compatibility */}
            <Route path="intake" element={<IntakePage />} />
            <Route path="log" element={<LogPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="contacts/new" element={<NewContactPage />} />
            <Route path="contacts/:id" element={<ContactDetailPage />} />
            <Route path="contacts/:id/message" element={<SendMessagePage />} />
            <Route path="mail-items" element={<MailItemsPage />} />
            <Route path="mail-items/new" element={<NewMailItemPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="todos" element={<TodoListPage />} />
            <Route path="follow-ups" element={<FollowUpsPage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="scan" element={<ScanSessionPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="design-system" element={<DesignSystemPage />} />
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
