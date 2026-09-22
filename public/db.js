const DB_NAME = "vku-field-survey-db";

const DB_VERSION = 1;

const STORE_NAME = "submissions";

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });

        store.createIndex("syncStatus", "syncStatus", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveSubmission(submission) {
  const db = await openDB();

  const transaction = db.transaction(STORE_NAME, "readwrite");

  const store = transaction.objectStore(STORE_NAME);

  await requestToPromise(store.put(submission));
}

export async function getAllSubmissions() {
  const db = await openDB();

  const transaction = db.transaction(STORE_NAME, "readonly");

  const store = transaction.objectStore(STORE_NAME);

  return requestToPromise(store.getAll());
}

export async function getPendingSubmissions() {
  const db = await openDB();

  const transaction = db.transaction(STORE_NAME, "readonly");

  const store = transaction.objectStore(STORE_NAME);

  const index = store.index("syncStatus");

  return requestToPromise(index.getAll("pending"));
}

export async function updateSubmission(id, changes) {
  const db = await openDB();

  const transaction = db.transaction(STORE_NAME, "readwrite");

  const store = transaction.objectStore(STORE_NAME);

  const current = await requestToPromise(store.get(id));

  if (!current) {
    throw new Error("Submission not found");
  }

  const updated = {
    ...current,
    ...changes,
  };

  await requestToPromise(store.put(updated));

  return updated;
}
