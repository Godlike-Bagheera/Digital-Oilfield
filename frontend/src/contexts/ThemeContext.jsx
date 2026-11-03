import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

// Валидные значения кастомизации (ТЗ: 3 тёмные темы + 3 реально разных шрифта)
const VALID_THEMES = ['zinc', 'navy', 'forest'];
const VALID_FONTS = ['sans', 'serif', 'mono'];

export const ThemeProvider = ({ children }) => {
  // Цветовая тема: читаем из localStorage; старые/невалидные значения мигрируем в 'zinc'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return VALID_THEMES.includes(saved) ? saved : 'zinc';
  });

  // Шрифт интерфейса: sans (Inter), serif (Lora), mono (JetBrains Mono)
  const [font, setFont] = useState(() => {
    const saved = localStorage.getItem('ui-font');
    return VALID_FONTS.includes(saved) ? saved : 'sans';
  });

  // Применяем тему через data-theme на <html> — CSS-переменные подхватятся автоматически
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Применяем шрифт классом font-${font} на body (fallback-шрифты описаны в index.css)
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`font-${font}`);
    localStorage.setItem('ui-font', font);
  }, [font]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
};
