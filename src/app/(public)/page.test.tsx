import { render } from '@testing-library/react';
import PublicPage from './page';

describe('PublicPage Component', () => {
  test('renderiza la página pública correctamente', () => {
    const { container } = render(<PublicPage />);
    expect(container).toBeDefined();
  });
});