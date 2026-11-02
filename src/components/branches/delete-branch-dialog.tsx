import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { isDefaultBranch, type Branch } from "@/api/branch-queries";

/**
 * Props for the DeleteBranchDialog component.
 */
export interface DeleteBranchDialogProps {
  /**
   * The branch entity to delete, or null if no deletion is active.
   */
  branch: Branch | null;
  /**
   * Whether the alert dialog is currently open.
   */
  open: boolean;
  /**
   * Callback invoked when the dialog open state changes.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Confirmation handler invoked when the destructive action is confirmed.
   */
  onConfirm: (branch: Branch) => Promise<void> | void;
  /**
   * Indicates whether the delete mutation is in flight.
   */
  isDeleting?: boolean;
}

/**
 * DeleteBranchDialog Component
 *
 * Accessible confirmation modal for deleting tailored resume branches.
 *
 * Architectural Role:
 * - Provides a safety barrier against accidental deletion of resume variants.
 * - Protects the canonical Default Branch by rendering an immutable notice rather
 *   than a destructive action if a default branch is ever evaluated.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Built upon `@radix-ui/react-alert-dialog` (`role="alertdialog"`).
 * - Focus is automatically trapped within the dialog while active.
 * - Supports keyboard dismissal via `Escape`, returning focus to the trigger.
 * - Destructive button uses high-contrast focus rings and explicit accessible labels.
 *
 * @param {DeleteBranchDialogProps} props Component properties.
 * @returns {JSX.Element | null} The rendered alert dialog, or null if no branch is selected.
 */
export const DeleteBranchDialog: React.FC<DeleteBranchDialogProps> = ({
  branch,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}) => {
  if (!branch) {
    return null;
  }

  const isDefault = isDefaultBranch(branch);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDefault ? "Cannot Delete Branch" : "Delete Branch"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDefault
              ? "Default branch cannot be deleted. The canonical master profile branch is permanently protected against deletion and tailoring."
              : `Are you sure you want to delete branch '${branch.name}'? This action cannot be undone and will permanently remove this tailored line along with all historical versions and rendered artifacts.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {!isDefault && (
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await onConfirm(branch);
                onOpenChange(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
