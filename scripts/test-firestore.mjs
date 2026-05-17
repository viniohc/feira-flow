import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore'

const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

const missing = requiredEnv.filter((key) => !process.env[key])

if (missing.length) {
  console.error(`Firebase env incompleto: ${missing.join(', ')}`)
  process.exit(1)
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

try {
  if (!process.env.TEST_FIREBASE_EMAIL || !process.env.TEST_FIREBASE_PASSWORD) {
    throw new Error('Informe TEST_FIREBASE_EMAIL e TEST_FIREBASE_PASSWORD no .env para testar login + Firestore.')
  }

  const auth = getAuth(app)
  await signInWithEmailAndPassword(
    auth,
    process.env.TEST_FIREBASE_EMAIL,
    process.env.TEST_FIREBASE_PASSWORD,
  )
  const snapshot = await getDocs(query(
    collection(getFirestore(app), 'fairs'),
    where(`members.${auth.currentUser.uid}`, '==', true),
    limit(1),
  ))
  console.log(snapshot.empty ? 'Firestore OK: login funcionando; nenhuma feira encontrada ainda.' : 'Firestore OK: login funcionando; feira encontrada.')
} catch (error) {
  console.error('Firestore respondeu com erro:')
  console.error(error)
  process.exit(1)
}
