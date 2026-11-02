import * as React from "react";
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

/**
 * Props for the UnsavedChangesDialog component.
 */
export interface UnsavedChangesDialogProps {
  /** Controls open visibility state */
  open: boolean;
  /** Callback invoked when the user confirms discarding changes */
  onConfirm: () => void;
  /** Callback invoked when the user cancels and stays on the page */
  onCancel: () => void;
}

/**
 * Accessible confirmation alert dialog warning users when navigating away or discarding unsaved edits.
 * Built on Radix UI AlertDialog primitive with automated keyboard trapping and escape dismissal.
 */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes in your profile. Leaving or resetting now will discard all unsaved edits.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
          >
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
