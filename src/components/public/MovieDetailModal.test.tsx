import { render, screen, fireEvent } from '@testing-library/react';
import MovieDetailModal from './MovieDetailModal';
import { Movie } from '@/types/cartelera';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockMovie: Movie = {
  id: 1,
  title: 'Resident Evil: Noche cero',
  tagline: 'Sobrevive a la noche',
  classification: 'B15',
  duration: '93 min',
  genre: 'Terror',
  allGenres: 'Terror, Acción',
  rating: '8.5',
  posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/original/test-bg.jpg',
  synopsis: 'Un mensajero en un hospital...',
  releaseYear: '2026',
  director: 'Director de prueba',
  actors: 'Actor 1, Actor 2',
  showtimes: ['11:30', '15:00'],
  trailerKey: 'dQw4w9WgXcQ',
};

describe('MovieDetailModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('no se renderiza si isOpen es false o movie es null', () => {
    const { container: c1 } = render(
      <MovieDetailModal isOpen={false} movie={mockMovie} onClose={mockOnClose} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <MovieDetailModal isOpen={true} movie={null} onClose={mockOnClose} />
    );
    expect(c2.firstChild).toBeNull();
  });

  test('renderiza toda la información técnica, sinopsis y horarios', () => {
    render(<MovieDetailModal isOpen={true} movie={mockMovie} onClose={mockOnClose} />);

    expect(screen.getByText('Resident Evil: Noche cero')).toBeInTheDocument();
    expect(screen.getByText(/Sobrevive a la noche/i)).toBeInTheDocument();
    expect(screen.getByText(/Clasif\. B15/i)).toBeInTheDocument();
    expect(screen.getByText('Terror')).toBeInTheDocument();
    expect(screen.getByText(/93 min/i)).toBeInTheDocument();
    expect(screen.getByText('Un mensajero en un hospital...')).toBeInTheDocument();
    expect(screen.getByText('Director de prueba')).toBeInTheDocument();
    expect(screen.getByText('Actor 1, Actor 2')).toBeInTheDocument();
    expect(screen.getByText('11:30')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  test('permite seleccionar un horario y muestra la confirmación', () => {
    render(<MovieDetailModal isOpen={true} movie={mockMovie} onClose={mockOnClose} />);

    const horarioBtn = screen.getByRole('button', { name: '11:30' });
    fireEvent.click(horarioBtn);

    expect(screen.getByText(/Función seleccionada: 11:30 hrs/i)).toBeInTheDocument();
  });

  test('navega a /preorden al hacer clic en Generar Pre-Orden (Ticket QR)', () => {
    render(<MovieDetailModal isOpen={true} movie={mockMovie} onClose={mockOnClose} />);

    const preordenBtn = screen.getByRole('button', { name: /Generar Pre-Orden \(Ticket QR\)/i });
    fireEvent.click(preordenBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/preorden?peli=1'));
  });

  test('abre tráiler en ventana externa al hacer clic en Ver Tráiler', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<MovieDetailModal isOpen={true} movie={mockMovie} onClose={mockOnClose} />);

    const trailerBtn = screen.getByRole('button', { name: /Ver Tráiler/i });
    fireEvent.click(trailerBtn);

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('youtube.com'),
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  test('llama a onClose al presionar el botón de cerrar y la tecla Escape', () => {
    render(<MovieDetailModal isOpen={true} movie={mockMovie} onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button', { name: /Cerrar ficha técnica/i });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  test('llama a onClose al hacer clic en el backdrop', () => {
    render(<MovieDetailModal isOpen={true} movie={mockMovie} onClose={mockOnClose} />);

    const backdropBtn = screen.getByRole('button', { name: /Cerrar modal/i });
    fireEvent.click(backdropBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
