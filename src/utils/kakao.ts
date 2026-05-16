declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share?: {
        sendDefault: (payload: KakaoSharePayload) => void;
      };
      Link?: {
        sendDefault: (payload: KakaoSharePayload) => void;
      };
    };
  }
}

interface KakaoSharePayload {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
}

const KAKAO_SDK_URL = "https://developers.kakao.com/sdk/js/kakao.js";
const KAKAO_SDK_TIMEOUT_MS = 7_000;
let kakaoSdkPromise: Promise<void> | null = null;

export function initializeKakaoSdk() {
  const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

  if (!kakaoKey) {
    return Promise.resolve();
  }

  if (window.Kakao?.isInitialized()) {
    return Promise.resolve();
  }

  if (!kakaoSdkPromise) {
    kakaoSdkPromise = loadKakaoScript()
      .then(() => {
        if (!window.Kakao) {
          throw new Error("Kakao SDK를 불러오지 못했어요.");
        }

        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoKey);
        }
      })
      .catch((error) => {
        kakaoSdkPromise = null;
        console.error("Kakao SDK initialization failed:", error);
        throw error;
      });
  }

  return kakaoSdkPromise;
}

export async function shareKakao({
  title,
  description,
  buttonTitle,
  url,
}: {
  title: string;
  description: string;
  buttonTitle: string;
  url: string;
}) {
  console.log("=== Kakao Share Debug Log ===");
  console.log("1. window.location.origin:", window.location.origin);
  console.log("2. import.meta.env.BASE_URL:", import.meta.env.BASE_URL);
  console.log("3. 실제 공유 URL:", url);
  console.log(
    "4. VITE_KAKAO_JAVASCRIPT_KEY 존재 여부:",
    !!import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY,
  );
  console.log("5. window.Kakao 존재 여부:", !!window.Kakao);
  console.log(
    "6. window.Kakao.isInitialized() 결과:",
    window.Kakao?.isInitialized() ?? false,
  );
  console.log("===============================");

  if (!import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY) {
    throw new Error("VITE_KAKAO_JAVASCRIPT_KEY가 설정되지 않았어요.");
  }

  await initializeKakaoSdk();

  const payload: KakaoSharePayload = {
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: getAssetUrl("kakao-share.png"),
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    buttons: [
      {
        title: buttonTitle,
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    ],
  };

  if (window.Kakao?.Share?.sendDefault) {
    window.Kakao.Share.sendDefault(payload);
    return;
  }

  if (window.Kakao?.Link?.sendDefault) {
    window.Kakao.Link.sendDefault(payload);
    return;
  }

  throw new Error("카카오 공유 기능을 사용할 수 없어요.");
}

function loadKakaoScript() {
  if (window.Kakao) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${KAKAO_SDK_URL}"]`,
  );

  if (existingScript) {
    return waitForKakaoScript(existingScript);
  }

  const script = document.createElement("script");
  script.src = KAKAO_SDK_URL;
  script.async = true;
  document.head.appendChild(script);

  return waitForKakaoScript(script);
}

function waitForKakaoScript(script: HTMLScriptElement) {
  if (window.Kakao) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Kakao SDK 스크립트 로드에 실패했어요."));
    }, KAKAO_SDK_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    }

    function handleLoad() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error("Kakao SDK 스크립트 로드에 실패했어요."));
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (window.Kakao) {
      cleanup();
      resolve();
    }
  });
}

export function getSettlementUrl(settlementCode: string) {
  const origin = window.location.origin;
  const baseUrl = import.meta.env.BASE_URL;
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${origin}${cleanBaseUrl}/settlements/${settlementCode}`;
}

export function getAssetUrl(path: string) {
  const origin = window.location.origin;
  const baseUrl = import.meta.env.BASE_URL;
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${origin}${cleanBaseUrl}${cleanPath}`;
}
