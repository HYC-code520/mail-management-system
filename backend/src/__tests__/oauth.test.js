const request = require('supertest');
const app = require('../server');
const { supabaseAdmin, supabase } = require('../services/supabase.service');

// Mock the supabaseAdmin
jest.mock('../services/supabase.service', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=true&state=test-user-id'),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expiry_date: Date.now() + 3600000
          }
        }),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new_mock_access_token',
            refresh_token: 'mock_refresh_token',
            expiry_date: Date.now() + 3600000
          }
        }),
        revokeCredentials: jest.fn().mockResolvedValue(true)
      }))
    },
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: { email: 'test@gmail.com' }
        })
      }
    })
  }
}));

describe('OAuth API', () => {
  let mockToken;
  let mockUserId = 'test-user-id-123';

  beforeEach(() => {
    // Mock a valid JWT token
    mockToken = 'mock-jwt-token';

    // Mock Supabase auth.getUser for authentication middleware
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: mockUserId,
          email: 'test@pursuit.org'
        }
      },
      error: null
    });

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/oauth/gmail/auth-url', () => {
    it('should return OAuth authorization URL when authenticated', async () => {
      const response = await request(app)
        .get('/api/oauth/gmail/auth-url')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body.authUrl).toContain('accounts.google.com');
      expect(response.body.authUrl).toContain('state=test-user-id');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/oauth/gmail/auth-url')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('GET /api/oauth/gmail/callback', () => {
    beforeEach(() => {
      // Mock supabaseAdmin.from() for token storage
      const mockChain = {
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      };
      supabaseAdmin.from.mockReturnValue(mockChain);
    });

    it('should handle successful OAuth callback', async () => {
      const response = await request(app)
        .get('/api/oauth/gmail/callback')
        .query({
          code: 'mock-auth-code',
          state: mockUserId
        })
        .expect(302); // Redirect

      expect(response.headers.location).toContain('/dashboard/settings?gmail=connected');
    });

    it('should redirect to error page when code is missing', async () => {
      const response = await request(app)
        .get('/api/oauth/gmail/callback')
        .query({ state: mockUserId })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Authorization code is required');
    });

    it('should redirect to error page when state is missing', async () => {
      const response = await request(app)
        .get('/api/oauth/gmail/callback')
        .query({ code: 'mock-code' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'User state is required');
    });
  });

  describe('GET /api/oauth/gmail/status', () => {
    it('should return connected status when tokens exist', async () => {
      // Mock token data exists
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: mockUserId,
            gmail_address: 'test@gmail.com',
            access_token: 'token',
            refresh_token: 'refresh',
            token_expiry: new Date()
          },
          error: null
        })
      };
      supabaseAdmin.from.mockReturnValue(mockChain);

      const response = await request(app)
        .get('/api/oauth/gmail/status')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('connected', true);
      expect(response.body).toHaveProperty('gmailAddress', 'test@gmail.com');
    });

    it('should return not connected when no tokens exist', async () => {
      // Mock no token data
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found' }
        })
      };
      supabaseAdmin.from.mockReturnValue(mockChain);

      const response = await request(app)
        .get('/api/oauth/gmail/status')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('connected', false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/oauth/gmail/status')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('POST /api/oauth/gmail/disconnect', () => {
    it('should successfully disconnect Gmail', async () => {
      // Mock getTokensForUser (select query)
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          user_id: mockUserId,
          gmail_address: 'test@gmail.com',
          access_token: 'token',
          refresh_token: 'refresh'
        },
        error: null
      });

      // Mock revokeTokens (delete query)
      const deleteMock = jest.fn().mockReturnThis();
      const deleteEqMock = jest.fn().mockResolvedValue({ data: null, error: null });

      supabaseAdmin.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
        delete: deleteMock
      });

      // Setup chaining for select
      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      // Setup chaining for delete
      deleteMock.mockReturnValue({ eq: deleteEqMock });

      const response = await request(app)
        .post('/api/oauth/gmail/disconnect')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Gmail disconnected successfully');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/oauth/gmail/disconnect')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});

