import React from 'react';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from '../components/ui/Navbar';
import { Sidebar } from '../components/ui/Sidebar';

export const metadata = {
  title: 'NexaAttend Enterprise - Workforce & Attendance System',
  description: 'Industrial-tier attendance, overtime tracking, and leave management system for enterprises.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col lg:flex-row">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                  {children}
                </main>
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
