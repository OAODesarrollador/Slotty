"use client";

import { useEffect } from "react";

type HeaderTheme = "dark" | "light";

const BASE_CLASS = "root-home-header-contrast";
const DARK_CLASS = "root-home-header-dark";
const LIGHT_CLASS = "root-home-header-light";

function setHeaderTheme(theme: HeaderTheme) {
  document.body.classList.add(BASE_CLASS);
  document.body.classList.toggle(DARK_CLASS, theme === "dark");
  document.body.classList.toggle(LIGHT_CLASS, theme === "light");
}

export function HomeHeaderContrast() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-header-theme]"));
    let frame = 0;

    const updateTheme = () => {
      frame = 0;

      const header = document.querySelector<HTMLElement>(".main-header");
      const probeY = window.scrollY + (header?.offsetHeight ?? 72) / 2;
      let theme: HeaderTheme = "dark";

      for (const section of sections) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;

        if (sectionTop <= probeY) {
          theme = section.dataset.headerTheme === "light" ? "light" : "dark";
        }
      }

      setHeaderTheme(theme);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateTheme);
    };

    updateTheme();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.body.classList.remove(BASE_CLASS, DARK_CLASS, LIGHT_CLASS);
    };
  }, []);

  return null;
}
