# FinFlow - Corporate Budget Management System

## Overview

FinFlow is a corporate budget management system designed for Turkish enterprises. It provides department and project-based budget tracking, revision history, approval workflows, and financial reporting. The application uses EUR as currency and Turkish as the interface language.

Key features include:
- **Department Budgets**: Hierarchical structure with Department → Cost Group → Cost Item
- **Project Budgets**: Hierarchical structure with Project → Phase → Cost/Revenue Items
- **Monthly Budget Tracking**: 12-month budget fields for each item (January-December)
- **Revision System**: Version history (Rev0, Rev1, Rev2...) with timestamps for audit trails
- **Approval Workflow**: Item-level approval where approved items become locked and require revision for changes
- **Role-Based Access**: Admin users have full access; regular users see only assigned departments/projects

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand for global client state
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

The frontend follows a page-based structure with shared layout components. Budget tables support inline editing with edit/save/cancel workflows.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Build Tool**: esbuild for production bundling, tsx for development
- **API Pattern**: RESTful JSON API at `/api/*` endpoints
- **Authentication**: Session-based with bcrypt password hashing

The server handles both API routes and serves the static frontend build in production. Development uses Vite's dev server with HMR.

### Data Storage
- **Database**: PostgreSQL (external connection)
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit manages database migrations in `./migrations`

Database schema includes:
- Users with role-based permissions (admin/user)
- Departments and Cost Groups (hierarchical)
- Projects and Project Phases (hierarchical)
- Budget Items with monthly JSON values and approval status
- Budget Revisions for version history
- Transactions for actual expense/revenue tracking
- User assignment tables for department/project access control

### Authentication & Authorization
- Simple username/password login
- Two roles: `admin` (full system access) and `user` (assigned resources only)
- Users can be assigned to multiple departments and projects
- Admin-only features: approval workflow, user management, system settings

## External Dependencies

### Database
- **PostgreSQL**: Primary data store connected via `DATABASE_URL` environment variable
- **Connection**: Uses `pg` package with Drizzle ORM adapter
- Current external database: `postgresql://admin:346523@support.parkolay.com:7081/Budget`

### Key NPM Packages
- **@tanstack/react-query**: Server state and caching
- **drizzle-orm** / **drizzle-kit**: Database ORM and migrations
- **bcrypt**: Password hashing
- **zod**: Runtime validation for API requests
- **recharts**: Dashboard charts and visualizations
- **date-fns**: Date formatting (Turkish locale support)
- **zustand**: Client-side state management
- **wouter**: Client-side routing

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development banner
- Custom `vite-plugin-meta-images`: OpenGraph image URL handling for deployments