// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDEH_KYVt62F0KEuVh8qgZqu0SmjP7UKK8",
  authDomain: "portal-scamatti.firebaseapp.com",
  projectId: "portal-scamatti",
  storageBucket: "portal-scamatti.firebasestorage.app",
  messagingSenderId: "54471460240",
  appId: "1:54471460240:web:c4be92b193013dd7525f15"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Nova função de Login com Email e Senha
export const loginComEmailSenha = (email, senha) => {
  return signInWithEmailAndPassword(auth, email, senha);
};

export const fazerLogout = () => {
  return signOut(auth);
};