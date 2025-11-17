import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Card ref={ref as React.RefObject<HTMLDivElement>}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('should render header with children', () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<CardHeader className="header-class">Header</CardHeader>);
      expect(container.firstChild).toHaveClass('header-class');
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 element', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H3');
    });

    it('should apply custom className', () => {
      render(<CardTitle className="title-class">Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('title-class');
    });
  });

  describe('CardDescription', () => {
    it('should render as paragraph element', () => {
      render(<CardDescription>Description text</CardDescription>);
      const desc = screen.getByText('Description text');
      expect(desc.tagName).toBe('P');
    });

    it('should apply custom className', () => {
      render(<CardDescription className="desc-class">Description</CardDescription>);
      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('desc-class');
    });
  });

  describe('CardContent', () => {
    it('should render content with children', () => {
      render(<CardContent>Main content</CardContent>);
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<CardContent className="content-class">Content</CardContent>);
      expect(container.firstChild).toHaveClass('content-class');
    });
  });

  describe('CardFooter', () => {
    it('should render footer with children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<CardFooter className="footer-class">Footer</CardFooter>);
      expect(container.firstChild).toHaveClass('footer-class');
    });
  });

  describe('Full Card Integration', () => {
    it('should render complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Test Footer')).toBeInTheDocument();
    });
  });
});
