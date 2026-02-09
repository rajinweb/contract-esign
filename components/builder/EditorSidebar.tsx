import React from 'react';
import Fields from './Fields';
import RecipientsList from './RecipientsList';
import { DroppingField, FieldOwner, Recipient } from '@/types/types';

interface EditorSidebarProps {
  isReadOnly: boolean;
  activeComponent: DroppingField | null;
  setActiveComponent: React.Dispatch<React.SetStateAction<DroppingField | null>>;
  mouseDownOnField: (component: string, event: React.MouseEvent<HTMLDivElement>, fieldOwner: FieldOwner) => void;
  selectedFile: File | null;
  recipients: Recipient[];
  onAddRecipients?: () => void;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({
  isReadOnly,
  activeComponent,
  setActiveComponent,
  mouseDownOnField,
  selectedFile,
  recipients,
  onAddRecipients,
}) => {
  return (
    <div className="bg-white w-72 flex flex-col select-none">
      {!isReadOnly && (
        <Fields
          activeComponent={activeComponent}
          setActiveComponent={setActiveComponent}
          mouseDown={mouseDownOnField}
          selectedFile={selectedFile}
        />
      )}
      <RecipientsList
        recipients={recipients}
        onAddRecipients={isReadOnly ? undefined : onAddRecipients}
        showStatus={isReadOnly}
      />
    </div>
  );
};

export default EditorSidebar;
