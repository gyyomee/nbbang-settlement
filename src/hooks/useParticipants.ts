import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, hasFirebaseConfig } from "../firebase";
import type { Participant } from "../types";

export function useParticipants(settlementCode?: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setParticipants([]);
      setError("Firebase 환경변수가 설정되지 않았어요. .env 파일을 확인해주세요.");
      setLoading(false);
      return undefined;
    }

    if (!settlementCode) {
      setParticipants([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const participantsQuery = query(
      collection(db, "settlements", settlementCode, "participants"),
      orderBy("joinedAt", "asc"),
    );

    return onSnapshot(
      participantsQuery,
      (snapshot) => {
        setParticipants(snapshot.docs.map((participantDoc) => participantDoc.data() as Participant));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, [settlementCode]);

  return { participants, loading, error };
}
