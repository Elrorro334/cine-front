import { render, act, RenderResult } from '@testing-library/react';
import PublicPage from './page';

describe('PublicPage Component', () => {
  test('renderiza la página pública correctamente', async () => {
    let result: RenderResult | undefined;
    await act(async () => {
      result = render(<PublicPage />);
    });
    expect(result?.container).toBeDefined();
  });
});