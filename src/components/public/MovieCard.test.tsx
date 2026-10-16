import { render, screen, fireEvent } from '@testing-library/react';
import MovieCard from './MovieCard';
import { Movie } from '@/types/cartelera';

const mockMovie: Movie = {
  id: 1,
  title: 'Resident Evil: Noche cero',
  classification: 'B15',
  duration: '93 min',
  genre: 'Terror',
  rating: '8.5',
  posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
  synopsis: 'Un mensajero en un hospital...',
  director: 'Director de prueba',
  showtimes: ['11:30', '15:00'],
};

describe('MovieCard Component', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza título, clasificación, género y duración correctamente', () => {
    render(<MovieCard movie={mockMovie} onSelect={mockOnSelect} />);

    expect(screen.getByText('Resident Evil: Noche cero')).toBeInTheDocument();
    expect(screen.getByText('Clasif. B15')).toBeInTheDocument();
    expect(screen.getAllByText(/Terror/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/93 min/i).length).toBeGreaterThan(0);
  });

  test('llama a onSelect al hacer clic en el botón de la tarjeta o en el póster', () => {
    render(<MovieCard movie={mockMovie} onSelect={mockOnSelect} />);

    const selectButton = screen.getByRole('button', { name: /Consultar Horarios/i });
    fireEvent.click(selectButton);
    expect(mockOnSelect).toHaveBeenCalledWith(mockMovie);

    const titleBtn = screen.getByRole('button', { name: 'Resident Evil: Noche cero' });
    fireEvent.click(titleBtn);
    expect(mockOnSelect).toHaveBeenCalledWith(mockMovie);
  });

  test('aplica los estilos correspondientes a diferentes clasificaciones', () => {
    const classifications = ['AA', 'A', 'B', 'C', 'D', 'DESCONOCIDA'];
    classifications.forEach((clasif) => {
      const { unmount } = render(
        <MovieCard movie={{ ...mockMovie, classification: clasif }} onSelect={mockOnSelect} />
      );
      expect(screen.getByText(`Clasif. ${clasif}`)).toBeInTheDocument();
      unmount();
    });
  });
});
