import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from './AuthForm';
import * as authService from './authService';

vi.mock('./authService', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs in with email and password by default', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByLabelText('Email'), 'toi@exemple.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() =>
      expect(authService.signIn).toHaveBeenCalledWith({ email: 'toi@exemple.com', password: 'secret123' }),
    );
    expect(authService.signUp).not.toHaveBeenCalled();
  });

  it('switches to signup mode and submits role + full name', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.signUp).mockResolvedValue({ session: null } as never);
    render(<AuthForm />);

    await user.click(screen.getByText("Pas encore de compte ? S'inscrire"));
    await user.type(screen.getByLabelText('Nom complet'), 'Alex Dupont');
    await user.click(screen.getByText('Structure'));
    await user.type(screen.getByLabelText('Email'), 'structure@exemple.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: "S'inscrire" }));

    await waitFor(() =>
      expect(authService.signUp).toHaveBeenCalledWith({
        email: 'structure@exemple.com',
        password: 'secret123',
        fullName: 'Alex Dupont',
        role: 'structure_admin',
      }),
    );
    expect(await screen.findByText(/Compte cree/)).toBeInTheDocument();
  });

  it('shows the error message returned by the auth service', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.signIn).mockRejectedValue(new Error('Identifiants invalides'));
    render(<AuthForm />);

    await user.type(screen.getByLabelText('Email'), 'toi@exemple.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Identifiants invalides')).toBeInTheDocument();
  });
});
