import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('should render label element', () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render as label element', () => {
    render(<Label>Label</Label>);
    const label = screen.getByText('Label');
    expect(label.tagName).toBe('LABEL');
  });

  it('should apply custom className', () => {
    render(<Label className="custom-class">Label</Label>);
    const label = screen.getByText('Label');
    expect(label).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(<Label ref={ref as React.RefObject<HTMLLabelElement>}>Label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('should accept htmlFor attribute', () => {
    render(<Label htmlFor="input-id">Label</Label>);
    const label = screen.getByText('Label');
    expect(label).toHaveAttribute('for', 'input-id');
  });

  it('should work with input association', () => {
    render(
      <div>
        <Label htmlFor="test-input">Name</Label>
        <input id="test-input" />
      </div>
    );

    const label = screen.getByText('Name');
    const input = document.getElementById('test-input');

    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toBeInTheDocument();
  });
});
