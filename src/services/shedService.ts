import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import type {
  ShedRecord,
} from "../types/Shed";

import {
  db,
} from "../firebase/config";


// ============================================================
// SHED COLLECTION
// ============================================================

function getShedCollection(
  uid: string,
  snakeId: string,
) {
  return collection(
    db,
    "users",
    uid,
    "snakes",
    snakeId,
    "sheds",
  );
}


// ============================================================
// GET SHED RECORDS
// ============================================================

export async function getSnakeSheds(
  uid: string,
  snakeId: string,
): Promise<ShedRecord[]> {

  const shedsQuery = query(
    getShedCollection(
      uid,
      snakeId,
    ),
    orderBy(
      "shedDate",
      "desc",
    ),
  );

  const snapshot =
    await getDocs(
      shedsQuery,
    );

  return snapshot.docs.map(
    (shedDoc) =>
      shedDoc.data() as ShedRecord,
  );
}


// ============================================================
// SAVE SHED
// ============================================================

export async function saveSnakeShed(
  uid: string,
  shed: ShedRecord,
): Promise<ShedRecord> {

  const shedRef = doc(
    getShedCollection(
      uid,
      shed.snakeId,
    ),
    shed.id,
  );

  await setDoc(
    shedRef,
    shed,
  );

  return shed;
}


// ============================================================
// DELETE SHED
// ============================================================

export async function deleteSnakeShed(
  uid: string,
  snakeId: string,
  shedId: string,
): Promise<void> {

  const shedRef = doc(
    getShedCollection(
      uid,
      snakeId,
    ),
    shedId,
  );

  await deleteDoc(
    shedRef,
  );
}