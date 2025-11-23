import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode, createContext } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
  })),
};

// Create Mock AuthContext
const AuthContext = createContext<any>(null);

// Mock AuthContext Provider
interface MockAuthProviderProps {
  children: ReactNode;
  value?: any;
}

export const MockAuthProvider = ({ children, value }: MockAuthProviderProps) => {
  const defaultValue = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  };

  return (
    <AuthContext.Provider value={value || defaultValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: any;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    authValue,
    initialRoute = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MockAuthProvider value={authValue}>
          {children}
        </MockAuthProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };

