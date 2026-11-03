import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

// Валидные значения кастомизации (ТЗ: 3 тёмные темы + 3 шрифта)
const VALID_THEMES = ['zinc', 'slate', 'emerald'];
const VALID_FONTS = ['inter', 'manrope', 'mono'];

export const ThemeProvider = ({ children }) => {
  // Цветовая тема: читаем из localStorage; старые значения ('dark'/'light') мигрируем в 'zinc'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return VALID_THEMES.includes(saved) ? saved : 'zinc';
  });

  // Шрифт интерфейса
  const [font, setFont] = useState(() => {
    const saved = localStorage.getItem('ui-font');
    return VALID_FONTS.includes(saved) ? saved : 'inter';
  });

  // Применяем тему через data-theme на <html> — CSS-переменные подхватятся автоматически
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Применяем шрифт классом на body (fallback-шрифты описаны в index.css)
  useEffect(() => {
    document.body.className = `font-${font}`;
    localStorage.setItem('ui-font', font);
  }, [font]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
};
