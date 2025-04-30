import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Page from '../page';

describe('Page', () => {
  it('renders button text', () => {
    render(<Page />);

    const button = screen.getByRole('button', {
      name: /Start Building Now/i,
    });

    expect(button).toBeInTheDocument();
  });

  it('renders homepage unchanged', () => {
    const { container } = render(<Page />);

    expect(container).toMatchSnapshot();
  });
});
