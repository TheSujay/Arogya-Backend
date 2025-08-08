import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = process.env.FIREBASE_CONFIG;

if (!firebaseConfig) {
  throw new Error("FIREBASE_CONFIG environment variable is missing.");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(firebaseConfig);
} catch (err) {
  throw new Error("Invalid FIREBASE_CONFIG JSON: " + err.message);
}

// Convert escaped newlines in the private key to actual newlines
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
