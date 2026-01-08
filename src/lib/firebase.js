import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: User must provide these values from Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyBGRgwZmeak7IwgCN1mSA8ieI_60DpZQVk",
    authDomain: "dca-saas-prod.firebaseapp.com",
    projectId: "dca-saas-prod",
    storageBucket: "dca-saas-prod.firebasestorage.app",
    messagingSenderId: "61479876474",
    appId: "1:61479876474:web:7e666c76443a70c68c88c3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
