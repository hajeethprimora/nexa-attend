# NexaAttend Enterprise Production & Cloud Deployment Guide

This guide outlines step-by-step instructions for deploying NexaAttend (Backend & Frontend) to production environments such as **Render**, **Vercel**, or **AWS / Docker**.

---

## 🛠️ 1. Backend Deployment (Render / Railway / AWS)

### Cause of Previous Render Error:
Render ran `yarn install` followed by `yarn start` (`node dist/server.js`), but because `dist/server.js` was not compiled during the install step, Node threw `Error: Cannot find module '/opt/render/project/src/backend/dist/server.js'`.

### Fix Implemented:
We added `"postinstall": "npm run build"` and moved `typescript` into production `dependencies`. Now, whenever Render runs `yarn install` or `npm install`, the backend automatically compiles `src/` to `dist/server.js`.

### Render Service Settings:
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `yarn install && yarn build` (or `npm install && npm run build`)
- **Start Command**: `yarn start` (or `node dist/server.js`)

### Required Environment Variables (Render Dashboard):
```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

---

## 🌐 2. Frontend Deployment (Vercel / Netlify)

### Vercel Project Settings:
- **Root Directory**: `frontend`
- **Framework Preset**: `Next.js`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Required Environment Variables (Vercel Dashboard):
```env
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com/api
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🗄️ 3. Database Migration (Supabase PostgreSQL)

Execute the updated [`schema.sql`](file:///c:/Users/Aashifa/OneDrive/Documents/GitHub/nexa-attend/schema.sql) in your Supabase project's SQL Editor to ensure all tables, indexes, shift schedule columns, overtime tracking, and Row Level Security (RLS) policies are active.
