// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage
import interviewReducer from "./interviewSlice";

const rootReducer = combineReducers({
  interview: interviewReducer
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["interview"] // only persist the interview slice
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
