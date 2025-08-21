import { createContext, useContext } from 'react';

export const GroupDAOContext = createContext(null);

export const useGroupDAO = () => useContext(GroupDAOContext);

