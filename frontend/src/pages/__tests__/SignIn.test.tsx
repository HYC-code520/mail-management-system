import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import SignInPage from '../SignIn';
import userEvent from '@testing-library/user-event';
import { supabase } from '../../lib/supabase';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form', () => {
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    expect(screen.getByText('Mei Way')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('toggles between sign in and sign up', async () => {
    const user = userEvent.setup();
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    
    await user.click(screen.getByText(/don't have an account\? sign up/i));
    
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('handles successful sign in', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    (supabase.auth.signInWithPassword as any) = mockSignIn;
    
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('handles sign in error', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });
    (supabase.auth.signInWithPassword as any) = mockSignIn;
    
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it('handles successful sign up', async () => {
    const user = userEvent.setup();
    const mockSignUp = vi.fn().mockResolvedValue({ error: null });
    (supabase.auth.signUp as any) = mockSignUp;
    
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    // Switch to sign up mode
    await user.click(screen.getByText(/don't have an account\? sign up/i));
    
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 1000))
    );
    (supabase.auth.signInWithPassword as any) = mockSignIn;
    
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    // Button should be disabled while loading
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Loading...');
    });
  });

  it('requires email and password fields', () => {
    render(<SignInPage />, { authValue: { user: null, loading: false } });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
    expect(passwordInput).toHaveAttribute('minLength', '6');
  });
});



