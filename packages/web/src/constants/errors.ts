// Failure to communicate with server due to CORS or network conditions
export const FAILED_TO_FETCH = 'Failed to fetch';

// OPFS not supported
export const COMPATIBILITY_MESSAGE = {
  en: `
<div class="flex flex-col items-center justify-center p-4 text-center text-balance">
  <h2 class="text-2xl font-bold mb-4">Browser Compatibility Issue</h2>
  <p class="mb-4">This application requires features that are not available in your current browser or browsing mode.</p>
  <p class="text-sm">Please try using a modern browser (Chrome, Edge, Firefox, etc.) in normal browsing mode.</p>
  <p class="text-sm mt-2">Private browsing modes often restrict storage access needed by this application.</p>
</div>
`,
  ko: `
<div class="flex flex-col items-center justify-center p-4 text-center text-balance">
  <h2 class="text-2xl font-bold mb-4">브라우저 호환성 문제</h2>
  <p class="mb-4">이 애플리케이션은 현재 브라우저 또는 브라우징 모드에서 사용할 수 없는 기능을 필요로 합니다.</p>
  <p class="text-sm"> 최신 브라우저 (Chrome, Edge, Firefox 등)을 사용하여 일반 브라우징 모드에서 사용해 주세요.</p>
  <p class="text-sm mt-2">프라이빗 브라우징 모드는 이 애플리케이션에 필요한 저장 공간에 제한을 둘 수 있습니다.</p>
</div>
`,
};
