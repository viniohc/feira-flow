import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type WithFieldValue,
} from 'firebase/firestore'
import { ensureFirebaseSignedIn, getFirebaseDb } from '@/lib/firebase'

export const FIRESTORE_LIMITS = {
  products: 100,
  salesPerDay: 300,
  settings: 1,
} as const

const withId = <T>(snapshot: { id: string; data: () => DocumentData }) => ({
  id: snapshot.id,
  ...snapshot.data(),
}) as T

export const getCollection = async <T>(collectionPath: string, max = 50, constraints: QueryConstraint[] = []) => {
  await ensureFirebaseSignedIn()
  const collectionRef = collection(getFirebaseDb(), collectionPath)
  const snapshot = await getDocs(query(collectionRef, ...constraints, limit(max)))
  return snapshot.docs.map((item) => withId<T>(item))
}

export const getDocument = async <T>(collectionPath: string, documentId: string) => {
  await ensureFirebaseSignedIn()
  const snapshot = await getDoc(doc(getFirebaseDb(), collectionPath, documentId))
  return snapshot.exists() ? withId<T>(snapshot) : undefined
}

export const setDocument = async <T extends { id: string }>(collectionPath: string, data: T) => {
  await ensureFirebaseSignedIn()
  await setDoc(doc(getFirebaseDb(), collectionPath, data.id), data as WithFieldValue<DocumentData>)
}

export const patchDocument = async <T extends object>(
  collectionPath: string,
  documentId: string,
  data: Partial<T>,
) => {
  await ensureFirebaseSignedIn()
  await updateDoc(doc(getFirebaseDb(), collectionPath, documentId), data as DocumentData)
}

export const byField = where
export const orderedBy = orderBy
