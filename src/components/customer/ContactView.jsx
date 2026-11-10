import { Phone, Mail, MapPin, Clock, MessageCircle, MessageSquare } from 'lucide-react';

export default function ContactView() {
  const handleOpenChat = () => {
    // Look for chat bubble button and click it to open chat widget
    const bubbleBtn = document.querySelector('.chat-bubble-btn');
    if (bubbleBtn) {
      bubbleBtn.click();
    }
  };

  const handleOpenWhatsApp = () => {
    window.open('https://wa.me/256788227027', '_blank');
  };

  return (
    <div style={{ background: 'transparent', padding: '4rem 0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
        <div className="luxury-header-text">
          <h1 style={{ fontSize: '2.5rem', color: '#1c1917' }}>Contact Us</h1>
          <p style={{ color: '#44403c', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            We'd love to hear from you. Reach out for order customisation, product inquiries, or general support.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginTop: '3rem' }}>
          {/* Contact Details Card */}
          <div style={{ background: '#ffffff', border: '1px solid #eae6e1', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#1c1917', marginBottom: '1.8rem', borderBottom: '1px solid #eae6e1', paddingBottom: '0.5rem' }}>Store Information</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <MapPin size={22} style={{ color: 'var(--color-gold-dark)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold-dark)', fontWeight: 800 }}>Location</h4>
                  <p style={{ fontSize: '0.95rem', color: '#1c1917', fontWeight: 600 }}>Goodwill zone, Kampala, Uganda</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Phone size={22} style={{ color: 'var(--color-gold-dark)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold-dark)', fontWeight: 800 }}>Phone</h4>
                  <a href="tel:+256788227027" style={{ fontSize: '0.95rem', color: '#1c1917', fontWeight: 600 }}>+256 788 227027</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Mail size={22} style={{ color: 'var(--color-gold-dark)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold-dark)', fontWeight: 800 }}>Email</h4>
                  <a href="mailto:daintystudsandchains@gmail.com" style={{ fontSize: '0.95rem', color: '#1c1917', fontWeight: 600 }}>daintystudsandchains@gmail.com</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Clock size={22} style={{ color: 'var(--color-gold-dark)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold-dark)', fontWeight: 800 }}>Store Hours</h4>
                  <p style={{ fontSize: '0.95rem', color: '#1c1917', fontWeight: 600 }}>Mon - Sun: 24 hrs</p>
                  <p style={{ fontSize: '0.85rem', color: '#44403c' }}>Sunday: open (Online Orders Active)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Channels Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid #eae6e1', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#1c1917', marginBottom: '1rem' }}>Instant Messenger</h2>
              <p style={{ fontSize: '0.85rem', color: '#44403c', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Chat with us directly in your browser. Our support team is online to answer questions immediately.
              </p>
              <button 
                onClick={handleOpenChat}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <MessageSquare size={16} /> Open In-App Chat
              </button>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #eae6e1', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#1c1917', marginBottom: '1rem' }}>Direct WhatsApp &amp; Hotline</h2>
              <p style={{ fontSize: '0.85rem', color: '#44403c', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                For faster catalog browsing, quick size checks, and instant ordering, reach out to our WhatsApp hotline.
              </p>
              <button 
                onClick={handleOpenWhatsApp}
                className="btn-whatsapp" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <MessageCircle size={16} /> Chat via WhatsApp (+256 788 227027)
              </button>
            </div>

            {/* Official Social Media Channels */}
            <div style={{ background: '#ffffff', border: '1px solid #eae6e1', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#1c1917', marginBottom: '0.8rem' }}>Official Social Media</h2>
              <p style={{ fontSize: '0.85rem', color: '#44403c', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Follow our official social pages for daily styling videos, piercing inspiration, and exclusive offers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <a
                  href="https://www.instagram.com/dainty_studs_and_chains?exln=MXc3cnI2ZDh1NGpzdw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    textDecoration: 'none',
                    background: '#faf6f0',
                    borderColor: '#b38728',
                    color: '#1c1917',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  Follow @dainty_studs_and_chains on Instagram
                </a>

                <a
                  href="https://www.tiktok.com/@daintystuds?_r=1&_t=ZS-9BChgZF8WY9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    textDecoration: 'none',
                    background: '#faf6f0',
                    borderColor: '#b38728',
                    color: '#1c1917',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                  Watch @daintystuds on TikTok
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Map Location Card */}
        <div style={{ width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eae6e1', marginTop: '4rem', position: 'relative' }}>
          <img 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&auto=format&fit=crop&q=80" 
            alt="Kampala Location" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.65) sepia(0.25) contrast(1.1)' }}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(28, 25, 23, 0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem', textAlign: 'center' }}>
            <MapPin size={36} style={{ color: 'var(--color-gold-primary)', marginBottom: '1rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem' }}>DAINTY Flagship Location</h3>
            <p style={{ color: 'var(--color-gold-light)', fontSize: '0.95rem', fontWeight: 600 }}>Goodwill zone, Kampala, Uganda</p>
            <p style={{ color: '#f3ece6', fontSize: '0.85rem', marginTop: '0.3rem' }}>Fast Courier Delivery Across Kampala &amp; Nationwide</p>
          </div>
        </div>
      </div>
    </div>
  );
}
