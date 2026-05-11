import { UserRound } from "lucide-react";
import type { Participant } from "../types";

export default function ParticipantList({
  participants,
  currentParticipantId,
}: {
  participants: Participant[];
  currentParticipantId: string | null;
}) {
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentParticipantId) return -1;
    if (b.id === currentParticipantId) return 1;
    return 0;
  });

  return (
    <section className="receipt-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">참여자</h2>
        <span className="text-sm font-bold text-receipt-muted">
          {participants.length}명
        </span>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-receipt-muted">아직 참여자가 없어요.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {sortedParticipants.map((participant) => {
            const isMe = participant.id === currentParticipantId;
            return (
              <li
                className={`flex items-center gap-2 border px-3 py-1.5 ${
                  isMe
                    ? "border-receipt-ink bg-receipt-ink text-white"
                    : "border-receipt-line bg-white/50"
                }`}
                key={participant.id}
              >
                <span className="flex items-center gap-1.5">
                  <UserRound size={15} aria-hidden="true" />
                  <span className="text-sm font-bold">
                    {participant.name.length > 5
                      ? `${participant.name.slice(0, 5)}…`
                      : participant.name}
                    {isMe && " (나)"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
