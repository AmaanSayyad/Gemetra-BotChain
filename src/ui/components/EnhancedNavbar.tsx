"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as SubframeUtils from "../utils";
import { Menu, X, ChevronDown } from "lucide-react";
import ConnectButton from "../../utils/connect-wallet";

interface NavItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  hasDropdown?: boolean;
}

const NavItem = React.forwardRef<HTMLElement, NavItemProps>(
  function NavItem(
    { children, active = false, onClick, className, hasDropdown = false, ...otherProps }: NavItemProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
          "group relative flex h-10 cursor-pointer items-center gap-1 px-4 rounded-full transition-all duration-200",
          active ? "bg-brand-50 text-brand-900" : "hover:bg-neutral-50",
          className
        )}
        onClick={onClick}
        ref={ref as any}
        {...otherProps}
      >
        {children ? (
          <span className="font-['Montserrat'] text-[15px] font-[600] leading-[20px]">
            {children}
          </span>
        ) : null}
        {hasDropdown && (
          <ChevronDown size={16} className="transition-transform group-hover:rotate-180" />
        )}
      </div>
    );
  }
);

interface EnhancedNavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  transparent?: boolean;
}

const EnhancedNavbar = React.forwardRef<HTMLElement, EnhancedNavbarProps>(
  function EnhancedNavbar(
    { className,transparent = false, ...otherProps }: EnhancedNavbarProps,
    ref
  ) {
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState("home");

    useEffect(() => {
      const handleScroll = () => {
        const isScrolled = window.scrollY > 20;
        if (isScrolled !== scrolled) {
          setScrolled(isScrolled);
        }
        
        // Determine active section based on scroll position
        const sections = ["features", "benefits", "about"];
        let currentSection = "home";
        
        for (const section of sections) {
          const element = document.getElementById(`${section}-section`);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 100) {
              currentSection = section;
            }
          }
        }
        
        setActiveSection(currentSection);
      };
      
      window.addEventListener("scroll", handleScroll);
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }, [scrolled]);

    const scrollToSection = (sectionId: string) => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setActiveSection(sectionId.replace("-section", ""));
      }
    };

    return (
      <nav
        id="enhanced-navbar"
        className={SubframeUtils.twClassNames(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled 
            ? "py-2 bg-white/95 backdrop-blur-sm shadow-md" 
            : transparent ? "py-6 bg-transparent" : "py-6 bg-white",
          className
        )}
        ref={ref as any}
        {...otherProps}
      >
        <div className="mx-auto flex min-w-0 max-w-[1280px] items-center justify-between gap-2 px-4 sm:px-6">
          {/* Logo */}
          <button
            onClick={() => scrollToSection("home")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="text-2xl">⚡</span>
            <span className="font-['Montserrat'] text-[20px] font-[800] text-brand-900">
              Gemetra
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <NavItem 
              active={activeSection === "home"} 
              onClick={() => scrollToSection("home")}
            >
              Home
            </NavItem>
            <NavItem 
              active={activeSection === "features"} 
              onClick={() => scrollToSection("features-section")}
              hasDropdown
            >
              Features
            </NavItem>
            <NavItem 
              active={activeSection === "benefits"} 
              onClick={() => scrollToSection("benefits-section")}
            >
              Benefits
            </NavItem>
            <NavItem 
              active={activeSection === "about"} 
              onClick={() => scrollToSection("about-section")}
            >
              How It Works
            </NavItem>
          
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <ConnectButton/>
          </div>

          {/* Mobile Menu Button */}
          <MobileNavbar scrollToSection={scrollToSection} activeSection={activeSection} />
        </div>
      </nav>
    );
  }
);

interface MobileNavbarProps {
  scrollToSection: (sectionId: string) => void;
  activeSection: string;
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({ scrollToSection, activeSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((o) => !o);
  };

  const handleNavClick = (sectionId: string) => {
    scrollToSection(sectionId);
    setIsOpen(false);
  };

  /** Portal target: `fixed` inside Framer `motion` is tied to a transformed ancestor and will not cover the viewport. */
  const mobileMenuPortal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex md:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
            />
            <div
              id="landing-mobile-nav"
              className="relative z-[1] ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
                <button
                  type="button"
                  onClick={() => handleNavClick("home")}
                  className="flex items-center gap-2 rounded-lg p-1 hover:bg-neutral-50"
                >
                  <span className="text-2xl">⚡</span>
                  <span id="mobile-nav-title" className="font-['Montserrat'] text-lg font-[800] text-brand-900">
                    Gemetra
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 hover:bg-neutral-100"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-6">
                <NavItem
                  active={activeSection === "home"}
                  onClick={() => handleNavClick("home")}
                  className="h-12 w-full justify-center rounded-xl border border-transparent hover:border-neutral-200"
                >
                  Home
                </NavItem>
                <NavItem
                  active={activeSection === "features"}
                  onClick={() => handleNavClick("features-section")}
                  className="h-12 w-full justify-center rounded-xl border border-transparent hover:border-neutral-200"
                >
                  Features
                </NavItem>
                <NavItem
                  active={activeSection === "benefits"}
                  onClick={() => handleNavClick("benefits-section")}
                  className="h-12 w-full justify-center rounded-xl border border-transparent hover:border-neutral-200"
                >
                  Benefits
                </NavItem>
                <NavItem
                  active={activeSection === "about"}
                  onClick={() => handleNavClick("about-section")}
                  className="h-12 w-full justify-center rounded-xl border border-transparent hover:border-neutral-200"
                >
                  How It Works
                </NavItem>

                <div className="mt-auto w-full border-t border-neutral-200 pt-6">
                  <div className="[&_button]:w-full [&_button]:max-w-none">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={toggleMenu}
        className="rounded-full p-2 hover:bg-neutral-100"
        aria-expanded={isOpen}
        aria-controls="landing-mobile-nav"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileMenuPortal}
    </div>
  );
};

export default EnhancedNavbar;
