"use client";

import Link from "next/link";
import { BookOpen, Zap, Menu, X, Plus } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-surface-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary-500 to-accent blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            </div>
            <span className="text-base font-bold font-display tracking-tight">
              Skill<span className="text-primary-400">Sync</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Topics
            </Link>
            <Link
              href="/register-topic"
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Topic
            </Link>
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Progress
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-1.5 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-surface-3">
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-1.5 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Topics
              </Link>
              <Link
                href="/register-topic"
                className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-1.5 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="w-3.5 h-3.5" />
                Register Topic
              </Link>
              <Link
                href="/"
                className="text-gray-300 hover:text-white transition-colors py-1.5 text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Progress
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
