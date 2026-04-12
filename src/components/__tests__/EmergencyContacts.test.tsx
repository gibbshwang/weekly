import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmergencyContacts } from '../EmergencyContacts';

describe('EmergencyContacts', () => {
  it('renders 1366 emergency number', () => {
    render(<EmergencyContacts />);
    expect(screen.getByText(/1366/)).toBeInTheDocument();
  });

  it('renders 112 police number', () => {
    render(<EmergencyContacts />);
    expect(screen.getByText(/경찰 112/)).toBeInTheDocument();
  });

  it('has tel: links for both numbers', () => {
    render(<EmergencyContacts />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('tel:1366');
    expect(hrefs).toContain('tel:112');
  });
});
