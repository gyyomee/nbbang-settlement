import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, hasFirebaseConfig } from "../firebase";
import type { Expense } from "../types";

export function useExpenses(settlementCode?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setExpenses([]);
      setError("Firebase 환경변수가 설정되지 않았어요. .env 파일을 확인해주세요.");
      setLoading(false);
      return undefined;
    }

    if (!settlementCode) {
      setExpenses([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const expensesQuery = query(collection(db, "settlements", settlementCode, "expenses"), orderBy("createdAt", "desc"));

    return onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expenseItems = snapshot.docs.map((expenseDoc) => expenseDoc.data() as Expense);

        setExpenses(
          expenseItems.sort((a, b) => {
            const dateCompare = b.expenseDate.localeCompare(a.expenseDate);
            return dateCompare === 0 ? b.createdAt.toMillis() - a.createdAt.toMillis() : dateCompare;
          }),
        );
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, [settlementCode]);

  return { expenses, loading, error };
}
