import React from 'react';

const Home = () => {
  return (
    <div className="home-page">
      <section className="hero" style={{ 
        minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', 
        padding: '120px 80px 80px', overflow: 'hidden' 
      }}>
        <div className="hero-content" style={{ maxWidth: '650px', zIndex: 2 }}>
          <span className="hero-tag" style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
            background: 'rgba(255, 45, 117, 0.08)', borderRadius: '50px', color: 'var(--pink-primary)', 
            fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '30px' 
          }}>
            <i className="fas fa-sparkles"></i> The Definition of Luxury
          </span>
          <h1 style={{ fontSize: '72px', lineHeight: 1.1, color: 'var(--black-rich)', marginBottom: '25px' }}>
            Unleash Your <span style={{ color: 'var(--pink-primary)', fontStyle: 'italic' }}>Natural</span> Radiance
          </h1>
          <p style={{ fontSize: '19px', color: 'var(--text-muted)', marginBottom: '45px', maxWidth: '550px' }}>
            Step into a world of curated beauty. Our master stylists blend art and science to create looks that don't just follow trends—they define them.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary">Book Premiere Service</button>
            <button className="btn btn-outline" style={{ marginLeft: '15px' }}>View Our Craft</button>
          </div>
        </div>
        <div className="hero-image-wrap" style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <img 
            src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&height=1000&fit=crop" 
            alt="Beauty model" 
            style={{ 
              width: '480px', height: '600px', borderRadius: '240px 240px 20px 20px', 
              objectFit: 'cover', boxShadow: '30px 30px 0 var(--white), 30px 30px 60px rgba(0,0,0,0.1)' 
            }} 
          />
        </div>
      </section>

      {/* Featured Why section */}
      <section className="section" style={{ padding: '120px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '48px', marginBottom: '80px', color: 'var(--black-rich)' }}>Why Glamorous Studio?</h2>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '35px' }}>
             <div className="feature-card" style={{ padding: '50px 40px', background: 'var(--white)', borderRadius: '30px', boxShadow: 'var(--shadow-premium)' }}>
                <h3>Artisan Expertise</h3>
                <p>Our stylists are internationally trained artists dedicated to the craft.</p>
             </div>
             <div className="feature-card" style={{ padding: '50px 40px', background: 'var(--white)', borderRadius: '30px', boxShadow: 'var(--shadow-premium)' }}>
                <h3>Pure Products</h3>
                <p>We use exclusively organic, cruelty-free formulas for your transformation.</p>
             </div>
             <div className="feature-card" style={{ padding: '50px 40px', background: 'var(--white)', borderRadius: '30px', boxShadow: 'var(--shadow-premium)' }}>
                <h3>Royal Treatment</h3>
                <p>Luxury is in every detail of your singular focus journey.</p>
             </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
