# WealthBuilders Cooperative

A modern fintech-based cooperative society management platform designed to handle member registration, contributions, invite commissions, dividend sharing, and seamless communication among members.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase&logoColor=white)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Business Logic](#business-logic)
- [Contributing](#contributing)
- [License](#license)

## 🏢 Overview

WealthBuilders Cooperative is a comprehensive web application that streamlines cooperative society management. The platform enables members to register, make contributions, earn commissions through referrals, and receive dividends from property investments.

## ✨ Features

### Member Features
- **Registration System** - Manual and fintech-enabled activation options
- **Monthly Contributions** - Automated capital/savings split management
- **Referral System** - Invite commission tracking for uplines
- **Dividend Distribution** - Automated profit sharing based on capital contribution
- **Withdrawal Requests** - Savings withdrawal after eligibility period
- **Personal Dashboard** - Track balances, referrals, and transaction history

### Admin Features
- **Financial Dashboard** - Comprehensive overview of all financial metrics
- **Member Management** - Approve registrations, manage accounts
- **Contribution Tracking** - Monitor and approve member contributions
- **Project Support Fund** - Separate approval workflow for PSF payments
- **Dividend Management** - Configure and distribute dividends
- **Commission Settlements** - Process referral and state rep commissions
- **Report Generation** - Export financial reports (Excel/PDF)

### State Representative Features
- **Regional Dashboard** - Track members and contributions by state
- **Commission Tracking** - Monitor state-level referral commissions

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | TanStack Query (React Query) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Forms | React Hook Form, Zod |
| Charts | Recharts |
| PDF Generation | jsPDF, jspdf-autotable |
| Excel Export | xlsx |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wealthbuilders-cooperative
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── assets/           # Static assets (images, logos)
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── ...          # Custom components
├── contexts/         # React context providers
├── hooks/           # Custom React hooks
├── integrations/    # Third-party integrations (Supabase)
├── lib/             # Utility functions
├── pages/           # Route pages
│   ├── admin/       # Admin dashboard pages
│   └── member/      # Member dashboard pages
└── main.tsx         # Application entry point

supabase/
├── functions/       # Edge functions
└── migrations/      # Database migrations
```

## 💼 Business Logic

### Contribution Structure
- **Monthly Contribution**: ₦5,500
  - Capital/Savings: ₦5,000
  - Project Support: ₦500

### Commission Structure
- **Referral Commission**: ₦500 (paid to inviter)
- **State Rep Commission**: ₦100 (paid to state representative)

### Eligibility Rules
- **Dividend Eligibility**: 6 months of contributions + ₦50,000 minimum capital
- **Withdrawal Eligibility**: 6 months membership (savings only)

### Member Types
- **Contributor**: Standard member with capital and savings
- **Acting Member**: Full contributor with enhanced benefits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

© 2025 WealthBuilders Cooperative. All Rights Reserved.

---

**Contact**: For inquiries, please visit our [Contact Page](https://wealthbuilders.com/contact) or reach out to the support team.
