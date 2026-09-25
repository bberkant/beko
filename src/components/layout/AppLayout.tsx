import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../lib/auth';

const COLLAPSE_KEY = 'dars_sidebar_collapsed';

export function AppLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return (localStorage.getItem(COLLAPSE_KEY) || localStorage.getItem('ets360_sidebar_collapsed')) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as 'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp') || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const theme = (localStorage.getItem(`sidebar_theme_${user?.email}`) as 'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp') || 'one_dars_v4';
        setSidebarTheme(theme);
      } catch (e) {
        setSidebarTheme('one_dars_v4');
      }
    };
    window.addEventListener('sidebar-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sidebar-theme-changed', handleThemeChange);
  }, [user?.email]);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      sidebarTheme === 'banking_trial' ? 'theme-banking-trial bg-[#f4f6fa]' : sidebarTheme === 'dia_v3' ? 'theme-dia-v3 bg-[#e8ecf1]' : sidebarTheme === 'one_dars_v4' ? 'theme-one-dars-v4 bg-[#f1f5f9]' : 'bg-gray-50'
    }`}>
      {sidebarTheme === 'banking_trial' && (
        <style>{`
          /* Complete Corporate Banking Style Overrides (No mock text/buttons) */
          @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700;800&display=swap');

          body, .theme-banking-trial, .theme-banking-trial main {
            background-color: #f4f6fa !important;
            font-family: 'Calibri', 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
          
          .theme-banking-trial * {
            font-family: 'Calibri', 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }

          .theme-banking-trial main {
            padding-top: 24px !important;
            padding-bottom: 24px !important;
          }
          
          /* Repaint Topbar to match corporate blue style */
          .theme-banking-trial header {
            background-color: #006aa6 !important;
            border-bottom: 1px solid #005a8e !important;
            height: 64px !important;
            backdrop-filter: none !important;
          }
          .theme-banking-trial header button,
          .theme-banking-trial header svg {
            color: #ffffff !important;
          }
          .theme-banking-trial header .bg-brand-100 {
            background-color: rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
          }
          .theme-banking-trial header button:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          .theme-banking-trial header span.text-gray-900 {
            color: #ffffff !important;
            font-weight: 600 !important;
          }
          .theme-banking-trial header span.text-gray-500 {
            color: rgba(255, 255, 255, 0.75) !important;
          }
          
          /* Style search bar in blue Topbar */
          .theme-banking-trial header .relative input {
            background-color: rgba(255, 255, 255, 0.15) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            border-radius: 6px !important;
          }
          .theme-banking-trial header .relative input::placeholder {
            color: rgba(255, 255, 255, 0.65) !important;
          }
          .theme-banking-trial header .relative input:focus {
            background-color: #ffffff !important;
            border-color: #ffffff !important;
            color: #1e293b !important;
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2) !important;
          }
          .theme-banking-trial header .relative input:focus ~ svg {
            color: #64748b !important;
          }
          
          /* Card & Panel Overrides - Clean white panels */
          .theme-banking-trial .card,
          .theme-banking-trial section.card,
          .theme-banking-trial div.card,
          .theme-banking-trial [class*="bg-white rounded-xl"],
          .theme-banking-trial [class*="bg-white rounded-2xl"] {
            background-color: #ffffff !important;
            border: 1px solid #d8e2ed !important;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03) !important;
            border-radius: 6px !important;
          }
          
          /* Reset overlapping margins */
          .theme-banking-trial .grid.grid-cols-1,
          .theme-banking-trial .grid.gap-4,
          .theme-banking-trial .grid.gap-6,
          .theme-banking-trial .excel-container {
            margin-top: 0px !important;
          }
          
          /* Remove the old simple left borders */
          .theme-banking-trial .card,
          .theme-banking-trial section.card,
          .theme-banking-trial .grid > div {
            border-left: none !important;
            border-top: none !important;
          }
          
          /* Page Header Layout - Dark text and normal spacing */
          .theme-banking-trial .mb-6, 
          .theme-banking-trial [data-testid="page-header"] {
            border-bottom: none !important;
            padding-bottom: 0 !important;
            margin-bottom: 20px !important;
          }
          
          .theme-banking-trial h1 {
            color: #0f172a !important;
            font-size: 24px !important;
            font-weight: 700 !important;
            letter-spacing: -0.02em !important;
          }
          .theme-banking-trial .mb-6 p {
            color: #475569 !important;
          }

          /* Corporate Banking Table Styling */
          .theme-banking-trial table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            width: 100% !important;
          }
          
          .theme-banking-trial th {
            background-color: #edf2f8 !important;
            color: #475569 !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            border-bottom: 2px solid #cbd5e1 !important;
            border-top: none !important;
            padding: 12px 16px !important;
          }
          
          .theme-banking-trial td {
            color: #334155 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 12px 16px !important;
            font-size: 13px !important;
          }
          
          .theme-banking-trial tbody tr {
            background-color: #ffffff !important;
            transition: background-color 0.15s ease !important;
          }
          
          .theme-banking-trial tbody tr:hover td {
            background-color: #f1f7fc !important;
          }
          
          /* Inputs matching DenizBank style (white, thin grey border, sharp corners) */
          .theme-banking-trial input[type="text"],
          .theme-banking-trial input[type="search"],
          .theme-banking-trial select,
          .theme-banking-trial textarea,
          .theme-banking-trial input:not([type]) {
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            color: #334155 !important;
            padding: 8px 12px !important;
            font-size: 13px !important;
            transition: border-color 0.2s ease !important;
          }
          
          .theme-banking-trial aside input[type="text"] {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          
          .theme-banking-trial input[type="text"]:focus,
          .theme-banking-trial input[type="search"]:focus,
          .theme-banking-trial select:focus {
            border-color: #006aa6 !important;
            outline: none !important;
            box-shadow: 0 0 0 3px rgba(0, 106, 166, 0.1) !important;
          }
          
          /* DenizBank Blue Primary Buttons */
          .theme-banking-trial .btn-primary,
          .theme-banking-trial button.bg-brand-600,
          .theme-banking-trial button.bg-blue-600 {
            background-color: #006aa6 !important;
            background-image: none !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            padding: 9px 18px !important;
            box-shadow: 0 2px 6px rgba(0, 106, 166, 0.15) !important;
            transition: all 0.2s ease !important;
          }
          
          .theme-banking-trial .btn-primary:hover,
          .theme-banking-trial button.bg-brand-600:hover,
          .theme-banking-trial button.bg-blue-600:hover {
            background-color: #005a8e !important;
            box-shadow: 0 4px 12px rgba(0, 106, 166, 0.25) !important;
          }
          
          /* Secondary Buttons matching corporate theme */
          .theme-banking-trial .btn-secondary,
          .theme-banking-trial button.bg-gray-50,
          .theme-banking-trial button.border-gray-300 {
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            color: #475569 !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            padding: 9px 18px !important;
            transition: all 0.2s ease !important;
          }
          
          .theme-banking-trial .btn-secondary:hover,
          .theme-banking-trial button.bg-gray-50:hover,
          .theme-banking-trial button.border-gray-300:hover {
            background-color: #f8fafc !important;
            border-color: #94a3b8 !important;
            color: #1e293b !important;
          }

          /* Active tab blue lines override */
          .theme-banking-trial .border-b button[class*="border-brand-"],
          .theme-banking-trial .border-b button[class*="border-blue-"],
          .theme-banking-trial [class*="border-b-2 border-brand-"] {
            border-bottom-color: #006aa6 !important;
            color: #006aa6 !important;
          }
          
          /* Pill Badges status overrides */
          .theme-banking-trial [class*="bg-emerald-"],
          .theme-banking-trial [class*="text-green-"] {
            background-color: #ecfdf5 !important;
            color: #047857 !important;
            border: 1px solid #d1fae5 !important;
            border-radius: 9999px !important;
            font-weight: 600 !important;
            padding: 2px 10px !important;
            font-size: 11px !important;
          }
          
          .theme-banking-trial [class*="bg-red-"],
          .theme-banking-trial [class*="text-red-"] {
            background-color: #fef2f2 !important;
            color: #b91c1c !important;
            border: 1px solid #fee2e2 !important;
            border-radius: 9999px !important;
            font-weight: 600 !important;
            padding: 2px 10px !important;
            font-size: 11px !important;
        `}</style>
      )}
      {sidebarTheme === 'dia_v3' && (
        <style>{`
          /* DİA Kurumsal V3 Style Overrides */
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

          body, .theme-dia-v3, .theme-dia-v3 main {
            background-color: #e8ecf1 !important;
            font-family: 'Calibri', 'Outfit', -apple-system, sans-serif !important;
          }
          
          .theme-dia-v3 * {
            font-family: 'Calibri', 'Outfit', -apple-system, sans-serif !important;
          }

          .theme-dia-v3 main {
            padding-top: 20px !important;
            padding-bottom: 20px !important;
          }
          
          /* DİA Corporate Navy Topbar */
          .theme-dia-v3 header {
            background-color: #003b73 !important;
            border-bottom: 2px solid #f37021 !important; /* DİA Orange bottom strip */
            height: 64px !important;
            backdrop-filter: none !important;
          }
          .theme-dia-v3 header button,
          .theme-dia-v3 header svg {
            color: #ffffff !important;
          }
          .theme-dia-v3 header .bg-brand-100 {
            background-color: rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
          }
          .theme-dia-v3 header button:hover {
            background-color: rgba(255, 255, 255, 0.15) !important;
          }
          .theme-dia-v3 header span.text-gray-900 {
            color: #ffffff !important;
            font-weight: 600 !important;
          }
          .theme-dia-v3 header span.text-gray-500 {
            color: rgba(255, 255, 255, 0.8) !important;
          }
          
          /* DİA style rounded pill Search bar */
          .theme-dia-v3 header .relative input {
            background-color: #ffffff !important;
            border: 1px solid #c0d0e0 !important;
            color: #1e293b !important;
            border-radius: 9999px !important;
            padding-left: 36px !important;
          }
          .theme-dia-v3 header .relative input::placeholder {
            color: #94a3b8 !important;
          }
          .theme-dia-v3 header .relative input:focus {
            border-color: #f37021 !important;
            box-shadow: 0 0 0 3px rgba(243, 112, 33, 0.2) !important;
          }
          .theme-dia-v3 header .relative svg.search-icon {
            color: #003b73 !important;
          }
          
          /* Cards & Tables */
          .theme-dia-v3 .card,
          .theme-dia-v3 section.card,
          .theme-dia-v3 div.card,
          .theme-dia-v3 [class*="bg-white rounded-xl"],
          .theme-dia-v3 [class*="bg-white rounded-2xl"] {
            background-color: #ffffff !important;
            border: 1px solid #c8d3df !important;
            border-top: 4px solid #003b73 !important; /* Premium corporate top border */
            border-radius: 8px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
          }
          
          .theme-dia-v3 table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }
          .theme-dia-v3 th {
            background-color: #edf2f8 !important;
            color: #003b73 !important;
            border-bottom: 2px solid #c8d3df !important;
            font-weight: 700 !important;
          }
          .theme-dia-v3 td {
            color: #334155 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            border-right: 1px solid #edf2f7 !important;
          }
          .theme-dia-v3 tbody tr:hover td {
            background-color: #f1f7fc !important;
          }
          
          /* Buttons */
          .theme-dia-v3 .btn-primary,
          .theme-dia-v3 button.bg-brand-600,
          .theme-dia-v3 button.bg-blue-600 {
            background-color: #003b73 !important;
            color: #ffffff !important;
          }
          .theme-dia-v3 .btn-primary:hover,
          .theme-dia-v3 button.bg-brand-600:hover,
          .theme-dia-v3 button.bg-blue-600:hover {
            background-color: #002d59 !important;
            box-shadow: 0 4px 12px rgba(0, 59, 115, 0.25) !important;
          }
          
          /* Special DİA Orange Accents for Submit/Filter Buttons */
          .theme-dia-v3 button.btn-primary[class*="bg-brand-"]:active,
          .theme-dia-v3 button[type="submit"],
          .theme-dia-v3 button[class*="bg-emerald-600"] {
            background-color: #f37021 !important;
          }
          .theme-dia-v3 button[type="submit"]:hover,
          .theme-dia-v3 button[class*="bg-emerald-600"]:hover {
            background-color: #d65b12 !important;
          }

          /* Override hardcoded indigo selection colors inside Documents and other pages */
          .theme-dia-v3 .bg-indigo-50,
          .theme-dia-v3 .bg-indigo-50\/70,
          .theme-dia-v3 .bg-indigo-50\/50 {
            background-color: #f1f7fc !important;
          }
          .theme-dia-v3 .text-indigo-600,
          .theme-dia-v3 .text-indigo-700,
          .theme-dia-v3 .text-indigo-900,
          .theme-dia-v3 .text-indigo-500,
          .theme-dia-v3 .hover\:text-indigo-600:hover {
            color: #003b73 !important;
          }
          .theme-dia-v3 .border-indigo-200,
          .theme-dia-v3 .ring-indigo-200,
          .theme-dia-v3 .ring-1.ring-indigo-200 {
            border-color: #c8d3df !important;
            --tw-ring-color: #c8d3df !important;
          }
        `}</style>
      )}
      {sidebarTheme === 'one_dars_v4' && (
        <style>{`
          /* One Dars V4 Theme Overrides */
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

          body, .theme-one-dars-v4, .theme-one-dars-v4 main {
            background-color: #f1f5f9 !important;
            font-family: 'Calibri', 'Outfit', -apple-system, sans-serif !important;
          }
          
          .theme-one-dars-v4 * {
            font-family: 'Calibri', 'Outfit', -apple-system, sans-serif !important;
          }

          .theme-one-dars-v4 main {
            padding-top: 20px !important;
            padding-bottom: 20px !important;
          }
          
          .theme-one-dars-v4 .logo-octagon {
            clip-path: polygon(28% 0%, 72% 0%, 100% 28%, 100% 72%, 72% 100%, 28% 100%, 0% 72%, 0% 28%) !important;
          }
          
          /* One Dars Deep Blue Topbar */
          .theme-one-dars-v4 header {
            background-color: #003b73 !important;
            border-bottom: 1px solid #002d59 !important;
            height: 64px !important;
            backdrop-filter: none !important;
          }
          .theme-one-dars-v4 header button,
          .theme-one-dars-v4 header svg,
          .theme-one-dars-v4 header svg * {
            color: #ffffff !important;
            stroke: #ffffff !important;
          }
          .theme-one-dars-v4 header button:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          .theme-one-dars-v4 header span.text-gray-900 {
            color: #ffffff !important;
            font-weight: 600 !important;
          }
          .theme-one-dars-v4 header span.text-gray-500 {
            color: rgba(255, 255, 255, 0.8) !important;
          }
          
          /* Search Bar in One Dars Header */
          .theme-one-dars-v4 header .relative input {
            background-color: #ffffff !important;
            border: 1px solid #c0d0e0 !important;
            color: #1e293b !important;
            border-radius: 8px !important;
            padding-left: 36px !important;
          }
          .theme-one-dars-v4 header .relative input::placeholder {
            color: #94a3b8 !important;
          }
          .theme-one-dars-v4 header .relative input:focus {
            border-color: #004b93 !important;
            box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.2) !important;
          }
          .theme-one-dars-v4 header .search-icon,
          .theme-one-dars-v4 header .search-icon * {
            color: #003b73 !important;
            stroke: #003b73 !important;
          }
          
          /* Sidebar Styling for One Dars V4 */
          .theme-one-dars-v4 aside.fixed {
            background-color: #002d59 !important;
            border-right: 1px solid #001f3f !important;
          }
          .theme-one-dars-v4 aside.fixed * {
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent !important;
          }
          .theme-one-dars-v4 aside.fixed nav {
            background-color: #002d59 !important;
          }
          
          /* White/Light text in Sidebar nav links */
          .theme-one-dars-v4 aside.fixed span,
          .theme-one-dars-v4 aside.fixed svg {
            color: #ffffff !important;
          }
          
          .theme-one-dars-v4 aside.fixed a:hover,
          .theme-one-dars-v4 aside.fixed button:hover {
            background-color: rgba(255, 255, 255, 0.08) !important;
          }
          
          .theme-one-dars-v4 aside.fixed a.active,
          .theme-one-dars-v4 aside.fixed a[class*="bg-brand-50"],
          .theme-one-dars-v4 aside.fixed a[class*="bg-[#ebf0f5]"] {
            background-color: #004b93 !important;
            color: #ffffff !important;
          }
          
          /* Cards & Tables */
          .theme-one-dars-v4 .card,
          .theme-one-dars-v4 section.card,
          .theme-one-dars-v4 div.card,
          .theme-one-dars-v4 [class*="bg-white rounded-xl"],
          .theme-one-dars-v4 [class*="bg-white rounded-2xl"] {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03) !important;
            border-top: none !important;
          }
          
          .theme-one-dars-v4 table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }
          .theme-one-dars-v4 th {
            background-color: #f8fafc !important;
            color: #475569 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            font-weight: 600 !important;
            font-size: 12px !important;
          }
          .theme-one-dars-v4 td {
            color: #334155 !important;
            border-bottom: 1px solid #f1f5f9 !important;
            border-right: none !important;
          }
          .theme-one-dars-v4 tbody tr:hover td {
            background-color: #f8fafc !important;
          }
          
          /* One CRM Flat Pill Style Buttons */
          .theme-one-dars-v4 .btn-primary,
          .theme-one-dars-v4 button.bg-brand-600,
          .theme-one-dars-v4 button.bg-blue-600 {
            background-color: #004b93 !important;
            color: #ffffff !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
          }
          .theme-one-dars-v4 .btn-primary:hover,
          .theme-one-dars-v4 button.bg-brand-600:hover,
          .theme-one-dars-v4 button.bg-blue-600:hover {
            background-color: #003f7c !important;
            box-shadow: 0 4px 12px rgba(0, 75, 147, 0.15) !important;
          }

          /* Override hardcoded indigo selection colors inside Documents and other pages */
          .theme-one-dars-v4 .bg-indigo-50,
          .theme-one-dars-v4 .bg-indigo-50\/70,
          .theme-one-dars-v4 .bg-indigo-50\/50 {
            background-color: #e0f2fe !important;
          }
          .theme-one-dars-v4 .text-indigo-600,
          .theme-one-dars-v4 .text-indigo-700,
          .theme-one-dars-v4 .text-indigo-900,
          .theme-one-dars-v4 .text-indigo-500,
          .theme-one-dars-v4 .hover\:text-indigo-600:hover {
            color: #004b93 !important;
          }
          .theme-one-dars-v4 .border-indigo-200,
          .theme-one-dars-v4 .ring-indigo-200,
          .theme-one-dars-v4 .ring-1.ring-indigo-200 {
            border-color: #bae6fd !important;
            --tw-ring-color: #bae6fd !important;
          }
        `}</style>
      )}
      {sidebarTheme === 'bulut_erp' && (
        <style>{`
          /* Logo Bulut ERP Style Overrides */
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');

          body, .theme-bulut-erp, .theme-bulut-erp main {
            background-color: #f0f2f5 !important;
            font-family: 'Calibri', 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          }
          
          .theme-bulut-erp * {
            font-family: 'Calibri', 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          }

          .theme-bulut-erp main {
            padding-top: 20px !important;
            padding-bottom: 20px !important;
          }
          
          /* Bulut ERP Clean White Topbar */
          .theme-bulut-erp header {
            background-color: #ffffff !important;
            border-bottom: 1px solid #e5e7eb !important;
            height: 60px !important;
            backdrop-filter: none !important;
          }
          .theme-bulut-erp header button,
          .theme-bulut-erp header svg {
            color: #f37021 !important;
          }
          .theme-bulut-erp header button:hover {
            background-color: rgba(243, 112, 33, 0.08) !important;
          }
          .theme-bulut-erp header span.text-gray-900 {
            color: #1f2937 !important;
            font-weight: 600 !important;
          }
          .theme-bulut-erp header span.text-gray-500 {
            color: #6b7280 !important;
          }
          
          /* Bulut ERP Search bar */
          .theme-bulut-erp header .relative input {
            background-color: #f3f4f6 !important;
            border: 1px solid #e5e7eb !important;
            color: #1f2937 !important;
            border-radius: 6px !important;
            padding-left: 36px !important;
          }
          .theme-bulut-erp header .relative input::placeholder {
            color: #9ca3af !important;
          }
          .theme-bulut-erp header .relative input:focus {
            background-color: #ffffff !important;
            border-color: #f37021 !important;
            box-shadow: 0 0 0 3px rgba(243, 112, 33, 0.2) !important;
          }
          .theme-bulut-erp header .relative svg {
            color: #f37021 !important;
          }
          
          /* Sidebar Styling for Bulut ERP */
          .theme-bulut-erp aside.fixed {
            background-color: #ffffff !important;
            border-right: 1px solid #e5e7eb !important;
          }
          .theme-bulut-erp aside.fixed span {
            color: #374151 !important;
          }
          /* Nav items styles */
          .theme-bulut-erp aside.fixed a,
          .theme-bulut-erp aside.fixed button {
            border-bottom: 1px solid #f3f4f6 !important;
            color: #374151 !important;
            font-weight: 400 !important;
          }
          
          .theme-bulut-erp aside.fixed a:hover,
          .theme-bulut-erp aside.fixed button:hover {
            background-color: rgba(243, 112, 33, 0.04) !important;
            color: #f37021 !important;
          }
          
          .theme-bulut-erp aside.fixed a.active,
          .theme-bulut-erp aside.fixed a[class*="bg-brand-50"],
          .theme-bulut-erp aside.fixed a[class*="bg-[#ebf0f5]"] {
            background-color: rgba(243, 112, 33, 0.08) !important;
            color: #f37021 !important;
            border-left: 4px solid #f37021 !important;
            padding-left: 12px !important;
          }
          .theme-bulut-erp aside.fixed a.active span {
            color: #f37021 !important;
          }
          
          /* Cards & Tables */
          .theme-bulut-erp .card,
          .theme-bulut-erp section.card,
          .theme-bulut-erp div.card,
          .theme-bulut-erp [class*="bg-white rounded-xl"],
          .theme-bulut-erp [class*="bg-white rounded-2xl"] {
            background-color: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 6px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
            border-top: 3px solid #f37021 !important; /* Premium Bulut ERP top border */
          }
          
          .theme-bulut-erp table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }
          
          /* Buttons */
          .theme-bulut-erp .btn-primary,
          .theme-bulut-erp button.bg-brand-600,
          .theme-bulut-erp button.bg-blue-600 {
            background-color: #f37021 !important;
            color: #ffffff !important;
            border-radius: 6px !important;
            font-weight: 500 !important;
          }
          .theme-bulut-erp .btn-primary:hover,
          .theme-bulut-erp button.bg-brand-600:hover,
          .theme-bulut-erp button.bg-blue-600:hover {
            background-color: #d95f14 !important;
            box-shadow: 0 4px 12px rgba(243, 112, 33, 0.15) !important;
          }

          /* Input fields inside table/forms focus colors */
          .theme-bulut-erp input[type="text"]:focus,
          .theme-bulut-erp input[type="search"]:focus,
          .theme-bulut-erp select:focus {
            border-color: #f37021 !important;
            --tw-ring-color: rgba(243, 112, 33, 0.2) !important;
          }
          
          /* Override hardcoded indigo selection colors inside Documents and other pages */
          .theme-bulut-erp .bg-indigo-50,
          .theme-bulut-erp .bg-indigo-50\/70,
          .theme-bulut-erp .bg-indigo-50\/50 {
            background-color: #fff3eb !important;
          }
          .theme-bulut-erp .text-indigo-600,
          .theme-bulut-erp .text-indigo-700,
          .theme-bulut-erp .text-indigo-900,
          .theme-bulut-erp .text-indigo-500,
          .theme-bulut-erp .hover\:text-indigo-600:hover {
            color: #f37021 !important;
          }
          .theme-bulut-erp .border-indigo-200,
          .theme-bulut-erp .ring-indigo-200,
          .theme-bulut-erp .ring-1.ring-indigo-200 {
            border-color: #ffd8bf !important;
            --tw-ring-color: #ffd8bf !important;
          }
        `}</style>
      )}
      <style>{`
        /* Header Dropdown Protection (Profile & Notifications) across all themes */
        header [data-dropdown],
        header .profile-menu {
          background-color: #ffffff !important;
          color: #1f2937 !important;
        }
        header [data-dropdown] button,
        header .profile-menu button {
          color: #374151 !important;
          background-color: transparent !important;
        }
        header [data-dropdown] button:hover,
        header .profile-menu button:hover {
          background-color: #f3f4f6 !important;
        }
        header [data-dropdown] button.logout-btn,
        header .profile-menu button.logout-btn {
          color: #dc2626 !important;
        }
        header [data-dropdown] button.logout-btn:hover,
        header .profile-menu button.logout-btn:hover {
          background-color: #fef2f2 !important;
        }
        header [data-dropdown] button.logout-btn svg,
        header [data-dropdown] button.logout-btn svg *,
        header .profile-menu button.logout-btn svg,
        header .profile-menu button.logout-btn svg * {
          color: #dc2626 !important;
          stroke: #dc2626 !important;
        }
        header [data-dropdown] button:not(.logout-btn) svg,
        header [data-dropdown] button:not(.logout-btn) svg *,
        header .profile-menu button:not(.logout-btn) svg,
        header .profile-menu button:not(.logout-btn) svg * {
          color: #6b7280 !important;
          stroke: #6b7280 !important;
        }
        header [data-dropdown] .text-gray-900,
        header .profile-menu .text-gray-900 {
          color: #111827 !important;
        }
        header [data-dropdown] .text-gray-700,
        header .profile-menu .text-gray-700 {
          color: #374151 !important;
        }
        header [data-dropdown] .text-gray-600,
        header .profile-menu .text-gray-600 {
          color: #4b5563 !important;
        }
        header [data-dropdown] .text-gray-500,
        header .profile-menu .text-gray-500 {
          color: #6b7280 !important;
        }
        header [data-dropdown] .text-gray-400,
        header .profile-menu .text-gray-400 {
          color: #9ca3af !important;
        }
        header [data-dropdown] .text-brand-700,
        header .profile-menu .text-brand-700 {
          color: #004b93 !important;
        }
        header [data-dropdown] .text-brand-600,
        header .profile-menu .text-brand-600 {
          color: #004b93 !important;
        }
        header [data-dropdown] .text-red-600,
        header .profile-menu .text-red-600 {
          color: #dc2626 !important;
        }
        header [data-dropdown] .text-red-700,
        header .profile-menu .text-red-700 {
          color: #b91c1c !important;
        }
      `}</style>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={[
          'flex min-h-screen flex-col transition-[padding] duration-300',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[230px]',
        ].join(' ')}
      >
        <Topbar
          onToggleSidebar={toggleSidebar}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className={`flex-1 px-3 py-4 ${location.pathname.startsWith('/ana-kasa') ? 'lg:px-3 lg:py-4' : 'lg:px-8 lg:py-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
