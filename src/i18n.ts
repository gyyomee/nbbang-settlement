import { useEffect, useState } from "react";

export const supportedLanguages = ["ko", "en"] as const;

export type Language = (typeof supportedLanguages)[number];

export const DEFAULT_LANGUAGE: Language = "ko";

export const appTranslations: Record<
  Language,
  {
    languageSwitchButton: string;
    languageSwitchLabel: string;
  }
> = {
  ko: {
    languageSwitchButton: "English",
    languageSwitchLabel: "Switch language to English",
  },
  en: {
    languageSwitchButton: "한국어",
    languageSwitchLabel: "언어를 한국어로 전환",
  },
};

export function isSupportedLanguage(value: string): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function getNextLanguage(language: Language): Language {
  return language === "ko" ? "en" : "ko";
}

export const homeTranslations = {
  ko: {
    appTitle: "N빵 정산",
    appSubtitle: "최소한의 이체로 깔끔하게 끝내는 똑똑한 정산",
    firebaseConfigError:
      "Firebase 환경변수가 비어 있어요. `.env`를 설정해야 Firestore 저장이 동작합니다.",
    createModeButton: "새 정산 만들기",
    joinModeButton: "기존 정산 참여하기",
    createTitle: "새 정산 만들기",
    myNameLabel: "내 이름",
    myNamePlaceholder: (maxLength: number) =>
      `예: 가요미 (최대 ${maxLength}자)`,
    settlementNameLabel: "정산 이름",
    settlementNamePlaceholder: "예: 서핑 여행",
    createLoading: "만드는 중",
    joinTitle: "기존 정산 참여하기",
    settlementCodeLabel: "정산 코드",
    settlementCodePlaceholder: "A7K9Q2MD",
    checkSettlementButton: "정산 확인하기",
    checkingSettlement: "확인 중",
    currentParticipantsLabel: "현재 참여자",
    participantCount: (count: number) => `${count}명`,
    noParticipants: "아직 참여자가 없어요.",
    joinSettlementButton: "정산 참여하기",
    joiningSettlement: "참여 중",
    duplicateNameTitle: "같은 이름이 있어요",
    duplicateNameMessage:
      "이미 참여자로 등록된 이름입니다. 기존 참여자로 입장할까요?",
    joinExistingButton: "기존 참여자로 입장",
    retryNameButton: "이름 다시 입력",
    recentSettlementsTitle: "최근 참여한 정산",
    noRecentSettlements: "최근 참여한 정산이 아직 없어요.",
    removeFromListButton: "목록에서 제외",
    removeFromListLabel: (settlementName: string) =>
      `${settlementName} 목록에서 제외`,
    settlementNameRequired: "정산 이름을 입력해주세요.",
    myNameRequired: "내 이름을 입력해주세요.",
    myNameMaxLength: (maxLength: number) =>
      `내 이름은 ${maxLength}자 이하로 입력해주세요.`,
    invalidSettlementCode: "정산 코드는 8자리 영문 대문자와 숫자로 입력해주세요.",
    settlementNotFound: "존재하지 않는 정산 코드예요.",
    checkSettlementFailed: "정산을 확인하지 못했어요.",
    joinNeedsSettlementCheck: "정산 코드를 먼저 확인해주세요.",
    joinSettlementFailed: "정산에 참여하지 못했어요.",
    createSettlementFailed: "정산을 만들지 못했어요.",
    saveSettlementFailed:
      "정산을 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.",
    firestoreOfflineError:
      "Firestore에 연결할 수 없어요. 인터넷 연결, Firebase 프로젝트의 Firestore Database 생성 여부, Firestore Rules 배포 상태를 확인해주세요.",
    firestorePermissionError:
      "Firestore 권한이 거부됐어요. firestore.rules 내용을 Firebase 콘솔 또는 Firebase CLI로 배포했는지 확인해주세요.",
  },
  en: {
    appTitle: "N-Bang Split",
    appSubtitle: "Smart bill splitting with the fewest transfers",
    firebaseConfigError:
      "Firebase environment variables are missing. Set `.env` and restart the dev server to save to Firestore.",
    createModeButton: "Create New Split",
    joinModeButton: "Join Existing Split",
    createTitle: "Create New Split",
    myNameLabel: "My Name",
    myNamePlaceholder: (maxLength: number) =>
      `e.g. Gayo (max ${maxLength} chars)`,
    settlementNameLabel: "Split Name",
    settlementNamePlaceholder: "e.g. Surf Trip",
    createLoading: "Creating",
    joinTitle: "Join Existing Split",
    settlementCodeLabel: "Split Code",
    settlementCodePlaceholder: "A7K9Q2MD",
    checkSettlementButton: "Check Split",
    checkingSettlement: "Checking",
    currentParticipantsLabel: "Participants",
    participantCount: (count: number) => `${count}`,
    noParticipants: "No participants yet.",
    joinSettlementButton: "Join Split",
    joiningSettlement: "Joining",
    duplicateNameTitle: "Name Already Exists",
    duplicateNameMessage:
      "This name is already registered. Enter as the existing participant?",
    joinExistingButton: "Enter as Existing",
    retryNameButton: "Enter Another Name",
    recentSettlementsTitle: "Recent Splits",
    noRecentSettlements: "No recent splits yet.",
    removeFromListButton: "Remove",
    removeFromListLabel: (settlementName: string) =>
      `Remove ${settlementName} from the list`,
    settlementNameRequired: "Please enter a split name.",
    myNameRequired: "Please enter your name.",
    myNameMaxLength: (maxLength: number) =>
      `Your name must be ${maxLength} characters or fewer.`,
    invalidSettlementCode:
      "Enter an 8-character code using uppercase letters and numbers.",
    settlementNotFound: "That split code does not exist.",
    checkSettlementFailed: "Could not check the split.",
    joinNeedsSettlementCheck: "Please check the split code first.",
    joinSettlementFailed: "Could not join the split.",
    createSettlementFailed: "Could not create the split.",
    saveSettlementFailed:
      "Could not save the split. Check your internet connection and try again.",
    firestoreOfflineError:
      "Could not connect to Firestore. Check your internet connection, Firestore Database setup, and deployed Firestore Rules.",
    firestorePermissionError:
      "Firestore permission was denied. Check that firestore.rules has been deployed in Firebase Console or with Firebase CLI.",
  },
} satisfies Record<Language, Record<string, string | ((value: never) => string)>>;

export const participantListTranslations = {
  ko: {
    title: "참여자",
    participantCount: (count: number) => `${count}명`,
    addParticipantButton: "참여자 추가",
    participantNameLabel: "참여자 이름",
    participantNamePlaceholder: (maxLength: number) =>
      `예: 가요미 (최대 ${maxLength}자)`,
    participantNameRequired: "참여자 이름을 입력해주세요.",
    participantNameMaxLength: (maxLength: number) =>
      `참여자 이름은 ${maxLength}자 이하로 입력해주세요.`,
    addButton: "추가",
    addingButton: "추가 중",
    cancelButton: "취소",
    meBadge: "(나)",
    deleteParticipantLabel: (participantName: string) =>
      `${participantName} 삭제`,
    deleteConfirm:
      "정말 이 참여자를 삭제할까요? 삭제 후 복구할 수 없습니다.",
    noParticipants: "아직 참여자가 없어요.",
    addParticipantFailed: "참여자를 추가하지 못했어요.",
    deleteParticipantFailed: "참여자를 삭제하지 못했어요.",
    duplicateParticipant:
      "이미 같은 이름의 참여자가 있어요. 구분되는 이름으로 입력해주세요.",
    deleteBlocked:
      "이 참여자는 이미 결제 내역에 포함되어 있어 삭제할 수 없습니다. 관련 결제 내역을 먼저 삭제해주세요.",
    deleteWaitForExpenses:
      "결제 내역을 불러오는 중이에요. 잠시 후 다시 시도해주세요.",
    selfDeleteBlocked:
      "내 참여자 정보는 삭제할 수 없습니다. 이름 변경만 가능합니다.",
    updateParticipantFailed: "수정하지 못했어요.",
    editNamePlaceholder: "이름 입력",
  },
  en: {
    title: "Participants",
    participantCount: (count: number) => `${count}`,
    addParticipantButton: "Add Participant",
    participantNameLabel: "Participant Name",
    participantNamePlaceholder: (maxLength: number) =>
      `e.g. Gayo (max ${maxLength} chars)`,
    participantNameRequired: "Please enter a participant name.",
    participantNameMaxLength: (maxLength: number) =>
      `Participant names must be ${maxLength} characters or fewer.`,
    addButton: "Add",
    addingButton: "Adding",
    cancelButton: "Cancel",
    meBadge: "(Me)",
    deleteParticipantLabel: (participantName: string) =>
      `Delete ${participantName}`,
    deleteConfirm:
      "Are you sure you want to delete this participant? This cannot be undone.",
    noParticipants: "No participants yet.",
    addParticipantFailed: "Could not add the participant.",
    deleteParticipantFailed: "Could not delete the participant.",
    duplicateParticipant:
      "A participant with the same name already exists. Please enter a distinct name.",
    deleteBlocked:
      "This participant is already included in an expense and cannot be deleted. Delete the related expense first.",
    deleteWaitForExpenses:
      "Expenses are still loading. Please try again in a moment.",
    selfDeleteBlocked:
      "You cannot delete your own participant info. You can only rename it.",
    updateParticipantFailed: "Could not update the participant.",
    editNamePlaceholder: "Enter name",
  },
} satisfies Record<
  Language,
  Record<string, string | ((value: never) => string)>
>;

export const expenseFormTranslations = {
  ko: {
    addExpenseButton: "결제 내역 추가",
    disabledMessage: "이름을 입력하고 참여하면 결제 내역을 추가할 수 있어요.",
    title: "결제 내역 입력",
    expenseDateLabel: "결제 날짜",
    payerLabel: "결제자",
    amountLabel: "금액",
    amountPlaceholder: "0",
    descriptionLabel: "상세내역",
    descriptionPlaceholder: "예: 저녁 식사, 택시비",
    targetParticipantsLabel: "정산 대상자",
    selectAllTargetsButton: "전체 선택",
    clearAllTargetsButton: "전체 해제",
    payerRequired: "결제자를 선택해주세요.",
    amountRequired: "금액을 1원 이상 입력해주세요.",
    targetsRequired: "정산 대상자를 1명 이상 선택해주세요.",
    addExpenseFailed: "결제 내역을 추가하지 못했어요.",
    submitButton: "등록",
    continueSubmitButton: "계속 등록",
    submittingButton: "등록 중",
    cancelButton: "취소",
  },
  en: {
    addExpenseButton: "Add Expense",
    disabledMessage: "Enter your name and join to add expenses.",
    title: "Expense Entry",
    expenseDateLabel: "Date",
    payerLabel: "Payer",
    amountLabel: "Amount",
    amountPlaceholder: "0",
    descriptionLabel: "Details",
    descriptionPlaceholder: "e.g. Dinner, taxi fare",
    targetParticipantsLabel: "Split With",
    selectAllTargetsButton: "Select All",
    clearAllTargetsButton: "Clear All",
    payerRequired: "Please select a payer.",
    amountRequired: "Enter an amount of at least 1.",
    targetsRequired: "Select at least one participant.",
    addExpenseFailed: "Could not add the expense.",
    submitButton: "Register",
    continueSubmitButton: "Keep Adding",
    submittingButton: "Saving",
    cancelButton: "Cancel",
  },
} satisfies Record<Language, Record<string, string>>;

export const expenseListTranslations = {
  ko: {
    title: "결제 내역",
    addExpenseButton: "결제 내역 추가",
    expenseCount: (count: number) => `${count}건`,
    emptyMessage: "아직 추가된 결제 내역이 없어요.",
    expenseDateLabel: "결제 날짜",
    payerLabel: "결제자",
    amountLabel: "금액",
    descriptionLabel: "상세내역",
    targetParticipantsLabel: "정산 대상자",
    selectAllTargetsButton: "전체 선택",
    clearAllTargetsButton: "전체 해제",
    payerRequired: "결제자를 선택해주세요.",
    amountRequired: "금액을 1원 이상 입력해주세요.",
    targetsRequired: "정산 대상자를 1명 이상 선택해주세요.",
    updateExpenseFailed: "결제 내역을 수정하지 못했어요.",
    savingButton: "저장 중",
    saveEditButton: "수정 저장",
    cancelButton: "취소",
    paidByLine: (payerName: string) => `결제: ${payerName}`,
    targetLine: (participantNames: string) => `대상: ${participantNames}`,
    editButton: "수정",
    deleteButton: "삭제",
  },
  en: {
    title: "Expenses",
    addExpenseButton: "Add Expense",
    expenseCount: (count: number) => `${count} ${count === 1 ? "item" : "items"}`,
    emptyMessage: "No expenses have been added yet.",
    expenseDateLabel: "Date",
    payerLabel: "Payer",
    amountLabel: "Amount",
    descriptionLabel: "Details",
    targetParticipantsLabel: "Split With",
    selectAllTargetsButton: "Select All",
    clearAllTargetsButton: "Clear All",
    payerRequired: "Please select a payer.",
    amountRequired: "Enter an amount of at least 1.",
    targetsRequired: "Select at least one participant.",
    updateExpenseFailed: "Could not update the expense.",
    savingButton: "Saving",
    saveEditButton: "Save Edit",
    cancelButton: "Cancel",
    paidByLine: (payerName: string) => `Paid by: ${payerName}`,
    targetLine: (participantNames: string) => `Split with: ${participantNames}`,
    editButton: "Edit",
    deleteButton: "Delete",
  },
} satisfies Record<
  Language,
  Record<string, string | ((value: never) => string)>
>;

export const settlementResultTranslations = {
  ko: {
    title: "최종 정산 결과",
    remainderNote: "나머지 금액은 결제자가 부담하도록 계산했어요.",
    paidAmountLabel: "낸 금액",
    owedAmountLabel: "내 몫",
    receivableAmountLabel: "받을 금액",
    payableAmountLabel: "보낼 금액",
    settledAmountLabel: "정산 완료",
    transfersTitle: "송금할 내역",
    noTransfers: "정산할 금액이 없습니다.",
  },
  en: {
    title: "Final Settlement",
    remainderNote: "Remainders are assigned to the payer.",
    paidAmountLabel: "Paid",
    owedAmountLabel: "My Share",
    receivableAmountLabel: "To Receive",
    payableAmountLabel: "To Send",
    settledAmountLabel: "Settled",
    transfersTitle: "Transfers",
    noTransfers: "No transfers needed.",
  },
} satisfies Record<Language, Record<string, string>>;

export const settlementHeaderTranslations = {
  ko: {
    homeLabel: "홈",
    homeAriaLabel: "홈으로 이동",
    settlementCodeLabel: "정산 코드",
    copyButton: "복사",
    copiedButton: "복사됨",
  },
  en: {
    homeLabel: "Home",
    homeAriaLabel: "Go Home",
    settlementCodeLabel: "Split Code",
    copyButton: "Copy",
    copiedButton: "Copied",
  },
} satisfies Record<Language, Record<string, string>>;

export const settlementPageTranslations = {
  ko: {
    loadingReceipt: "정산 영수증을 불러오는 중...",
    expiredTitle: "만료된 정산입니다.",
    expiredMessage:
      "이 정산은 90일 보관 기간이 지나 입력, 수정, 삭제를 할 수 없습니다.",
    firebaseConfigError:
      "Firebase 환경변수가 비어 있어요. `.env`를 설정해야 Firestore 저장이 동작합니다.",
    joinTitle: "이 정산에 참여하기",
    myNameLabel: "내 이름",
    myNamePlaceholder: (maxLength: number) => `이름 (최대 ${maxLength}자)`,
    joinButton: "참여하기",
    duplicateNameTitle: "동일한 이름이 있어요",
    duplicateNameMessage:
      "이미 참여한 사람인가요, 아니면 새로운 참여자인가요?",
    joinExistingButton: "기존 참여자로 입장",
    joinNewButton: "새 참여자로 추가",
    joinNameRequired: "참여할 이름을 입력해주세요.",
    myNameMaxLength: (maxLength: number) =>
      `내 이름은 ${maxLength}자 이하로 입력해주세요.`,
    joinFailed: "참여하지 못했어요.",
    duplicateParticipant:
      "이미 같은 이름의 참여자가 있어요. 구분되는 이름으로 입력해주세요.",
    expenseParticipantError: "결제자와 정산 대상자를 다시 확인해주세요.",
    deleteExpenseConfirm: "이 결제 내역을 삭제할까요?",
    deleteWaitForExpenses:
      "결제 내역을 불러오는 중이에요. 잠시 후 다시 시도해주세요.",
    deleteBlocked:
      "이 참여자는 이미 결제 내역에 포함되어 있어 삭제할 수 없습니다. 관련 결제 내역을 먼저 삭제해주세요.",
    deleteOnlyParticipant: "정산에 참여한 사람만 삭제할 수 있어요.",
    deleteSettlementConfirm:
      "이 정산을 서버에서 완전히 삭제할까요?\n참여자, 결제 내역, 정산 결과가 모두 삭제되고 되돌릴 수 없어요.",
    deleteSettlementFailed: "정산을 삭제하지 못했어요.",
    deletingSettlementButton: "정산 삭제 중",
    deleteSettlementButton: "정산 삭제하기",
  },
  en: {
    loadingReceipt: "Loading settlement receipt...",
    expiredTitle: "This split has expired.",
    expiredMessage:
      "This split is past the 90-day retention period, so it cannot be edited or deleted.",
    firebaseConfigError:
      "Firebase environment variables are missing. Set `.env` to save to Firestore.",
    joinTitle: "Join This Split",
    myNameLabel: "My Name",
    myNamePlaceholder: (maxLength: number) =>
      `Name (max ${maxLength} chars)`,
    joinButton: "Join",
    duplicateNameTitle: "Same Name Found",
    duplicateNameMessage:
      "Is this you, or do you want to join as a new participant?",
    joinExistingButton: "Enter as Existing",
    joinNewButton: "Add as New",
    joinNameRequired: "Please enter a name to join.",
    myNameMaxLength: (maxLength: number) =>
      `Your name must be ${maxLength} characters or fewer.`,
    joinFailed: "Could not join.",
    duplicateParticipant:
      "A participant with the same name already exists. Please enter a distinct name.",
    expenseParticipantError: "Please check the payer and split participants.",
    deleteExpenseConfirm: "Delete this expense?",
    deleteWaitForExpenses:
      "Expenses are still loading. Please try again in a moment.",
    deleteBlocked:
      "This participant is already included in an expense and cannot be deleted. Delete the related expense first.",
    deleteOnlyParticipant: "Only participants in this split can delete it.",
    deleteSettlementConfirm:
      "Permanently delete this split from the server?\nParticipants, expenses, and results will all be deleted. This cannot be undone.",
    deleteSettlementFailed: "Could not delete the split.",
    deletingSettlementButton: "Deleting Split",
    deleteSettlementButton: "Delete Split",
  },
} satisfies Record<
  Language,
  Record<string, string | ((value: never) => string)>
>;

export const kakaoInviteTranslations = {
  ko: {
    title: "N빵 정산에 참여해주세요.",
    settlementNameLabel: "정산 이름",
    settlementCodeLabel: "정산 코드",
    buttonTitle: "정산 참여하기",
    shareFailed: "카카오톡 공유에 실패했어요.",
    sharingButton: "공유 준비 중",
    inviteButton: "카카오톡으로 초대하기",
  },
  en: {
    title: "Join this split.",
    settlementNameLabel: "Split name",
    settlementCodeLabel: "Split code",
    buttonTitle: "Join Split",
    shareFailed: "Could not share to KakaoTalk.",
    sharingButton: "Preparing Share",
    inviteButton: "Invite via KakaoTalk",
  },
} satisfies Record<Language, Record<string, string>>;

export const kakaoSettlementShareTranslations = {
  ko: {
    title: "정산 결과가 나왔어요.",
    buttonTitle: "정산 보기",
    shareFailed: "카카오톡 공유에 실패했어요.",
    sharingButton: "공유 준비 중",
    shareButton: "카카오톡으로 결과 공유하기",
  },
  en: {
    title: "Split results are ready.",
    buttonTitle: "View Split",
    shareFailed: "Could not share to KakaoTalk.",
    sharingButton: "Preparing Share",
    shareButton: "Share Results via KakaoTalk",
  },
} satisfies Record<Language, Record<string, string>>;

function getDocumentLanguage(): Language {
  if (typeof document === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const language = document.documentElement.lang;

  return isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
}

export function useCurrentLanguage() {
  const [language, setLanguage] = useState<Language>(() =>
    getDocumentLanguage(),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setLanguage(getDocumentLanguage());
    });

    observer.observe(document.documentElement, {
      attributeFilter: ["lang"],
      attributes: true,
    });

    setLanguage(getDocumentLanguage());

    return () => observer.disconnect();
  }, []);

  return language;
}
