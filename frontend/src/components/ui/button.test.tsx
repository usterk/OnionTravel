import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render as button element', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Variants', () => {
    it('should use default variant by default', () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-primary');
    });

    it('should render destructive variant', () => {
      const { container } = render(<Button variant="destructive">Delete</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-destructive');
    });

    it('should render outline variant', () => {
      const { container } = render(<Button variant="outline">Outline</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('border');
    });

    it('should render secondary variant', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-secondary');
    });

    it('should render ghost variant', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('hover:bg-accent');
    });

    it('should render link variant', () => {
      const { container } = render(<Button variant="link">Link</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-primary');
      expect(button?.className).toContain('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should use default size by default', () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-10');
      expect(button?.className).toContain('px-4');
    });

    it('should render sm size', () => {
      const { container } = render(<Button size="sm">Small</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-9');
      expect(button?.className).toContain('px-3');
    });

    it('should render lg size', () => {
      const { container } = render(<Button size="lg">Large</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-11');
      expect(button?.className).toContain('px-8');
    });

    it('should render icon size', () => {
      const { container } = render(<Button size="icon">⭐</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('h-10');
      expect(button?.className).toContain('w-10');
    });
  });

  describe('Behavior', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not trigger onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom props', () => {
    it('should apply custom className', () => {
      const { container } = render(<Button className="custom-class">Button</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Button ref={ref as React.RefObject<HTMLButtonElement>}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should pass through type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should pass through aria attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  describe('Combined props', () => {
    it('should handle variant and size together', () => {
      const { container } = render(<Button variant="outline" size="lg">Large Outline</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toContain('border');
      expect(button?.className).toContain('h-11');
    });

    it('should handle all props together', () => {
      render(
        <Button
          variant="destructive"
          size="sm"
          disabled
          className="extra-class"
        >
          Complex Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('extra-class');
    });
  });
});
