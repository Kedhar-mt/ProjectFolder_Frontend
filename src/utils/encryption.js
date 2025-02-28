import CryptoJS from "crypto-js";

// Ensure the secret key is set correctly
const SECRET_KEY = "Kedhareswarmatha";

// Encrypt function
export const encryptPassword = (password) => {
  if (!SECRET_KEY) {
    throw new Error("Encryption key is missing!");
  }
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

// Decrypt function (Only if needed on the backend)
export const decryptPassword = (encryptedPassword) => {
  if (!SECRET_KEY) {
    throw new Error("Decryption key is missing!");
  }
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
