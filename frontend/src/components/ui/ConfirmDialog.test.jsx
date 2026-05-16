import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

// jsdom does not implement showModal. The stub must also set [open] so the
// dialog's content is visible to role queries (jsdom hides closed dialogs).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn().mockImplementation(function () {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function () {
    this.removeAttribute('open');
  });
});

describe('ConfirmDialog', () => {
  describe('rendering', () => {
    it('renders the message', () => {
      render(<ConfirmDialog message='Delete this item?' onConfirm={() => {}} onCancel={() => {}} />);
      expect(screen.getByText('Delete this item?')).toBeInTheDocument();
    });

    it('renders the Confirm heading', () => {
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={() => {}} />);
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('renders default confirmLabel "Delete"', () => {
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={() => {}} />);
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('renders custom confirmLabel', () => {
      render(<ConfirmDialog message='Sure?' confirmLabel='Remove' onConfirm={() => {}} onCancel={() => {}} />);
      expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={() => {}} />);
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog message='Sure?' onConfirm={onConfirm} onCancel={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('does not call onConfirm when Cancel is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog message='Sure?' onConfirm={onConfirm} onCancel={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('does not call onCancel when confirm button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('native dialog', () => {
    it('calls showModal on mount', () => {
      HTMLDialogElement.prototype.showModal.mockClear();
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={() => {}} />);
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    });

    it('calls onCancel on native close event (Escape key)', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog message='Sure?' onConfirm={() => {}} onCancel={onCancel} />);
      const dialog = document.querySelector('dialog');
      fireEvent(dialog, new Event('close'));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });
});
