# 💼 Asset Manager

A robust and modern web application designed to streamline asset tracking and management. Built with performance and scalability in mind, this application leverages the power of Next.js and TypeScript to provide a seamless user experience across all devices.

🔗 **Live Demo:** 
***
## 🌟 Features & Functions

### 📊 Comprehensive Dashboard
* **Total Wealth Overview:** Instantly view the aggregated value of all your listed assets in one simple summary card.
* **Visual Asset List:** Displays all items with clear categorization, allowing you to scan your inventory or portfolio at a glance.

### 🛠️ Asset Control (CRUD)
* **Add New Assets:** Quickly input new items with details such as Name, Value, Category, and Date of acquisition.
* **Edit & Update:** Easily modify asset values as they depreciate or appreciate over time.
* **Delete Capability:** Remove sold or discarded assets to keep your portfolio current.

### ⚡ Progressive Web App (PWA)
* **Installable App:** Thanks to `sw.js` integration, you can install this directly to your phone's home screen for a native app experience.
* **Offline Capability:** Access your data even without an internet connection (cached resources allow for offline viewing).
* **Responsive Layout:** The interface automatically adjusts to fit desktop monitors, tablets, and mobile screens seamlessly.
***
## 🛠️ Tech Stack

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Language:** TypeScript (96.7%)
* **Styling:** Tailwind CSS & PostCSS
* **Linting:** ESLint
* **Deployment:** Vercel
***
## 📂 Project Structure

```bash
├── app/             # Main application routes and layouts (Next.js App Router)
├── components/      # Reusable UI components
├── lib/             # Utility functions and helper logic
├── public/          # Static assets and images
├── sw.js            # Service Worker for PWA functionality
└── tailwind.config.js # Tailwind CSS configuration
