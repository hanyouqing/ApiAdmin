import { configureStore } from '@reduxjs/toolkit';
import userReducer from './Modules/User';
import groupReducer from './Modules/Group';
import projectReducer from './Modules/Project';
import interfaceReducer from './Modules/Interface';
import interfaceCatReducer from './Modules/InterfaceCat';
import mockExpectationReducer from './Modules/MockExpectation';
import testReducer from './Modules/Test';
import uiReducer from './Modules/UI';

export const store = configureStore({
  reducer: {
    user: userReducer,
    group: groupReducer,
    project: projectReducer,
    interface: interfaceReducer,
    interfaceCat: interfaceCatReducer,
    mockExpectation: mockExpectationReducer,
    test: testReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

