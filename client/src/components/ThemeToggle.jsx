// src/components/ThemeToggle.jsx
import React, { useState, useEffect } from "react";
import { FiSun, FiMoon } from "react-icons/fi"; // icons

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 transition"
    >
      {theme === "dark" ? (
        <FiSun className="text-yellow-400" size={20} />
      ) : (
        <FiMoon className="text-gray-800" size={20} />
      )}
    </button>
  );
};

export default ThemeToggle;
