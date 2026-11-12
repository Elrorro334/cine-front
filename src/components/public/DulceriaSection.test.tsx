import { render, screen, fireEvent } from '@testing-library/react';
import DulceriaSection from './DulceriaSection';
import { ProductoDto } from '@/types/api';

const mockProducts: ProductoDto[] = [
  { idProducto: 1, sku: 'SKU-01', nombre: 'Palomitas Mantequilla', categoria: 'Palomitas', precio: 60, stock: 15 },
  { idProducto: 2, sku: 'SKU-02', nombre: 'Palomitas Caramelo', categoria: 'Palomitas', precio: 70, stock: 10 },
  { idProducto: 3, sku: 'SKU-03', nombre: 'Refresco Cola Grande', categoria: 'Bebidas', precio: 45, stock: 25 },
  { idProducto: 4, sku: 'SKU-04', nombre: 'Agua Ciel 600ml', categoria: 'Bebidas', precio: 25, stock: 0 },
  { idProducto: 5, sku: 'SKU-05', nombre: 'Nachos con Queso', categoria: 'Snacks', precio: 65, stock: 8 },
  { idProducto: 6, sku: 'SKU-06', nombre: 'Hot Dog Clásico', categoria: 'Snacks', precio: 55, stock: 5 },
  { idProducto: 7, sku: 'SKU-07', nombre: 'M&Ms Chocolate', categoria: 'Dulces', precio: 40, stock: 12 },
  { idProducto: 8, sku: 'SKU-08', nombre: 'Gomitas Panditas', categoria: 'Dulces', precio: 35, stock: 18 },
  { idProducto: 9, sku: 'SKU-09', nombre: 'Combo Pareja', categoria: 'Combos', precio: 180, stock: 10 },
  { idProducto: 10, sku: 'SKU-10', nombre: 'Combo Familiar', categoria: 'Combos', precio: 260, stock: 6 },
];

describe('DulceriaSection Component', () => {
  test('renderiza productos y paginación con 8 items por página', () => {
    render(<DulceriaSection products={mockProducts} loading={false} />);

    expect(screen.getByText('Dulcería & Combos')).toBeInTheDocument();
    expect(screen.getByText('Palomitas Mantequilla')).toBeInTheDocument();
    expect(screen.getByText('Gomitas Panditas')).toBeInTheDocument();

    // El item 9 (Combo Pareja) está en la página 2
    expect(screen.queryByText('Combo Pareja')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 - 8 de 10 productos/i)).toBeInTheDocument();

    // Navegar a la página 2
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('Combo Pareja')).toBeInTheDocument();
    expect(screen.getByText('Combo Familiar')).toBeInTheDocument();
    expect(screen.queryByText('Palomitas Mantequilla')).not.toBeInTheDocument();
  });

  test('permite buscar por texto en el catálogo', () => {
    render(<DulceriaSection products={mockProducts} loading={false} />);

    const searchInput = screen.getByPlaceholderText(/Buscar snacks, combos/i);
    fireEvent.change(searchInput, { target: { value: 'Nachos' } });

    expect(screen.getByText('Nachos con Queso')).toBeInTheDocument();
    expect(screen.queryByText('Palomitas Mantequilla')).not.toBeInTheDocument();
  });

  test('permite filtrar por disponibilidad de stock', () => {
    render(<DulceriaSection products={mockProducts} loading={false} />);

    // Filtrar por agotados
    fireEvent.click(screen.getByRole('button', { name: 'Agotados' }));
    expect(screen.getByText('Agua Ciel 600ml')).toBeInTheDocument();
    expect(screen.queryByText('Palomitas Mantequilla')).not.toBeInTheDocument();

    // Filtrar por disponibles
    fireEvent.click(screen.getByRole('button', { name: 'Disponibles' }));
    expect(screen.queryByText('Agua Ciel 600ml')).not.toBeInTheDocument();
    expect(screen.getByText('Palomitas Mantequilla')).toBeInTheDocument();
  });
});
