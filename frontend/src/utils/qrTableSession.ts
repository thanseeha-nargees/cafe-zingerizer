export const selectedTableStorageKey = "selectedTableId";
export const selectedTableNumberStorageKey = "selectedTableNumber";

export const saveQrTableSession = (tableId: string, tableNumber?: number) => {
  localStorage.setItem(selectedTableStorageKey, tableId);

  if (tableNumber !== undefined) {
    localStorage.setItem(selectedTableNumberStorageKey, String(tableNumber));
  }
};

export const getQrTableId = () =>
  localStorage.getItem(selectedTableStorageKey) || "";

export const clearQrTableSession = () => {
  localStorage.removeItem(selectedTableStorageKey);
  localStorage.removeItem(selectedTableNumberStorageKey);
};
