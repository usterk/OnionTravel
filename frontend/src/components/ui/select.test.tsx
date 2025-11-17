import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select';

describe('Select', () => {
  it('should render select element', () => {
    render(
      <Select>
        <option value="1">Option 1</option>
      </Select>
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should render options', () => {
    render(
      <Select>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should handle selection change', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Select onChange={handleChange}>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(
      <Select className="custom-class">
        <option value="1">Option 1</option>
      </Select>
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(
      <Select ref={ref as React.RefObject<HTMLSelectElement>}>
        <option value="1">Option 1</option>
      </Select>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <Select disabled>
        <option value="1">Option 1</option>
      </Select>
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('should have correct value', () => {
    render(
      <Select value="2" readOnly>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('2');
  });
});
