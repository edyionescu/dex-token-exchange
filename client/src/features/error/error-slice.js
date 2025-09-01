import { createSlice } from '@reduxjs/toolkit';
import { toast } from 'sonner';

const initialState = {
  entries: {},
};

export const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    // Set error for a specific domain (wallet, order, network, etc.)
    setError: (state, action) => {
      const { domain, message } = action.payload;
      state.entries[domain] = {
        message,
        timestamp: Date.now(),
      };
      toast.error(message);
    },

    // Clear error for a specific domain
    clearError: (state, action) => {
      const { domain } = action.payload;
      delete state.entries[domain];
    },
  },
});

export const { setError, clearError } = errorSlice.actions;

export default errorSlice.reducer;
