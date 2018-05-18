const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')

const msg = randomBytes(32)
 
let privKey
do {
  privKey = randomBytes(32)
} while (!secp256k1.privateKeyVerify(privKey))
 
const pubKey = secp256k1.publicKeyCreate(privKey)
 
const sigObj = secp256k1.sign(msg, privKey)
 
console.log(secp256k1.verify(msg, sigObj.signature, pubKey))