import { DroppedComponent, Recipient } from '@/types/types';

export function blobToURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      const base64data = reader.result;
      resolve(base64data);
    };
  });
}



export function areDroppedComponentsEqual(
  a,
  b
) {
  if (a.length !== b.length) return false;

  const sortById = (arr) =>
    [...arr].sort((x, y) => x.id - y.id);

  const sortedA = sortById(a);
  const sortedB = sortById(b);

  return sortedA.every((compA, index) => {
    const compB = sortedB[index];
    return (
      compA.id === compB.id &&
      compA.component === compB.component &&
      compA.x === compB.x &&
      compA.y === compB.y &&
      compA.width === compB.width &&
      compA.height === compB.height &&
      compA.pageNumber === compB.pageNumber &&
      compA.assignedRecipientId === compB.assignedRecipientId &&
      compA.required === compB.required &&
      compA.data === compB.data &&
      compA.placeholder === compB.placeholder
    );
  });
}


export function areRecipientsEqual(a, b) {
  if (a.length !== b.length) return false;

  const sortById = (arr) =>
    [...arr].sort((x, y) => x.id.localeCompare(y.id));

  const sortedA = sortById(a);
  const sortedB = sortById(b);

  return sortedA.every((recA, index) => {
    const recB = sortedB[index];
    return (
      recA.id === recB.id &&
      recA.email === recB.email &&
      recA.name === recB.name &&
      recA.role === recB.role
    );
  });
}
