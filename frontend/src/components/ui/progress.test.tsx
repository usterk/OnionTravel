import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  describe('Rendering', () => {
    it('should render progress bar', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render with correct aria attributes', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should apply custom className to container', () => {
      const { container } = render(<Progress value={50} className="custom-class" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.className).toContain('custom-class');
    });

    it('should apply custom className to indicator', () => {
      const { container } = render(
        <Progress value={50} indicatorClassName="bg-blue-500" />
      );
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator?.className).toContain('bg-blue-500');
    });
  });

  describe('Value handling', () => {
    it('should set width based on value', () => {
      const { container } = render(<Progress value={60} />);
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator).toHaveStyle({ width: '60%' });
    });

    it('should clamp value to 0 when negative', () => {
      const { container } = render(<Progress value={-10} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator).toHaveStyle({ width: '0%' });
    });

    it('should clamp value to 100 when over 100', () => {
      const { container } = render(<Progress value={150} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator).toHaveStyle({ width: '100%' });
    });

    it('should handle 0 value', () => {
      const { container } = render(<Progress value={0} />);
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator).toHaveStyle({ width: '0%' });
    });

    it('should handle 100 value', () => {
      const { container } = render(<Progress value={100} />);
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator).toHaveStyle({ width: '100%' });
    });
  });

  describe('Styling', () => {
    it('should have default background color', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.className).toContain('bg-gray-200');
    });

    it('should have transition classes on indicator', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('[role="progressbar"] > div');
      expect(indicator?.className).toContain('transition-all');
      expect(indicator?.className).toContain('duration-300');
      expect(indicator?.className).toContain('ease-linear');
    });

    it('should have rounded corners', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.className).toContain('rounded-full');
    });
  });
});
