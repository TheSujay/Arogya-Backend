// utils/firebaseAdmin.js
import admin from "firebase-admin";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const serviceAccount = require("../config/firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
