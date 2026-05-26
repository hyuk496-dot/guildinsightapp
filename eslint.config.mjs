/**
 * Next 16 + ESLint 9 (Flat Config)
 *
 * - Next.js 의 `next build` 는 자체적으로 필요한 검사(타입체크 + 빌드 시 컴파일러 경고)를
 *   수행한다. 이 파일은 외부 도구(예: VS Code ESLint, GitHub Action lint step) 에서
 *   잘못된 폴더(빌드 산출물, 일회성 dev 스크립트 등)를 검사하지 않도록 하는 ignore
 *   범위만 정의한다.
 *
 * - eslint-config-next 자체는 현재 ESLint 9 flat config 에서 circular reference
 *   이슈가 있어 직접 extend 하지 않는다. Next 빌드는 영향을 받지 않음.
 */

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "scripts/**",
      "node_modules/**",
    ],
  },
];
