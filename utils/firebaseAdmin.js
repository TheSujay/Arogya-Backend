import admin from "firebase-admin";

// Load and parse FIREBASE_CONFIG from environment
const firebaseConfig = process.env.FIREBASE_CONFIG;

if (!firebaseConfig) {
  throw new Error("FIREBASE_CONFIG environment variable is missing.");
}

const serviceAccount = JSON.parse(firebaseConfig);

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
