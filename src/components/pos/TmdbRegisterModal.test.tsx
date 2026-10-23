import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TmdbRegisterModal from './TmdbRegisterModal';
import { carteleraService } from '@/services/carteleraService';

jest.mock('@/services/carteleraService', () => ({
  carteleraService: {
    buscarTmdb: jest.fn(),
    registrarPelicula: jest.fn(),
  },
}));

describe('TmdbRegisterModal', () => {
  const mockOnClose = jest.fn();
  const mockOnMovieRegistered = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <TmdbRegisterModal
        isOpen={false}
        onClose={mockOnClose}
        onMovieRegistered={mockOnMovieRegistered}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el título y buscador cuando isOpen es true', () => {
    render(
      <TmdbRegisterModal
        isOpen={true}
        onClose={mockOnClose}
        onMovieRegistered={mockOnMovieRegistered}
      />
    );

    expect(screen.getByText(/Registrar Película desde TMDB/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Escribe el nombre de la película/i)
    ).toBeInTheDocument();
  });

  it('busca películas en TMDB y muestra los resultados', async () => {
    const mockResults = [
      {
        tmdbId: 100,
        titulo: 'The Batman',
        sinopsis: 'Batman investiga a Acertijo.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        releaseYear: '2022',
        rating: 8.1,
      },
    ];

    (carteleraService.buscarTmdb as jest.Mock).mockResolvedValue(mockResults);

    render(
      <TmdbRegisterModal
        isOpen={true}
        onClose={mockOnClose}
        onMovieRegistered={mockOnMovieRegistered}
      />
    );

    const input = screen.getByPlaceholderText(/Escribe el nombre de la película/i);
    fireEvent.change(input, { target: { value: 'Batman' } });

    const searchBtn = screen.getByRole('button', { name: /Buscar/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(carteleraService.buscarTmdb).toHaveBeenCalledWith('Batman');
      expect(screen.getByText('The Batman')).toBeInTheDocument();
      expect(screen.getByText('Batman investiga a Acertijo.')).toBeInTheDocument();
    });
  });

  it('registra la película seleccionada y llama a onMovieRegistered', async () => {
    const mockResults = [
      {
        tmdbId: 100,
        titulo: 'The Batman',
        sinopsis: 'Batman investiga a Acertijo.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        releaseYear: '2022',
        rating: 8.1,
      },
    ];

    (carteleraService.buscarTmdb as jest.Mock).mockResolvedValue(mockResults);
    (carteleraService.registrarPelicula as jest.Mock).mockResolvedValue({
      idPelicula: 10,
      titulo: 'The Batman',
    });

    render(
      <TmdbRegisterModal
        isOpen={true}
        onClose={mockOnClose}
        onMovieRegistered={mockOnMovieRegistered}
      />
    );

    const input = screen.getByPlaceholderText(/Escribe el nombre de la película/i);
    fireEvent.change(input, { target: { value: 'Batman' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(screen.getByText('The Batman')).toBeInTheDocument();
    });

    const registerBtn = screen.getByRole('button', { name: /Registrar en Cartelera/i });
    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(carteleraService.registrarPelicula).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'The Batman',
          posterImage: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        })
      );
      expect(mockOnMovieRegistered).toHaveBeenCalled();
      expect(
        screen.getByText(/fue registrada exitosamente/i)
      ).toBeInTheDocument();
    });
  });

  it('muestra mensaje cuando no hay resultados', async () => {
    (carteleraService.buscarTmdb as jest.Mock).mockResolvedValue([]);

    render(
      <TmdbRegisterModal
        isOpen={true}
        onClose={mockOnClose}
        onMovieRegistered={mockOnMovieRegistered}
      />
    );

    const input = screen.getByPlaceholderText(/Escribe el nombre de la película/i);
    fireEvent.change(input, { target: { value: 'NoExiste12345' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No se encontraron películas con ese término/i)
      ).toBeInTheDocument();
    });
  });
});
