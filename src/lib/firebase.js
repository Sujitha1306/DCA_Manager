import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// TODO: Replace with actual keys
const firebaseConfig = {
    apiKey: "API_KEY",
    authDomain: "demo-no-project.firebaseapp.com",
    projectId: "demo-no-project",
    storageBucket: "demo-no-project.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Use emulator if running locally - optional but good practice
// Use emulator if running locally - optional but good practice
connectFunctionsEmulator(functions, "localhost", 5001);
