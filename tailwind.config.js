/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './public/app.js'],
  theme: {
    extend: {
      colors: {
        milktea: '#F4ECE4',
        cardBg: 'rgba(255, 255, 255, 0.75)',
        morandi: { taupe: '#B4968F', pink: '#F58595', dark: '#7A635E', light: '#E8DEDC' }
      }
    }
  }
};
