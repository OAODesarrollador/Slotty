"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    // 1. SCROLL REVEAL (INTERSECTION OBSERVER)
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-reveal", "true");
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll("[data-animate]");
    elements.forEach((el) => observer.observe(el));

    // 2. STICKY HEADER SHADOW (ON SCROLL)
    const handleScroll = () => {
      if (window.scrollY > 20) {
        document.body.classList.add("header-scrolled");
      } else {
        document.body.classList.remove("header-scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
