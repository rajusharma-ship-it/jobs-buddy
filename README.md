# 🚀 Jobs Buddy

Jobs Buddy is an AI-powered job search and application assistant designed to help software engineers discover, organize, and streamline their job search process.

The project aims to automate repetitive tasks involved in job hunting while providing a modern, scalable, and developer-friendly architecture built with a TypeScript monorepo.

---

## ✨ Features

- 🔍 Search jobs from multiple platforms
- 📄 Resume management
- 🤖 AI-powered job recommendations
- 🎯 Track applications in one place
- 📊 Job application dashboard
- ⚡ Fast and responsive UI
- 🔐 Secure authentication
- 📁 Monorepo architecture with reusable packages
- 🧩 Shared UI components and utilities
- 🌙 Modern developer experience with TypeScript & PNPM

---

# 🏗 Project Structure

```
jobs-buddy/
│
├── apps/              # Frontend applications
├── packages/          # Shared packages
├── shared/            # Shared utilities
├── scripts/           # Build & automation scripts
├── playwright/        # End-to-end tests
│
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

# 🛠 Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- REST APIs

### Monorepo

- PNPM Workspaces

### Quality

- ESLint
- Prettier
- Playwright

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/rajusharma-ship-it/jobs-buddy.git
```

```
cd jobs-buddy
```

## Install Dependencies

```bash
pnpm install
```

## Configure Environment

Copy

```bash
.env.example
```

to

```bash
.env
```

and update the required environment variables.

## Start Development

```bash
pnpm dev
```

---

# 📦 Available Scripts

| Command | Description |
|----------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint project |
| `pnpm format` | Format code |

---

# 📐 Architecture

Jobs Buddy follows a modular monorepo architecture where applications, shared packages, and utilities are maintained independently while sharing a common development workflow.

This approach provides:

- Better code reuse
- Easier maintenance
- Faster builds
- Improved scalability
- Clear separation of concerns

---

# 🎯 Roadmap

- [ ] AI Resume Analyzer
- [ ] AI Cover Letter Generator
- [ ] Job Match Scoring
- [ ] One-click Apply
- [ ] LinkedIn Integration
- [ ] Interview Preparation Assistant
- [ ] Email Notifications
- [ ] Analytics Dashboard

---

# 🤝 Contributing

Contributions are welcome.

If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Raju Sharma**

Full Stack Engineer | React | TypeScript | Node.js | AI Applications

GitHub: https://github.com/rajusharma-ship-it

---

⭐ If you find this project useful, consider giving it a star.
