import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription } from './alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('should render alert with children', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('should use default variant by default', () => {
      const { container } = render(<Alert>Default alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert?.className).toContain('bg-white');
      expect(alert?.className).toContain('text-gray-900');
    });

    it('should render destructive variant', () => {
      const { container } = render(<Alert variant="destructive">Error message</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert?.className).toContain('bg-red-50');
      expect(alert?.className).toContain('text-red-900');
    });

    it('should apply custom className', () => {
      render(<Alert className="custom-class">Alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Alert ref={ref as React.RefObject<HTMLDivElement>}>Alert</Alert>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass through additional props', () => {
      render(<Alert data-testid="test-alert">Alert</Alert>);
      const alert = screen.getByTestId('test-alert');
      expect(alert).toHaveAttribute('role', 'alert');
    });
  });

  describe('AlertDescription', () => {
    it('should render description with children', () => {
      render(<AlertDescription>Description text</AlertDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AlertDescription className="custom-desc">Description</AlertDescription>
      );
      expect(container.firstChild).toHaveClass('custom-desc');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<AlertDescription ref={ref as React.RefObject<HTMLParagraphElement>}>Desc</AlertDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Alert with AlertDescription', () => {
    it('should render complete alert structure', () => {
      render(
        <Alert>
          <AlertDescription>This is an alert message</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const description = screen.getByText('This is an alert message');

      expect(alert).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(alert).toContainElement(description);
    });

    it('should render destructive alert with description', () => {
      const { container } = render(
        <Alert variant="destructive">
          <AlertDescription>Error occurred</AlertDescription>
        </Alert>
      );

      const alert = container.querySelector('[role="alert"]');
      expect(alert?.className).toContain('bg-red-50');
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });
});
