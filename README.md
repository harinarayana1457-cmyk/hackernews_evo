<div align="center">

# 📰 HN INSIGHTS & CONTEXT EXPANDER
### Automated AI Intelligence Layer & Semantic Summarizer for Hacker News Top Stories

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://dulcet-eclair-c91d88.netlify.app)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Hacker News API](https://img.shields.io/badge/API-Hacker%20News%20Firebase-FF6600?style=for-the-badge&logo=ycombinator&logoColor=white)](https://github.com/HackerNews/API)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>HN Insights & Context Expander</b> transforms the high-volume firehose of Hacker News into an executive-level briefing dashboard. Automatically synchronizing with the official Hacker News Firebase endpoints, it enriches the top 20 trending discussions with deep background context, linked article key takeaways, entity mapping, and jargon breakdowns.
</p>

[🚀 Live Demo](https://dulcet-eclair-c91d88.netlify.app) • [✨ Key Features](#-key-features) • [🏛️ Intelligence Pipeline](#-intelligence-pipeline-architecture) • [🛠️ Tech Stack](#️-tech-stack) • [📦 Quickstart](#-quickstart-guide) • [📁 Structure](#-project-structure)

</div>

---

## 🌟 Key Features

* **🔥 Real-Time Top 20 Synchronization**: Connects directly to the official Y Combinator Hacker News Firebase REST API to track the top-ranking discussions in real time.
* **🧠 Context Expansion Layer**: Deconstructs dense technical articles into structured overviews, clarifying domain-specific jargon and historical context.
* **💡 Executive Takeaway Summaries**: Distills long community comment threads into actionable bullet points, debate summaries, and consensus conclusions.
* **🗺️ Semantic Entity & Repository Mapping**: Automatically identifies and cross-links mentioned open-source repositories, academic papers, and technical specifications.
* **⚡ High-Speed Browser HUD**: Clean, responsive layout designed for instant scanning across desktop, tablet, and mobile screens.

---

## 🏛️ Intelligence Pipeline Architecture

```mermaid
flowchart TD
    subgraph DataIngestion ["1. Real-Time Telemetry"]
        A[Hacker News Firebase API /v0/topstories] --> B[Top 20 Story IDs]
        B --> C[Fetch Item Metadata & Discussion Trees]
    end

    subgraph NLPEnrichment ["2. Semantic Context Engine"]
        C --> D[Extract Linked URLs & Comment Bodies]
        D --> E[NLP Processing Engine / LLM Extractor]
        E --> F[Generate Core Arguments & Jargon Definitions]
        E --> G[Extract Key Takeaways & Milestones]
        E --> H[Map Referenced GitHub Repos & ArXiv Papers]
    end

    subgraph PresentationHUD ["3. Developer Briefing Dashboard"]
        F & G & H --> I[Live Reactive Cards HUD]
        I --> J[Story Card with Upvotes & Comment Counts]
        I --> K[Expandable Context & Entity Badges]
    end
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Application** | Modern JavaScript (ES6+), HTML5, CSS3 |
| **Styling & Layout** | Tailwind CSS with responsive dark-mode styling |
| **Data Ingestion** | Official Hacker News Firebase API (`https://hacker-news.firebaseio.com/v0/`) |
| **Hosting & CI/CD** | Netlify Continuous Deployment |

---

## 🚀 Quickstart Guide

### 1. Clone the Repository
```bash
git clone https://github.com/harinarayana1457-cmyk/hackernews_evo.git
cd hackernews_evo
```

### 2. Launch Locally
Because the application is built with zero runtime compile requirements, you can preview it immediately:
* **Option A**: Open `hackr/index.html` directly in your web browser.
* **Option B**: Run a lightweight local HTTP server:
  ```bash
  npx serve hackr
  # Or via Python
  python -m http.server --directory hackr 3000
  ```
Visit `http://localhost:3000` to interact with the dashboard.

---

## 📁 Project Structure

```text
hackernews_evo/
├── hackr/
│   ├── index.html            # Main briefing dashboard layout & UI structure
│   ├── app.js                # Firebase API client, data formatting, and UI event logic
│   └── styles.css            # Dark aesthetic styles, responsive layout rules
├── .gitignore                # Repository ignore rules
└── README.md                 # Project documentation
```

---

## 🔗 Connect & Links

* **Live Demo**: [HN Context App on Netlify](https://dulcet-eclair-c91d88.netlify.app)
* **Author**: [Hari Narayana (@harinarayana1457-cmyk)](https://github.com/harinarayana1457-cmyk)
* [![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/hari-narayana-035ba1389/)
