import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${isMobileOpen ? 'mobile-open' : ''}`} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'space-between', alignItems: center,
      padding: scrolled ? '12px 80px' : '20px 80px', background: 'var(--glass)',
      backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
      borderBottom: '1px solid var(--glass-border)', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 700, color: 'var(--black-rich)', textDecoration: 'none' }}>
        <i className="fas fa-spa" style={{ color: 'var(--pink-primary)' }}></i>
        <span>Glamorous</span>
      </Link>

      <ul className="nav-links" style={{ display: 'flex', listStyle: 'none', gap: '45px' }}>
        <li><Link to="/" style={{ textDecoration: 'none', color: 'var(--text-dark)', fontWeight: 500, fontSize: '15px' }}>Home</Link></li>
        <li><Link to="/services" style={{ textDecoration: 'none', color: 'var(--text-dark)', fontWeight: 500, fontSize: '15px' }}>Services</Link></li>
        <li><Link to="/about" style={{ textDecoration: 'none', color: 'var(--text-dark)', fontWeight: 500, fontSize: '15px' }}>About</Link></li>
      </ul>

      <div className="nav-buttons" style={{ display: 'flex', gap: '15px' }}>
        {user ? (
          <>
            <span style={{ fontSize: '14px', fontWeight: 600, alignSelf: 'center' }}>Hello, {user.name}</span>
            <button onClick={logout} className="btn btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">Login</Link>
            <Link to="/register" className="btn btn-primary">Start Journey</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
