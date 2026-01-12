module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PMIS 메인 컬러 시스템
        'primary': '#1e1e2f',
        'primary-light': '#2a2a3e',
      },
      maxWidth: {
        '8xl': '88rem', // 1408px - PMIS에서 사용 중인 클래스
      },
      minWidth: {
        '40': '10rem', // min-w-40 for menu panels
      },
    },
  },
  plugins: [],
};
