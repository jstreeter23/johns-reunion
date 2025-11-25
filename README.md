# 🌳 The Johns Reunion - Brownsville 2026

A modern, responsive website built for the upcoming Johns Family Reunion. This project serves as the central hub for family members to view schedules, register for events, share ideas, and see who is attending.

![Project Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Live Demo
**[View the Live Site Here](https://jstreeter23.github.io/johns-reunion/)** 

## ✨ Features

* **⚡ Simulated SPA Experience:** Fast, app-like navigation without page reloads using a lightweight vanilla JS router.
* **🎨 Custom Design System:** Earthy "Rooted in Love" color palette using Tailwind CSS with custom `brand` and `sand` themes.
* **🌗 Dark Mode:** Fully supported dark mode that respects user system preferences and includes a manual toggle.
* **📱 Mobile-First:** Responsive navigation that adapts from a desktop header to a mobile drawer menu.
* **📅 Event Calendar:** Interactive schedule with modal pop-ups for event details.
* **📸 Photo Gallery:** Horizontal snap-scroll gallery for family memories.

## 🛠️ Tech Stack

**Frontend**
* **Core:** HTML5, Vanilla JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN for rapid prototyping)
* **Icons:** Lucide Icons
* **Fonts:** Google Fonts (Merriweather & Inter)

**Backend (Planned)**
* **Runtime:** Node.js with Express
* **Database:** Supabase (PostgreSQL)

**Hosting**
* **Frontend:** GitHub Pages

## 📂 Project Structure

```text
johns-reunion/
├── index.html          # Main application shell (nav, footer, container)
├── script.js           # Client-side routing, logic, and Tailwind config
├── styles.css          # Custom CSS overrides (scrollbar, etc.)
└── views/              # HTML partials loaded dynamically
    ├── home.html       # Landing page with gallery
    ├── calendar.html   # Event schedule
    ├── ideas.html      # Idea submission form
    ├── attendance.html # List of attendees
    └── register.html   # Registration form
