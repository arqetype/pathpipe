import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../login-form';

jest.mock('lucide-react', () => ({
  Loader2Icon: () => <svg />,
}));

describe('LoginForm', () => {
  const mockStartTransition = jest.fn();

  beforeEach(() => {
    jest
      .spyOn(React, 'useTransition')
      .mockReturnValue([false, mockStartTransition]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form with email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('disables inputs and button when isPending is true', () => {
    jest
      .spyOn(React, 'useTransition')
      .mockReturnValue([true, mockStartTransition]);

    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
  });

  it('calls handleSubmit when the form is submitted', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockStartTransition).toHaveBeenCalled();
    });
  });

  it('renders a link to the forgot password page', () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByText(/forgot password\?/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/app/forgot-password');
  });

  it('renders a link to the register page', () => {
    render(<LoginForm />);

    const registerLink = screen.getByText(/Register/i);
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/app/register');
  });

  it('renders a Google login button', () => {
    render(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: /google/i });
    expect(googleButton).toBeInTheDocument();
  });

  it('shows validation error messages when fields are empty', async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('does not call handleSubmit if form validation fails', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockStartTransition).not.toHaveBeenCalled();
    });
  });
});
