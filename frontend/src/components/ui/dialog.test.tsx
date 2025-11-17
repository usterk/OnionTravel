import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from './dialog';

describe('Dialog Components', () => {
  describe('Dialog', () => {
    it('should not render when closed', () => {
      const { container } = render(
        <Dialog open={false} onOpenChange={vi.fn()}>
          <div>Dialog content</div>
        </Dialog>
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when open', () => {
      render(
        <Dialog open={true} onOpenChange={vi.fn()}>
          <div>Dialog content</div>
        </Dialog>
      );
      expect(screen.getByText('Dialog content')).toBeInTheDocument();
    });

    it('should call onOpenChange when backdrop is clicked', async () => {
      const handleOpenChange = vi.fn();
      const user = userEvent.setup();

      const { container } = render(
        <Dialog open={true} onOpenChange={handleOpenChange}>
          <div>Dialog content</div>
        </Dialog>
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onOpenChange when Escape key is pressed', async () => {
      const handleOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dialog open={true} onOpenChange={handleOpenChange}>
          <div>Dialog content</div>
        </Dialog>
      );

      await user.keyboard('{Escape}');
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('should not call onOpenChange on Escape when closed', async () => {
      const handleOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dialog open={false} onOpenChange={handleOpenChange}>
          <div>Dialog content</div>
        </Dialog>
      );

      await user.keyboard('{Escape}');
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it('should prevent touch scrolling on backdrop', () => {
      const { container } = render(
        <Dialog open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </Dialog>
      );

      const backdrop = container.querySelector('.bg-black\\/50') as HTMLElement;
      expect(backdrop.style.touchAction).toBe('none');
    });
  });

  describe('DialogContent', () => {
    it('should render children', () => {
      render(<DialogContent>Content text</DialogContent>);
      expect(screen.getByText('Content text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DialogContent className="custom-class">Content</DialogContent>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should stop click propagation', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <div onClick={handleClick}>
          <DialogContent>Content</DialogContent>
        </div>
      );

      const content = screen.getByText('Content');
      await user.click(content);

      // Click should not propagate to parent
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('DialogHeader', () => {
    it('should render children', () => {
      render(<DialogHeader>Header text</DialogHeader>);
      expect(screen.getByText('Header text')).toBeInTheDocument();
    });

    it('should render close button when onClose is provided', () => {
      render(<DialogHeader onClose={vi.fn()}>Header</DialogHeader>);
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('should not render close button when onClose is not provided', () => {
      render(<DialogHeader>Header</DialogHeader>);
      const closeButton = screen.queryByRole('button');
      expect(closeButton).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(<DialogHeader onClose={handleClose}>Header</DialogHeader>);
      const closeButton = screen.getByRole('button');

      await user.click(closeButton);
      expect(handleClose).toHaveBeenCalledOnce();
    });
  });

  describe('DialogTitle', () => {
    it('should render as h2 element', () => {
      render(<DialogTitle>Title</DialogTitle>);
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H2');
    });

    it('should apply custom className', () => {
      render(<DialogTitle className="custom-title">Title</DialogTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('DialogDescription', () => {
    it('should render as paragraph', () => {
      render(<DialogDescription>Description text</DialogDescription>);
      const desc = screen.getByText('Description text');
      expect(desc.tagName).toBe('P');
    });

    it('should apply custom className', () => {
      render(<DialogDescription className="custom-desc">Description</DialogDescription>);
      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('custom-desc');
    });
  });

  describe('DialogBody', () => {
    it('should render children', () => {
      render(<DialogBody>Body content</DialogBody>);
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DialogBody className="custom-body">Body</DialogBody>
      );
      expect(container.firstChild).toHaveClass('custom-body');
    });
  });

  describe('DialogFooter', () => {
    it('should render children', () => {
      render(<DialogFooter>Footer content</DialogFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DialogFooter className="custom-footer">Footer</DialogFooter>
      );
      expect(container.firstChild).toHaveClass('custom-footer');
    });
  });

  describe('Full Dialog Integration', () => {
    it('should render complete dialog structure', () => {
      const handleClose = vi.fn();

      render(
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent>
            <DialogHeader onClose={handleClose}>
              <DialogTitle>Test Title</DialogTitle>
              <DialogDescription>Test Description</DialogDescription>
            </DialogHeader>
            <DialogBody>Test Body Content</DialogBody>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Body Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });
  });
});
