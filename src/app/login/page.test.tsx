import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { authService } from '@/services/authService';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    checkNetwork: jest.fn(),
    login: jest.fn(),
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.checkNetwork as jest.Mock).mockResolvedValue({
      isAllowed: true,
      ipDetected: '192.168.1.105',
      message: 'Red Autorizada',
    });
    (authService.login as jest.Mock).mockResolvedValue({
      success: true,
      token: 'fake-token',
    });
  });

  test('renderiza y valida la IP de red correctamente', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('192.168.1.105')).toBeInTheDocument();
    });
  });

  test('permite ingresar credenciales y realizar login', async () => {
    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('192.168.1.105')).toBeInTheDocument();
    });

    const userInput = screen.getByLabelText(/Usuario \/ Perfil/i) as HTMLInputElement;
    const passInput = screen.getByLabelText(/Contraseña/i) as HTMLInputElement;

    fireEvent.change(userInput, { target: { value: 'admin' } });
    fireEvent.change(passInput, { target: { value: 'admin123' } });

    expect(userInput.value).toBe('admin');
    expect(passInput.value).toBe('admin123');

    const submitBtn = screen.getByRole('button', { name: /Validar e Ingresar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        nombreUsuario: 'admin',
        password: 'admin123',
      });
    });
  });

  test('maneja error cuando la respuesta de red es rechazada', async () => {
    (authService.checkNetwork as jest.Mock).mockRejectedValueOnce({
      message: 'Red Denegada',
      data: { ipDetected: '187.190.22.40' },
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('187.190.22.40')).toBeInTheDocument();
    });
  });

  test('muestra alerta cuando las credenciales de login son incorrectas', async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: 'Credenciales inválidas',
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('192.168.1.105')).toBeInTheDocument();
    });

    const userInput = screen.getByLabelText(/Usuario \/ Perfil/i);
    const passInput = screen.getByLabelText(/Contraseña/i);

    fireEvent.change(userInput, { target: { value: 'user_err' } });
    fireEvent.change(passInput, { target: { value: 'pass_err' } });

    const submitBtn = screen.getByRole('button', { name: /Validar e Ingresar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Acceso Denegado')).toBeInTheDocument();
    });
  });
});
