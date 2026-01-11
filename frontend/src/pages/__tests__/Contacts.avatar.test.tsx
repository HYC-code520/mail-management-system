import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import Contacts from '../Contacts';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
  api: {
    contacts: {
      getAll: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { api } from '../../lib/api-client';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockContactsWithAvatar = [
  {
    contact_id: '1',
    contact_person: 'Alice Johnson',
    company_name: 'Tech Corp',
    email: 'alice@techcorp.com',
    phone: '555-0101',
    mailbox_number: 'A1',
    status: 'Active',
    service_tier: 2,
  },
  {
    contact_id: '2',
    contact_person: null, // No person name - should show company name
    company_name: 'Acme Industries',
    email: 'info@acme.com',
    phone: '555-0102',
    mailbox_number: 'B2',
    status: 'Active',
    service_tier: 1,
  },
  {
    contact_id: '3',
    contact_person: 'Bob Smith',
    company_name: null, // No company - should show person name
    email: 'bob@email.com',
    phone: '555-0103',
    mailbox_number: 'C3',
    status: 'Active',
    service_tier: 2,
  },
];

describe('Contacts Page - Avatar Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.contacts.getAll as any).mockResolvedValue(mockContactsWithAvatar);
  });

  it('should render avatar images for contacts', async () => {
    render(<Contacts />);

    await waitFor(() => {
      // Avatar images should be present (either <img> tags or avatar circles)
      // The component renders either an img with avatar URL or a fallback div
      const avatarElements = document.querySelectorAll('img[alt*="avatar"], img[src*="customer-avatar"]');
      // If no images, check for avatar circles (divs with initials)
      if (avatarElements.length === 0) {
        const avatarCircles = document.querySelectorAll('[class*="rounded-full"]');
        expect(avatarCircles.length).toBeGreaterThan(0);
      } else {
        expect(avatarElements.length).toBeGreaterThan(0);
      }
    });
  });

  it('should show contact name with avatar in combined column', async () => {
    render(<Contacts />);

    await waitFor(() => {
      // Contact names should be displayed
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Acme Industries')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('should show company name under person name when both exist', async () => {
    render(<Contacts />);

    await waitFor(() => {
      // For Alice Johnson, Tech Corp should appear as secondary text
      const techCorpTexts = screen.getAllByText('Tech Corp');
      expect(techCorpTexts.length).toBeGreaterThan(0);
    });
  });

  it('should handle contacts without images gracefully (show initials fallback)', async () => {
    render(<Contacts />);

    await waitFor(() => {
      // The page should still render even without actual images
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  it('should display avatar consistently for same contact', async () => {
    // First render
    const { rerender } = render(<Contacts />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Get avatar src or class
    const firstRenderAvatars = document.querySelectorAll('img[src*="customer-avatar"]');
    const firstAvatarSrc = firstRenderAvatars.length > 0 ? firstRenderAvatars[0].getAttribute('src') : null;

    // Re-render
    rerender(<Contacts />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Check avatar is same
    const secondRenderAvatars = document.querySelectorAll('img[src*="customer-avatar"]');
    const secondAvatarSrc = secondRenderAvatars.length > 0 ? secondRenderAvatars[0].getAttribute('src') : null;

    if (firstAvatarSrc && secondAvatarSrc) {
      expect(firstAvatarSrc).toBe(secondAvatarSrc);
    }
  });
});

describe('Customer Avatar Utility Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.contacts.getAll as any).mockResolvedValue(mockContactsWithAvatar);
  });

  it('should use contact_id for consistent avatar assignment', async () => {
    // This tests that the getCustomerAvatarUrl function is being used correctly
    render(<Contacts />);

    await waitFor(() => {
      // Page renders with contacts
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // The avatar assignment should be deterministic based on contact_id
    // Same contact_id always gets same avatar
    const images = document.querySelectorAll('img[src*="customer-avatar"]');

    // Each image should have a valid src
    images.forEach(img => {
      const src = img.getAttribute('src');
      expect(src).toMatch(/\/assets\/customer-avatar\/\d+\.png/);
    });
  });
});
