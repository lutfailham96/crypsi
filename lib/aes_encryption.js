const { createCipheriv, createDecipheriv } = require('crypto');
const { Buffer } = require('buffer');
const algorithms = require('./alg');
const keyUtil = require('./key_util');

const DEFAULT_AUTH_TAG_LENGTH = 16;
const SUPPORTED_AUTH_TAG_MODES = ['gcm', 'ccm', 'ocb', 'chacha20-poly1305'];

/**
 * @param alg {string}
 * @return {{mode: *, ivLen: (number), expectedKeyLen: number}}
 */
const getMetaFromAlgorithm = (alg) => {
  const algSplited = alg.split('-');
  if (algSplited.length < 3) {
    throw new Error('invalid aes algorithm');
  }

  const keyLenInt = parseInt(algSplited[1], 10);
  const ivLen = algSplited[2] === 'cbc' ? 16 : 12;
  return { expectedKeyLen: keyLenInt / 8, mode: algSplited[2], ivLen };
};

/**
 * @param alg {string}
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
const encrypt = (alg, key, data) => {
  const metaAlg = getMetaFromAlgorithm(alg);
  if (key.length !== metaAlg.expectedKeyLen) {
    throw new Error(`invalid key length, key length should be ${metaAlg.expectedKeyLen}`);
  }

  const nonce = keyUtil.generateRandomIV(metaAlg.ivLen);
  const nonceBuf = Buffer.from(nonce, 'hex');

  const keyBuf = Buffer.from(key);

  const cipherOptions = {
    authTagLength: DEFAULT_AUTH_TAG_LENGTH,
  };

  const cipher = createCipheriv(alg, keyBuf, nonceBuf, cipherOptions);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // https://nodejs.org/api/crypto.html#ciphergetauthtag
  if (SUPPORTED_AUTH_TAG_MODES.includes(metaAlg.mode)) {
    encrypted += Buffer.from(cipher.getAuthTag().toString('hex'));
  }

  return {
    nonce,
    encrypted: encrypted.toString('hex'),
  };
};

/**
 * @param alg {string}
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
const decrypt = (alg, key, data) => {
  if (typeof data !== 'object') {
    throw new Error('error: data param should be object');
  }

  const metaAlg = getMetaFromAlgorithm(alg);
  if (key.length !== metaAlg.expectedKeyLen) {
    throw new Error(`invalid key length, key length should be ${metaAlg.expectedKeyLen}`);
  }

  const nonceBuf = Buffer.from(data.nonce, 'hex');
  const keyBuf = Buffer.from(key);

  const cipherOptions = {
    authTagLength: DEFAULT_AUTH_TAG_LENGTH,
  };

  const decipher = createDecipheriv(alg, keyBuf, nonceBuf, cipherOptions);

  const buf = Buffer.from(data.encrypted, 'hex');

  let encryptedText;
  // https://nodejs.org/api/crypto.html#deciphersetauthtag
  if (SUPPORTED_AUTH_TAG_MODES.includes(metaAlg.mode)) {
    const sFrom = buf.length - DEFAULT_AUTH_TAG_LENGTH;
    const authTagUtf8 = buf.subarray(sFrom, buf.length);
    decipher.setAuthTag(authTagUtf8);
    encryptedText = buf.subarray(0, sFrom); // encryptedTextUtf8
  } else {
    encryptedText = buf;
  }

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted.toString();
};

// CBC
/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes128Cbc = (key, data) => encrypt(algorithms.AES_128_CBC, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes192Cbc = (key, data) => encrypt(algorithms.AES_192_CBC, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes256Cbc = (key, data) => encrypt(algorithms.AES_256_CBC, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes128Cbc = (key, data) => decrypt(algorithms.AES_128_CBC, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes192Cbc = (key, data) => decrypt(algorithms.AES_192_CBC, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes256Cbc = (key, data) => decrypt(algorithms.AES_256_CBC, key, data);

// GCM
/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes128Gcm = (key, data) => encrypt(algorithms.AES_128_GCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes192Gcm = (key, data) => encrypt(algorithms.AES_192_GCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes256Gcm = (key, data) => encrypt(algorithms.AES_256_GCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes128Gcm = (key, data) => decrypt(algorithms.AES_128_GCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes192Gcm = (key, data) => decrypt(algorithms.AES_192_GCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes256Gcm = (key, data) => decrypt(algorithms.AES_256_GCM, key, data);

// CCM
/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes128Ccm = (key, data) => encrypt(algorithms.AES_128_CCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes192Ccm = (key, data) => encrypt(algorithms.AES_192_CCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes256Ccm = (key, data) => encrypt(algorithms.AES_256_CCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes128Ccm = (key, data) => decrypt(algorithms.AES_128_CCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes192Ccm = (key, data) => decrypt(algorithms.AES_192_CCM, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes256Ccm = (key, data) => decrypt(algorithms.AES_256_CCM, key, data);

// OCB
/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes128Ocb = (key, data) => encrypt(algorithms.AES_128_OCB, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes192Ocb = (key, data) => encrypt(algorithms.AES_192_OCB, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {{encrypted: string, nonce}}
 */
exports.encryptWithAes256Ocb = (key, data) => encrypt(algorithms.AES_256_OCB, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes128Ocb = (key, data) => decrypt(algorithms.AES_128_OCB, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes192Ocb = (key, data) => decrypt(algorithms.AES_192_OCB, key, data);

/**
 * @param key {string}
 * @param data {string | Buffer}
 * @return {string}
 */
exports.decryptWithAes256Ocb = (key, data) => decrypt(algorithms.AES_256_OCB, key, data);
