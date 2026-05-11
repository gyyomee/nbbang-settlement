import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, hasFirebaseConfig } from "../firebase";
import type { Settlement } from "../types";

export function useSettlement(settlementCode?: string) {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setSettlement(null);
      setError("Firebase 환경변수가 설정되지 않았어요. .env 파일을 확인해주세요.");
      setLoading(false);
      return undefined;
    }

    if (!settlementCode) {
      setSettlement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    return onSnapshot(
      doc(db, "settlements", settlementCode),
      (snapshot) => {
        setSettlement(snapshot.exists() ? (snapshot.data() as Settlement) : null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, [settlementCode]);

  return { settlement, loading, error };
}
