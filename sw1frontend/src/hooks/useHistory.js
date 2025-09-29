import { useState } from 'react';

/**
 * Hook para implementar historial de acciones (undo/redo)
 * @param {any} initialState - Estado inicial
 * @returns {array} [state, setState, undo, redo, {canUndo, canRedo}]
 */
export const useHistory = (initialState) => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = (action) => {
    const newState = typeof action === 'function' ? action(history[index]) : action;
    if (JSON.stringify(history[index]) === JSON.stringify(newState)) {
      return;
    }
    
    const updatedHistory = history.slice(0, index + 1);
    updatedHistory.push(newState);
    
    setHistory(updatedHistory);
    setIndex(updatedHistory.length - 1);
  };

  const undo = () => index > 0 && setIndex(prevState => prevState - 1);
  const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1);
  
  return [history[index], setState, undo, redo, { canUndo: index > 0, canRedo: index < history.length - 1 }];
};