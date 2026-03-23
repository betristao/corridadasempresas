import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBJ24DChLwMJZ9Z9qJ1Ocw3DNFXZvWvb0",
  authDomain: "expense-tracker-79d63.firebaseapp.com",
  projectId: "expense-tracker-79d63",
  storageBucket: "expense-tracker-79d63.appspot.com",
  messagingSenderId: "857301769251",
  appId: "1:857301769251:web:5825e2479c70baab576596"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
